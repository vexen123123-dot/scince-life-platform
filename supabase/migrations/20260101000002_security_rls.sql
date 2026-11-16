-- =====================================================================
-- الأمان: الدوال المساعدة، المشغّلات، سياسات RLS، دوال التصحيح
-- =====================================================================

-- ---------- دوال مساعدة (SECURITY DEFINER لتفادي تكرار RLS) ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.is_active
  );
$$;

create or replace function public.my_group()
returns text language sql stable security definer set search_path = public as $$
  select group_name from public.profiles where id = auth.uid();
$$;

-- هل ينطبق الواجب على الطالب؟ (لا أهداف = لكل الطلاب)
create or replace function public.assignment_applies(p_assignment uuid, p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    not exists (select 1 from public.assignment_targets t where t.assignment_id = p_assignment)
    or exists (
      select 1 from public.assignment_targets t
      left join public.profiles p on p.id = p_student
      where t.assignment_id = p_assignment
        and (t.student_id = p_student or (t.group_name is not null and t.group_name = p.group_name))
    );
$$;

create or replace function public.can_view_assignment(p_assignment uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or (
    auth.uid() is not null
    and exists (select 1 from public.assignments a where a.id = p_assignment and a.status = 'published')
    and public.assignment_applies(p_assignment, auth.uid())
  );
$$;

create or replace function public.owns_submission(p_submission uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.submissions s where s.id = p_submission and s.student_id = auth.uid());
$$;

create or replace function public.submission_editable(p_submission uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.submissions s
    where s.id = p_submission and s.student_id = auth.uid() and s.status in ('draft', 'returned')
  );
$$;

-- ---------- إنشاء الملف الشخصي تلقائياً: دائماً طالب ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), ''), 'student')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- منع تغيير الدور والصلاحيات من العميل ----------
create or replace function public.guard_profile_update()
returns trigger language plpgsql as $$
declare trusted boolean := current_user in ('postgres', 'supabase_admin', 'service_role');
begin
  if new.id <> old.id then raise exception 'لا يمكن تغيير المعرّف'; end if;
  if new.role is distinct from old.role and not trusted then
    raise exception 'تغيير الدور مسموح فقط عبر الدوال الخلفية الموثوقة';
  end if;
  if (new.is_active is distinct from old.is_active or new.group_name is distinct from old.group_name)
     and not trusted and not public.is_admin() then
    raise exception 'غير مصرّح بتغيير هذه الحقول';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.guard_profile_insert()
returns trigger language plpgsql as $$
begin
  if new.role = 'admin' and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'لا يمكن إنشاء مسؤول من العميل';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_ins on public.profiles;
create trigger profiles_guard_ins before insert on public.profiles
  for each row execute function public.guard_profile_insert();

-- ---------- حماية تحولات حالة التسليم ----------
-- ملاحظة: مشغّلا الحماية هنا SECURITY INVOKER عمداً؛ لأن current_user داخل دالة DEFINER
-- يكون مالك الدالة (postgres) فيُفسد فحص الدور الموثوق.
create or replace function public.guard_submission_update()
returns trigger language plpgsql set search_path = public as $$
declare allow_resub boolean;
begin
  if public.is_admin() or current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if new.assignment_id <> old.assignment_id or new.student_id <> old.student_id then
    raise exception 'لا يمكن تعديل هوية التسليم';
  end if;
  if new.status is distinct from old.status then
    select a.allow_resubmit into allow_resub from public.assignments a where a.id = old.assignment_id;
    if (old.status, new.status) in (('draft', 'submitted'), ('returned', 'submitted')) then
      new.submitted_at := now();
    elsif old.status = 'graded' and new.status = 'draft' and coalesce(allow_resub, false) then
      new.attempt := old.attempt + 1;          -- فتح محاولة جديدة للتعديل ثم إعادة التسليم
    elsif old.status = 'submitted' and new.status = 'draft' then
      null;                                    -- سحب التسليم قبل التصحيح
    else
      raise exception 'تحوّل الحالة غير مسموح (% → %)', old.status, new.status;
    end if;
  else
    new.attempt := old.attempt;
    new.submitted_at := old.submitted_at;
  end if;
  return new;
