-- =====================================================================
-- منصة العلوم والحياة — المخطط الأساسي
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------- الأنواع ----------
do $$ begin
  create type public.user_role as enum ('student', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assignment_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.submission_status as enum ('draft', 'submitted', 'returned', 'graded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.question_kind as enum (
    'mcq', 'true_false', 'fill_blank', 'matching', 'definition',
    'explain_why', 'short_answer', 'classification', 'equation', 'compare'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assignment_question_kind as enum ('mcq', 'true_false', 'short', 'essay');
exception when duplicate_object then null; end $$;

-- ---------- دالة تحديث الوقت ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'student',
  group_name text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_group_idx on public.profiles(group_name);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- المنهج ----------
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  description text not null default '',
  position int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger units_updated before update on public.units
  for each row execute function public.set_updated_at();

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  summary text not null default '',
  position int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lessons_unit_idx on public.lessons(unit_id, position);
create trigger lessons_updated before update on public.lessons
  for each row execute function public.set_updated_at();

-- كل قسم يحوي مصفوفة "كتل" (نص، جدول، تعريف، تجربة، معادلة ...)
create table if not exists public.lesson_sections (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  position int not null default 0,
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, slug)
);
create index if not exists lesson_sections_lesson_idx on public.lesson_sections(lesson_id, position);
create trigger lesson_sections_updated before update on public.lesson_sections
  for each row execute function public.set_updated_at();

-- تتبّع إكمال الدرس (قسم بقسم)
create table if not exists public.lesson_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_sections text[] not null default '{}',
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create trigger lesson_progress_updated before update on public.lesson_progress
  for each row execute function public.set_updated_at();

-- ---------- الواجبات ----------
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 200),
  instructions text not null default '',
  lesson_id uuid references public.lessons(id) on delete set null,
  due_at timestamptz,
  status public.assignment_status not null default 'draft',
  allow_resubmit boolean not null default false,
  max_score numeric(6,2) not null default 10 check (max_score > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assignments_status_idx on public.assignments(status, due_at);
create trigger assignments_updated before update on public.assignments
  for each row execute function public.set_updated_at();

create table if not exists public.assignment_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  position int not null default 0,
  kind public.assignment_question_kind not null default 'short',
  prompt text not null,
  options jsonb,
  points numeric(6,2) not null default 1 check (points >= 0),
  created_at timestamptz not null default now()
);
create index if not exists assignment_questions_idx on public.assignment_questions(assignment_id, position);

-- لمن يُسند الواجب: طالب محدد أو مجموعة، وإن لم يوجد أي هدف فالواجب لكل الطلاب
create table if not exists public.assignment_targets (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  group_name text,
  created_at timestamptz not null default now(),
  check ((student_id is not null)::int + (group_name is not null)::int = 1)
);
create unique index if not exists assignment_targets_student_uq
  on public.assignment_targets(assignment_id, student_id) where student_id is not null;
create unique index if not exists assignment_targets_group_uq
  on public.assignment_targets(assignment_id, group_name) where group_name is not null;

-- مرفقات المعلم على الواجب (مسارات داخل التخزين الخاص)
create table if not exists public.assignment_attachments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);

-- ---------- التسليمات ----------
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status public.submission_status not null default 'draft',
  attempt int not null default 1,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);
create index if not exists submissions_student_idx on public.submissions(student_id, status);
create index if not exists submissions_assignment_idx on public.submissions(assignment_id, status);
create trigger submissions_updated before update on public.submissions
  for each row execute function public.set_updated_at();

create table if not exists public.submission_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  question_id uuid not null references public.assignment_questions(id) on delete cascade,
  answer jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (submission_id, question_id)
);
create trigger submission_answers_updated before update on public.submission_answers
  for each row execute function public.set_updated_at();

create table if not exists public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);
create index if not exists submission_files_idx on public.submission_files(submission_id);

-- سجلّ التسليمات السابقة (عند إعادة التسليم)
create table if not exists public.submission_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  event text not null,
  status public.submission_status not null,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists submission_history_idx on public.submission_history(submission_id, created_at);

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  score numeric(6,2) not null check (score >= 0),
  graded_by uuid references public.profiles(id) on delete set null,
  graded_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists feedback_submission_idx on public.feedback(submission_id, created_at);

-- ---------- الاختبارات ----------
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  description text not null default '',
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger quizzes_updated before update on public.quizzes
  for each row execute function public.set_updated_at();

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  position int not null default 0,
  kind public.question_kind not null,
  prompt text not null,
  options jsonb,
  answer_key jsonb not null,        -- محجوب عن الطلاب بصلاحيات الأعمدة
  explanation text not null default '',
  points numeric(6,2) not null default 1 check (points > 0),
  created_at timestamptz not null default now()
);
create index if not exists quiz_questions_idx on public.quiz_questions(quiz_id, position);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  question_ids uuid[] not null default '{}',
  is_retry boolean not null default false,
  score numeric(7,2) not null default 0,
  max_score numeric(7,2) not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists quiz_attempts_student_idx on public.quiz_attempts(student_id, started_at desc);
create index if not exists quiz_attempts_quiz_idx on public.quiz_attempts(quiz_id);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  answer jsonb not null,
  is_correct boolean not null,
  awarded numeric(6,2) not null default 0,
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- ---------- الإعدادات وسجلّ التدقيق ----------
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
