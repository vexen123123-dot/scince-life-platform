-- =====================================================================
-- اختبارات الأمان (RLS) — تُشغَّل على مشروع تطوير/اختبار فقط (تنشئ مستخدمين مؤقتين ثم تتراجع عنهم).
-- التشغيل المحلي:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_tests.sql
-- تتم كل العمليات داخل معاملة تنتهي بـ ROLLBACK فلا يبقى أي أثر.
-- =====================================================================
begin;

create temp table test_results (n serial, name text, passed boolean);
grant all on test_results to public;
grant all on sequence test_results_n_seq to public;

create function pg_temp.ok(p_name text, p_cond boolean) returns void language sql as
$$ insert into test_results(name, passed) values (p_name, coalesce(p_cond, false)) $$;

-- يتقمّص مستخدماً مصادقاً أو يعود إلى الدور الأساسي
create function pg_temp.as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  if p_uid is null then execute 'set local role anon'; else execute 'set local role authenticated'; end if;
end $$;
create function pg_temp.as_root() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claim.sub', '', true); end $$;
grant execute on function pg_temp.ok(text, boolean), pg_temp.as_user(uuid), pg_temp.as_root() to public;

do $$
declare
  admin1 uuid := gen_random_uuid(); admin2 uuid := gen_random_uuid();
  stu_a uuid := gen_random_uuid();  stu_b uuid := gen_random_uuid(); sneaky uuid := gen_random_uuid();
  asg uuid; asg_b uuid; asg_draft uuid; sub_a uuid; sub_b uuid; qz uuid; qid uuid; att uuid; res jsonb;
  n int; failed boolean; q_open uuid; q_match uuid; q_class uuid; lesson uuid; cnt1 int; cnt2 int;