end $$;
drop trigger if exists submissions_guard on public.submissions;
create trigger submissions_guard before update on public.submissions
  for each row execute function public.guard_submission_update();

create or replace function public.guard_submission_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_admin() or current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  new.status := 'draft';
  new.attempt := 1;
  new.submitted_at := null;
  return new;
end $$;
drop trigger if exists submissions_guard_ins on public.submissions;
create trigger submissions_guard_ins before insert on public.submissions
  for each row execute function public.guard_submission_insert();

create or replace function public.log_submission_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.submission_history (submission_id, event, status, actor_id)
    values (new.id, case when tg_op = 'INSERT' then 'created' else 'status_changed' end, new.status, auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists submissions_history on public.submissions;
create trigger submissions_history after insert or update on public.submissions
  for each row execute function public.log_submission_history();

-- ---------- سجلّ التدقيق التلقائي ----------
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare rec jsonb; rid text;
begin
  rec := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  rid := coalesce(rec ->> 'id', rec ->> 'key', rec ->> 'submission_id');
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name, rid,
          case when tg_table_name = 'quiz_questions' then jsonb_build_object('quiz_id', rec ->> 'quiz_id')
               else rec - 'blocks' end);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['units','lessons','assignments','grades','quizzes','quiz_questions','platform_settings','announcements']
  loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.audit_row()', t);
  end loop;
end $$;

create or replace function public.audit_profile_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role or new.is_active is distinct from old.is_active
     or new.group_name is distinct from old.group_name then
    insert into public.audit_logs (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'update', 'profiles', new.id::text,
            jsonb_build_object('role', jsonb_build_array(old.role, new.role),
                               'is_active', jsonb_build_array(old.is_active, new.is_active),
                               'group_name', jsonb_build_array(old.group_name, new.group_name)));
  end if;
  return null;
end $$;
drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles after update on public.profiles
  for each row execute function public.audit_profile_changes();

-- ---------- تفعيل RLS على كل الجداول ----------
alter table public.profiles enable row level security;
alter table public.units enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_sections enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_questions enable row level security;
alter table public.assignment_targets enable row level security;
alter table public.assignment_attachments enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_answers enable row level security;
alter table public.submission_files enable row level security;
alter table public.submission_history enable row level security;
alter table public.grades enable row level security;
alter table public.feedback enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.platform_settings enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_logs enable row level security;

-- ---------- profiles ----------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- لا سياسات insert/delete: الإنشاء عبر المشغّل والحذف عبر الدوال الخلفية فقط

-- ---------- المنهج (قراءة للجميع للمنشور، كتابة للمسؤولين) ----------
create policy units_read on public.units for select to anon, authenticated
  using (is_published or public.is_admin());
create policy units_admin on public.units for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy lessons_read on public.lessons for select to anon, authenticated
  using (is_published or public.is_admin());
create policy lessons_admin on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy sections_read on public.lesson_sections for select to anon, authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.is_published) or public.is_admin());
create policy sections_admin on public.lesson_sections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy progress_own on public.lesson_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy progress_admin_read on public.lesson_progress for select to authenticated
  using (public.is_admin());

-- ---------- الواجبات ----------
create policy assignments_read on public.assignments for select to authenticated
  using (public.can_view_assignment(id));
create policy assignments_admin on public.assignments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy aq_read on public.assignment_questions for select to authenticated
  using (public.can_view_assignment(assignment_id));
create policy aq_admin on public.assignment_questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy at_admin on public.assignment_targets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy aa_read on public.assignment_attachments for select to authenticated
  using (public.can_view_assignment(assignment_id));
create policy aa_admin on public.assignment_attachments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- التسليمات ----------
create policy sub_select on public.submissions for select to authenticated
  using (student_id = auth.uid() or public.is_admin());
create policy sub_insert on public.submissions for insert to authenticated
  with check (student_id = auth.uid() and public.can_view_assignment(assignment_id));
create policy sub_update_own on public.submissions for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy sub_admin_write on public.submissions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy sa_select on public.submission_answers for select to authenticated
  using (public.owns_submission(submission_id) or public.is_admin());
create policy sa_write on public.submission_answers for insert to authenticated
  with check (public.submission_editable(submission_id));
