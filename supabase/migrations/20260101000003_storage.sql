-- =====================================================================
-- التخزين الخاص لملفات الواجبات
-- المسارات:
--   submissions/{student_id}/{assignment_id}/{file}   ← ملفات الطلاب
--   assignments/{assignment_id}/{file}                ← مرفقات المعلم
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homework-files', 'homework-files', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf', 'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_assignment_id(p_name text)
returns uuid language sql immutable as $$
  select case when split_part(p_name, '/', 2) ~ '^[0-9a-fA-F-]{36}$'
              then split_part(p_name, '/', 2)::uuid end;
$$;

-- عرض/تنزيل (التوقيع بالروابط الموقّعة يمرّ عبر سياسة select)
create policy "homework select" on storage.objects for select to authenticated
using (
  bucket_id = 'homework-files' and (
    public.is_admin()
    or (split_part(name, '/', 1) = 'submissions' and split_part(name, '/', 2) = auth.uid()::text)
    or (split_part(name, '/', 1) = 'assignments'
        and public.can_view_assignment(public.storage_assignment_id(name)))
  )
);

-- رفع: الطالب في مجلده فقط، والمعلم في مجلد مرفقات الواجبات
create policy "homework insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'homework-files' and (
    (split_part(name, '/', 1) = 'submissions' and split_part(name, '/', 2) = auth.uid()::text
       and public.can_view_assignment(public.storage_assignment_id(
             'x/' || split_part(name, '/', 3) || '/y')))
    or (split_part(name, '/', 1) = 'assignments' and public.is_admin())
  )
);

-- حذف: الطالب ملفاته، والمسؤول أي ملف
create policy "homework delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'homework-files' and (
    public.is_admin()
    or (split_part(name, '/', 1) = 'submissions' and split_part(name, '/', 2) = auth.uid()::text)
  )
);
-- لا سياسة update: لا يمكن الكتابة فوق الملفات؛ يُحذف ويُرفع من جديد