begin
  -- ===== التجهيز (بصلاحيات المالك) =====
  insert into auth.users(id, email) values (admin1, 'a1@test.invalid'), (admin2, 'a2@test.invalid'),
                                           (stu_a, 'sa@test.invalid'), (stu_b, 'sb@test.invalid');
  insert into auth.users(id, email, raw_user_meta_data) values (sneaky, 's3@test.invalid', '{"role":"admin","full_name":"مخادع"}');
  update public.profiles set role = 'admin', full_name = 'مسؤول 1' where id = admin1;
  update public.profiles set role = 'admin', full_name = 'مسؤول 2' where id = admin2;
  update public.profiles set full_name = 'سليمان' where id = stu_a;
  update public.profiles set full_name = 'طالب ب', group_name = 'شعبة ب' where id = stu_b;

  perform pg_temp.ok('01 التسجيل يُنشئ ملفاً بدور طالب ولو طلب المستخدم admin عبر البيانات الوصفية',
    (select role = 'student' from public.profiles where id = sneaky));

  -- ===== الطالب لا يرقّي نفسه =====
  perform pg_temp.as_user(stu_a); failed := false;
  begin update public.profiles set role = 'admin' where id = stu_a; exception when others then failed := true; end;
  perform pg_temp.ok('02 الطالب لا يستطيع تغيير دوره', failed);
  perform pg_temp.as_user(stu_a);
  update public.profiles set full_name = 'سليمان ق' where id = stu_a;
  perform pg_temp.ok('03 الطالب يعدّل اسمه', (select full_name = 'سليمان ق' from public.profiles where id = stu_a));
  failed := false;
  begin update public.profiles set group_name = 'x' where id = stu_a; exception when others then failed := true; end;
  perform pg_temp.ok('04 الطالب لا يغيّر مجموعته', failed);
  perform pg_temp.ok('05 الطالب يرى ملفه فقط', (select count(*) = 1 from public.profiles));
  perform pg_temp.as_root();
  -- يحاول إنشاء ملف مسؤول جديد
  perform pg_temp.as_user(stu_a); failed := false;
  begin insert into public.profiles(id, role) values (gen_random_uuid(), 'admin'); exception when others then failed := true; end;
  perform pg_temp.ok('06 لا يمكن إدراج ملف مسؤول من العميل', failed);

  -- ===== تساوي المسؤولَين =====
  perform pg_temp.as_user(admin1); select count(*) into cnt1 from public.profiles;
  perform pg_temp.as_user(admin2); select count(*) into cnt2 from public.profiles;
  perform pg_temp.ok('07 المسؤولان يريان الملفات نفسها (' || cnt1 || ')', cnt1 = cnt2 and cnt1 >= 5);

  -- ===== الواجبات =====
  perform pg_temp.as_user(stu_a); failed := false;
  begin insert into public.assignments(title, status) values ('خبيث', 'published'); exception when others then failed := true; end;
  perform pg_temp.ok('08 الطالب لا ينشئ واجباً', failed);

  perform pg_temp.as_user(admin1);
  insert into public.assignments(title, instructions, status, created_by, due_at) values ('واجب عام', 'حل الأسئلة', 'published', admin1, now() + interval '3 days') returning id into asg;
  insert into public.assignments(title, status, created_by) values ('مسودة', 'draft', admin1) returning id into asg_draft;
  insert into public.assignments(title, status, created_by) values ('لطالب ب فقط', 'published', admin1) returning id into asg_b;
  insert into public.assignment_targets(assignment_id, student_id) values (asg_b, stu_b);
  insert into public.assignment_questions(assignment_id, position, kind, prompt, points) values (asg, 1, 'short', 'ما وظيفة الكبد؟', 5);
  perform pg_temp.as_user(admin2);
  update public.assignments set title = 'واجب عام (محدّث)' where id = asg;
  perform pg_temp.ok('09 المسؤول الثاني يعدّل واجب الأول (صلاحيات متساوية)', (select title like '%محدّث%' from public.assignments where id = asg));

  perform pg_temp.as_user(stu_a);
  perform pg_temp.ok('10 الطالب يرى الواجب المنشور العام فقط', (select count(*) = 1 and bool_and(id = asg) from public.assignments));
  perform pg_temp.ok('11 الطالب لا يرى المسودة ولا واجب غيره', (select count(*) = 0 from public.assignments where id in (asg_draft, asg_b)));
  perform pg_temp.as_user(stu_b);
  perform pg_temp.ok('12 الطالب ب يرى واجبه المستهدف + العام', (select count(*) = 2 from public.assignments));

  -- ===== التسليم =====
  perform pg_temp.as_user(stu_a);
  insert into public.submissions(assignment_id, student_id, status) values (asg, stu_a, 'graded') returning id into sub_a;
  perform pg_temp.ok('13 الإدراج بحالة graded يُجبَر على draft', (select status = 'draft' from public.submissions where id = sub_a));
  failed := false;
  begin insert into public.submissions(assignment_id, student_id) values (asg_b, stu_a); exception when others then failed := true; end;
  perform pg_temp.ok('14 لا تسليم لواجب غير مُسند للطالب', failed);
  failed := false;
  begin insert into public.submissions(assignment_id, student_id) values (asg, stu_b); exception when others then failed := true; end;
  perform pg_temp.ok('15 لا تسليم باسم طالب آخر', failed);
  insert into public.submission_answers(submission_id, question_id, answer)
    select sub_a, id, '{"text":"ينتج الصفراء"}' from public.assignment_questions where assignment_id = asg;
  perform pg_temp.ok('16 حفظ مسودة الإجابات', (select count(*) = 1 from public.submission_answers where submission_id = sub_a));
  failed := false;
  begin update public.submissions set status = 'graded' where id = sub_a; exception when others then failed := true; end;
  perform pg_temp.ok('17 الطالب لا يضع حالة graded', failed);
  update public.submissions set status = 'submitted' where id = sub_a;
  perform pg_temp.ok('18 الطالب يسلّم الواجب', (select status = 'submitted' and submitted_at is not null from public.submissions where id = sub_a));
  failed := false;
  begin insert into public.submission_answers(submission_id, question_id, answer)
        select sub_a, gen_random_uuid(), '{}'; exception when others then failed := true; end;
  perform pg_temp.ok('19 لا تعديل على الإجابات بعد التسليم', failed);

  -- طالب آخر
  perform pg_temp.as_user(stu_b);
  perform pg_temp.ok('20 الطالب ب لا يرى تسليم الطالب أ', (select count(*) = 0 from public.submissions where id = sub_a));
  perform pg_temp.ok('21 الطالب ب لا يرى إجابات أ', (select count(*) = 0 from public.submission_answers));

  -- ===== التصحيح =====
  perform pg_temp.as_user(stu_a); failed := false;
  begin insert into public.grades(submission_id, score) values (sub_a, 10); exception when others then failed := true; end;
  perform pg_temp.ok('22 الطالب لا يضع درجة لنفسه', failed);
  perform pg_temp.as_user(admin2);
  insert into public.grades(submission_id, score, graded_by) values (sub_a, 8, admin2);
  update public.submissions set status = 'graded' where id = sub_a;
  insert into public.feedback(submission_id, author_id, body) values (sub_a, admin2, 'أحسنت');
  perform pg_temp.as_user(stu_a);
  perform pg_temp.ok('23 الطالب يرى درجته وملاحظاته', (select count(*) = 1 from public.grades where submission_id = sub_a)
                                                 and (select count(*) = 1 from public.feedback where submission_id = sub_a));
  failed := false;
  begin update public.grades set score = 100 where submission_id = sub_a; end;
  perform pg_temp.ok('24 تعديل الطالب للدرجة لا يؤثر (لا صفوف)', (select score = 8 from public.grades where submission_id = sub_a));
  failed := false;
  begin update public.submissions set status = 'submitted' where id = sub_a; exception when others then failed := true; end;
  begin update public.submissions set status = 'draft' where id = sub_a; exception when others then failed := failed and true; end;
  perform pg_temp.ok('25 لا إعادة تسليم بعد التصحيح إن لم يُسمح بها', failed and (select status = 'graded' from public.submissions where id = sub_a));
  perform pg_temp.as_user(admin1);
  update public.assignments set allow_resubmit = true where id = asg;
  perform pg_temp.as_user(stu_a);
  update public.submissions set status = 'draft' where id = sub_a;
  perform pg_temp.ok('26 فتح محاولة جديدة عند السماح يزيد رقم المحاولة', (select attempt = 2 and status = 'draft' from public.submissions where id = sub_a));
  update public.submissions set status = 'submitted' where id = sub_a;
  perform pg_temp.ok('26b إعادة التسليم بعد التعديل', (select status = 'submitted' from public.submissions where id = sub_a));
  perform pg_temp.ok('27 سجلّ التسليم يحفظ التحولات', (select count(*) >= 3 from public.submission_history where submission_id = sub_a));
  perform pg_temp.as_user(stu_b);
  perform pg_temp.ok('28 الطالب ب لا يرى درجات أ', (select count(*) = 0 from public.grades));

  -- ===== الاختبارات: إخفاء الإجابات =====
  perform pg_temp.as_root();
  select id into qz from public.quizzes where slug = 'digestive-quiz';
  perform pg_temp.as_user(stu_a); failed := false;
  begin perform answer_key from public.quiz_questions limit 1; exception when insufficient_privilege then failed := true; end;
  perform pg_temp.ok('29 الطالب لا يقرأ answer_key', failed);
  failed := false;
  begin perform explanation from public.quiz_questions limit 1; exception when insufficient_privilege then failed := true; end;
  perform pg_temp.ok('30 الطالب لا يقرأ الشرح قبل الإجابة', failed);
  failed := false;
  begin perform * from public.quiz_questions limit 1; exception when insufficient_privilege then failed := true; end;
  perform pg_temp.ok('31 select * مرفوض على الأسئلة', failed);
  perform pg_temp.ok('32 الطالب يقرأ نص الأسئلة وخياراتها', (select count(*) >= 30 from (select id, prompt, options from public.quiz_questions where quiz_id = qz) x));
  failed := false;
  begin insert into public.quiz_answers(attempt_id, question_id, answer, is_correct) values (gen_random_uuid(), gen_random_uuid(), '{}', true); exception when others then failed := true; end;
  perform pg_temp.ok('33 لا كتابة مباشرة في quiz_answers', failed);
  failed := false;
  begin update public.quiz_questions set points = 99; exception when others then failed := true; end;
  perform pg_temp.ok('34 الطالب لا يعدّل الأسئلة', failed or not exists (select 1 from public.quiz_questions where points = 99));

  select id into qid from public.quiz_questions where quiz_id = qz and kind = 'mcq' order by position limit 1;
  att := public.start_quiz_attempt(qz);
  res := public.answer_quiz_question(att, qid, '{"value": 2}'::jsonb);
  perform pg_temp.ok('35 تصحيح الخادم لسؤال اختيار من متعدد وكشف الإجابة بعد المحاولة',
    (res ->> 'is_correct')::boolean and res ? 'explanation' and res -> 'correct_answer' ->> 'value' = '2');
  failed := false;
  begin perform public.answer_quiz_question(att, qid, '{"value": 1}'::jsonb); exception when others then failed := true; end;
  perform pg_temp.ok('36 لا إعادة الإجابة على السؤال نفسه ضمن المحاولة', failed);
  select id into q_open from public.quiz_questions where quiz_id = qz and kind = 'explain_why' order by position limit 1;
  res := public.answer_quiz_question(att, q_open, '{"text":"لأن جدار المعدة مغطّى بطبقة مخاطيّة تحمي الجدار"}'::jsonb);
  perform pg_temp.ok('37 تصحيح الأسئلة المفتوحة بالكلمات المفتاحية (مع تطبيع التشكيل والهمزات)', (res ->> 'is_correct')::boolean);
  select id into q_match from public.quiz_questions where quiz_id = qz and kind = 'matching' order by position limit 1;
  -- إجابة المطابقة الصحيحة من المفتاح (بصلاحيات المالك) لاختبار الدالة
  perform pg_temp.as_root();
  perform pg_temp.ok('38 grade_answer للمطابقة: صحيح كاملاً',
    public.grade_answer('matching', (select answer_key from public.quiz_questions where id = q_match),
                        (select answer_key from public.quiz_questions where id = q_match)) = 1);
  perform pg_temp.ok('39 grade_answer للتصنيف: جزئي',
    public.grade_answer('classification', '{"map":{"0":0,"1":1}}', '{"map":{"0":0,"1":0}}') = 0.5);
  perform pg_temp.ok('40 grade_answer: معادلة مع بدائل إملائية',
    public.grade_answer('equation', '{"values":[["أميليز","اميليز"],["مالتوز"]]}', '{"values":["اميليز","مالتوز"]}') = 1);
  perform pg_temp.ok('41 grade_answer: إجابة فارغة = صفر',
    public.grade_answer('short_answer', '{"keywords":[["كبد"]],"min_matches":1}', '{"text":""}') = 0);
  perform pg_temp.as_user(stu_a);
  res := public.finish_quiz_attempt(att);
  perform pg_temp.ok('42 إنهاء المحاولة وحساب النتيجة', (res ->> 'max_score')::numeric > 0 and (res ->> 'score')::numeric >= 2);
  perform pg_temp.as_user(stu_b);
  perform pg_temp.ok('43 الطالب ب لا يرى محاولات أ', (select count(*) = 0 from public.quiz_attempts where student_id = stu_a));
  failed := false;
  begin perform public.answer_quiz_question(att, qid, '{"value":0}'::jsonb); exception when others then failed := true; end;
  perform pg_temp.ok('44 لا يجيب طالب على محاولة طالب آخر', failed);

  -- ===== دوال المسؤول وسجل التدقيق =====
  perform pg_temp.as_user(stu_a); failed := false;
  begin perform public.admin_dashboard_stats(); exception when others then failed := true; end;
  perform pg_temp.ok('45 الطالب لا يستدعي إحصاءات المسؤول', failed);
  failed := false;
  begin perform * from public.admin_quiz_questions(qz); exception when others then failed := true; end;
  perform pg_temp.ok('46 الطالب لا يقرأ الأسئلة بمفاتيحها', failed);
  perform pg_temp.ok('47 الطالب لا يرى سجلّ التدقيق', (select count(*) = 0 from public.audit_logs));
  perform pg_temp.ok('48 الطالب لا يرى الإعدادات غير العامة', (select count(*) = 0 from public.platform_settings where not is_public));
  perform pg_temp.as_user(admin1);
  perform pg_temp.ok('49 المسؤول 1 يقرأ إحصاءات اللوحة', (public.admin_dashboard_stats() ->> 'total_students')::int >= 3);
  perform pg_temp.as_user(admin2);
  perform pg_temp.ok('50 المسؤول 2 يقرأ الإحصاءات نفسها', (public.admin_dashboard_stats() ->> 'total_students')::int >= 3);
  perform pg_temp.ok('51 المسؤول يقرأ مفاتيح الأسئلة', (select count(*) >= 30 from public.admin_quiz_questions(qz)));
  perform pg_temp.ok('52 المسؤول يرى سجلّ التدقيق (درجة/واجب)', (select count(*) >= 3 from public.audit_logs where entity in ('grades', 'assignments')));
  perform pg_temp.ok('53 المسؤول يرى أداء الطلاب', (select count(*) >= 3 from public.admin_student_performance()));

  -- ===== الزائر (anon) =====
  perform pg_temp.as_user(null);
  perform pg_temp.ok('54 الزائر يقرأ الدروس المنشورة', (select count(*) = 2 from public.lessons));
  perform pg_temp.ok('55 الزائر لا يرى الملفات الشخصية', (select count(*) = 0 from public.profiles));
  perform pg_temp.ok('56 الزائر لا يرى الواجبات', (select count(*) = 0 from public.assignments));
  failed := false;
  begin perform public.start_quiz_attempt(qz); exception when others then failed := true; end;
  perform pg_temp.ok('57 الزائر لا يبدأ اختباراً', failed);

  -- ===== التخزين =====
  perform pg_temp.as_user(stu_a);
  insert into storage.objects(bucket_id, name, owner) values ('homework-files', 'submissions/' || stu_a || '/' || asg || '/page1.jpg', stu_a);
  perform pg_temp.ok('58 الطالب يرفع ملفاً في مجلده', true);
  failed := false;
  begin insert into storage.objects(bucket_id, name, owner) values ('homework-files', 'submissions/' || stu_b || '/' || asg || '/hack.jpg', stu_a); exception when others then failed := true; end;
  perform pg_temp.ok('59 الطالب لا يرفع في مجلد طالب آخر', failed);
  failed := false;
  begin insert into storage.objects(bucket_id, name, owner) values ('homework-files', 'assignments/' || asg || '/key.pdf', stu_a); exception when others then failed := true; end;
  perform pg_temp.ok('60 الطالب لا يرفع مرفقات المعلم', failed);
  failed := false;
  begin insert into storage.objects(bucket_id, name, owner) values ('homework-files', 'submissions/' || stu_a || '/' || asg_b || '/x.jpg', stu_a); exception when others then failed := true; end;
  perform pg_temp.ok('61 لا رفع لواجب غير مُسند للطالب', failed);
  perform pg_temp.as_user(stu_b);
  perform pg_temp.ok('62 الطالب ب لا يرى ملفات أ', (select count(*) = 0 from storage.objects));
  perform pg_temp.as_user(admin2);
  perform pg_temp.ok('63 المسؤول يرى ملف الطالب', (select count(*) = 1 from storage.objects where name like 'submissions/' || stu_a || '%'));
  insert into storage.objects(bucket_id, name, owner) values ('homework-files', 'assignments/' || asg || '/worksheet.pdf', admin2);
  perform pg_temp.as_user(stu_a);
  perform pg_temp.ok('64 الطالب يرى مرفق واجبه المنشور', (select count(*) = 1 from storage.objects where name like 'assignments/%'));
  perform pg_temp.as_user(stu_b);
  perform pg_temp.ok('65 الطالب ب يرى مرفق الواجب العام أيضاً (مُسند له)', (select count(*) = 1 from storage.objects where name like 'assignments/%'));
  perform pg_temp.as_root();
  perform pg_temp.ok('66 الحاوية خاصة وبحدّ 10MB', (select not public and file_size_limit = 10485760 from storage.buckets where id = 'homework-files'));
end $$;

select n, case when passed then 'PASS' else 'FAIL' end as result, name from test_results order by n;
select count(*) filter (where passed) as passed, count(*) filter (where not passed) as failed, count(*) as total from test_results;
rollback;