create policy sa_update on public.submission_answers for update to authenticated
  using (public.submission_editable(submission_id)) with check (public.submission_editable(submission_id));
create policy sa_delete on public.submission_answers for delete to authenticated
  using (public.submission_editable(submission_id));

create policy sf_select on public.submission_files for select to authenticated
  using (public.owns_submission(submission_id) or public.is_admin());
create policy sf_insert on public.submission_files for insert to authenticated
  with check (public.submission_editable(submission_id)
              and storage_path like 'submissions/' || auth.uid()::text || '/%');
create policy sf_delete on public.submission_files for delete to authenticated
  using (public.submission_editable(submission_id));

create policy sh_select on public.submission_history for select to authenticated
  using (public.owns_submission(submission_id) or public.is_admin());

-- الدرجات: الطالب يقرأ درجته فقط؛ الكتابة للمسؤولين
create policy grades_select on public.grades for select to authenticated
  using (public.owns_submission(submission_id) or public.is_admin());
create policy grades_admin on public.grades for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy feedback_select on public.feedback for select to authenticated
  using (public.owns_submission(submission_id) or public.is_admin());
create policy feedback_admin on public.feedback for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- الاختبارات ----------
create policy quizzes_read on public.quizzes for select to anon, authenticated
  using (is_published or public.is_admin());
create policy quizzes_admin on public.quizzes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy qq_read on public.quiz_questions for select to authenticated
  using (exists (select 1 from public.quizzes q where q.id = quiz_id and q.is_published) or public.is_admin());
create policy qq_admin on public.quiz_questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- إخفاء مفتاح الإجابة والشرح عن العميل (يُقرأ فقط عبر الدوال المحمية)
revoke all on public.quiz_questions from anon, authenticated;
grant select (id, quiz_id, position, kind, prompt, options, points, created_at)
  on public.quiz_questions to authenticated;
grant insert, update, delete on public.quiz_questions to authenticated;

create policy qa_select on public.quiz_attempts for select to authenticated
  using (student_id = auth.uid() or public.is_admin());
create policy qans_select on public.quiz_answers for select to authenticated
  using (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.student_id = auth.uid())
         or public.is_admin());
-- لا سياسات كتابة على المحاولات والإجابات: تتم عبر دوال RPC فقط

-- ---------- الإعدادات والإعلانات والتدقيق ----------
create policy settings_read on public.platform_settings for select to anon, authenticated
  using (is_public or public.is_admin());
create policy settings_admin on public.platform_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy ann_read on public.announcements for select to anon, authenticated
  using (is_published or public.is_admin());
create policy ann_admin on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy audit_read on public.audit_logs for select to authenticated
  using (public.is_admin());

-- =====================================================================
-- تصحيح الإجابات على الخادم
-- =====================================================================
create or replace function public.norm_ar(t text)
returns text language sql immutable as $$
  select btrim(regexp_replace(
    regexp_replace(
      translate(
        regexp_replace(lower(coalesce(t, '')), '[ً-ٰٟـ]', '', 'g'),
        'أإآىةؤئ', 'ااايهوي'),
      '[.,،؟?!:؛;"()]', ' ', 'g'),
    '\s+', ' ', 'g'));
$$;

-- يُرجع نسبة صحة الإجابة بين 0 و 1
create or replace function public.grade_answer(p_kind public.question_kind, p_key jsonb, p_answer jsonb)
returns numeric language plpgsql immutable as $$
declare
  total int; hits int := 0; i int; alt jsonb; ans text; need int; pair jsonb; k text;
  grp jsonb; txt text;
begin
  if p_answer is null then return 0; end if;

  if p_kind in ('mcq', 'true_false') then
    return case when (p_answer ->> 'value') is not null and (p_answer ->> 'value') = (p_key ->> 'value') then 1 else 0 end;

  elsif p_kind in ('fill_blank', 'equation') then
    total := jsonb_array_length(p_key -> 'values');
    if total = 0 then return 0; end if;
    for i in 0 .. total - 1 loop
      ans := public.norm_ar(p_answer -> 'values' ->> i);
      if ans = '' then continue; end if;
      for alt in select * from jsonb_array_elements(p_key -> 'values' -> i) loop
        if ans = public.norm_ar(alt #>> '{}') then hits := hits + 1; exit; end if;
      end loop;
    end loop;
    return hits::numeric / total;

  elsif p_kind = 'matching' then
    total := jsonb_array_length(p_key -> 'pairs');
    if total = 0 then return 0; end if;
    for pair in select * from jsonb_array_elements(p_key -> 'pairs') loop
      if coalesce(p_answer -> 'pairs', '[]'::jsonb) @> jsonb_build_array(pair) then hits := hits + 1; end if;
    end loop;
    return hits::numeric / total;

  elsif p_kind = 'classification' then
    select count(*) into total from jsonb_object_keys(p_key -> 'map');
    if total = 0 then return 0; end if;
    for k in select * from jsonb_object_keys(p_key -> 'map') loop
      if (p_answer -> 'map' ->> k) is not null and (p_answer -> 'map' ->> k) = (p_key -> 'map' ->> k) then
        hits := hits + 1;
      end if;
    end loop;
    return hits::numeric / total;

  else -- أسئلة مفتوحة: تصحيح بالكلمات المفتاحية
    txt := public.norm_ar(p_answer ->> 'text');
    if txt = '' then return 0; end if;
    total := jsonb_array_length(p_key -> 'keywords');
    if total = 0 then return 0; end if;
    need := coalesce((p_key ->> 'min_matches')::int, total);
    if need < 1 then need := 1; end if;
    for grp in select * from jsonb_array_elements(p_key -> 'keywords') loop
      for alt in select * from jsonb_array_elements(grp) loop
        if position(public.norm_ar(alt #>> '{}') in txt) > 0 then hits := hits + 1; exit; end if;
      end loop;
    end loop;
    return least(1, hits::numeric / need);
  end if;
end $$;

create or replace function public.start_quiz_attempt(p_quiz_id uuid, p_question_ids uuid[] default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare qids uuid[]; maxs numeric; new_id uuid; retry boolean := p_question_ids is not null;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  if not exists (select 1 from public.quizzes q where q.id = p_quiz_id and (q.is_published or public.is_admin())) then
    raise exception 'الاختبار غير متاح';
  end if;
  select array_agg(id order by position), coalesce(sum(points), 0) into qids, maxs
  from public.quiz_questions
  where quiz_id = p_quiz_id and (p_question_ids is null or id = any (p_question_ids));
  if qids is null then raise exception 'لا توجد أسئلة'; end if;
  insert into public.quiz_attempts (quiz_id, student_id, question_ids, is_retry, max_score)
  values (p_quiz_id, auth.uid(), qids, retry, maxs) returning id into new_id;
  return new_id;
end $$;

create or replace function public.answer_quiz_question(p_attempt_id uuid, p_question_id uuid, p_answer jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare att public.quiz_attempts; q public.quiz_questions; frac numeric; pts numeric; correct boolean;
begin
  select * into att from public.quiz_attempts where id = p_attempt_id and student_id = auth.uid();
  if not found then raise exception 'المحاولة غير موجودة'; end if;
  if att.completed_at is not null then raise exception 'المحاولة منتهية'; end if;
  if not (p_question_id = any (att.question_ids)) then raise exception 'السؤال ليس ضمن المحاولة'; end if;
  if exists (select 1 from public.quiz_answers where attempt_id = p_attempt_id and question_id = p_question_id) then
    raise exception 'تمت الإجابة على هذا السؤال مسبقاً';
  end if;
  select * into q from public.quiz_questions where id = p_question_id;
  frac := public.grade_answer(q.kind, q.answer_key, p_answer);
  pts := round(q.points * frac, 2);
  correct := frac >= 0.999;
  insert into public.quiz_answers (attempt_id, question_id, answer, is_correct, awarded)
  values (p_attempt_id, p_question_id, p_answer, correct, pts);
  update public.quiz_attempts set score = score + pts where id = p_attempt_id;
  return jsonb_build_object(
    'is_correct', correct, 'awarded', pts, 'points', q.points, 'fraction', frac,
    'explanation', q.explanation, 'correct_answer', q.answer_key);
end $$;

create or replace function public.finish_quiz_attempt(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare att public.quiz_attempts;
begin
  update public.quiz_attempts set completed_at = coalesce(completed_at, now())
  where id = p_attempt_id and student_id = auth.uid() returning * into att;
  if not found then raise exception 'المحاولة غير موجودة'; end if;
  return jsonb_build_object('score', att.score, 'max_score', att.max_score,
    'percent', case when att.max_score = 0 then 0 else round(att.score / att.max_score * 100, 1) end);
end $$;

-- قراءة الأسئلة كاملة (بمفتاح الإجابة) للمسؤولين فقط
create or replace function public.admin_quiz_questions(p_quiz_id uuid)
returns setof public.quiz_questions language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'غير مصرّح'; end if;
  return query select * from public.quiz_questions where quiz_id = p_quiz_id order by position;
end $$;

-- إحصاءات لوحة المسؤول
create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'غير مصرّح'; end if;
  select jsonb_build_object(
    'total_students', (select count(*) from public.profiles where role = 'student'),
    'active_students', (select count(distinct sid) from (
        select student_id sid from public.quiz_attempts where started_at > now() - interval '14 days'
        union select student_id from public.submissions where updated_at > now() - interval '14 days'
        union select user_id from public.lesson_progress where updated_at > now() - interval '14 days') x),
    'total_assignments', (select count(*) from public.assignments),
    'published_assignments', (select count(*) from public.assignments where status = 'published'),
    'submitted', (select count(*) from public.submissions where status in ('submitted', 'graded', 'returned')),
    'pending_grading', (select count(*) from public.submissions where status = 'submitted'),
    'missing', (select count(*) from public.assignments a
                join public.profiles p on p.role = 'student' and p.is_active
                where a.status = 'published' and a.due_at is not null and a.due_at < now()
                  and public.assignment_applies(a.id, p.id)
                  and not exists (select 1 from public.submissions s
                                  where s.assignment_id = a.id and s.student_id = p.id
                                    and s.status in ('submitted', 'graded', 'returned'))),
    'avg_grade_percent', (select round(avg(g.score / a.max_score * 100), 1) from public.grades g
                          join public.submissions s on s.id = g.submission_id
                          join public.assignments a on a.id = s.assignment_id),
    'quiz_attempts', (select count(*) from public.quiz_attempts where completed_at is not null),
    'avg_quiz_percent', (select round(avg(score / nullif(max_score, 0) * 100), 1)
                         from public.quiz_attempts where completed_at is not null)
  ) into r;
  return r;
end $$;

-- أداء كل طالب (للمخططات والجداول)
create or replace function public.admin_student_performance()
returns table (student_id uuid, full_name text, group_name text, is_active boolean,
               lessons_done bigint, quiz_attempts bigint, avg_quiz numeric,
               submitted bigint, avg_grade numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'غير مصرّح'; end if;
  return query
  select p.id, p.full_name, p.group_name, p.is_active,
    (select count(*) from public.lesson_progress lp where lp.user_id = p.id and lp.completed_at is not null),
    (select count(*) from public.quiz_attempts qa where qa.student_id = p.id and qa.completed_at is not null),
    (select round(avg(qa.score / nullif(qa.max_score, 0) * 100), 1) from public.quiz_attempts qa
       where qa.student_id = p.id and qa.completed_at is not null),
    (select count(*) from public.submissions s where s.student_id = p.id and s.status in ('submitted', 'graded', 'returned')),
    (select round(avg(g.score / a.max_score * 100), 1) from public.grades g
       join public.submissions s on s.id = g.submission_id
       join public.assignments a on a.id = s.assignment_id where s.student_id = p.id)
  from public.profiles p where p.role = 'student' order by p.full_name;
end $$;

revoke execute on function public.admin_quiz_questions(uuid) from anon;
revoke execute on function public.admin_dashboard_stats() from anon;
revoke execute on function public.admin_student_performance() from anon;
revoke execute on function public.start_quiz_attempt(uuid, uuid[]) from anon;
revoke execute on function public.answer_quiz_question(uuid, uuid, jsonb) from anon;
revoke execute on function public.finish_quiz_attempt(uuid) from anon;
