```ts
import { supabase } from '../lib/supabase';
import type { Assignment, AssignmentQuestion, Attachment, AuditLog, Profile, Submission } from '../types/db';

async function invoke<T>(fn: string, body: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    // نقرأ رسالة الخطأ من جسم الاستجابة إن وُجدت
    let msg = error.message;
    try { const ctx = (error as { context?: Response }).context; if (ctx) { const j = await ctx.json(); msg = j.message ?? j.error ?? msg; } } catch { /* ignore */ }
    throw new Error(msg);
  }
  return data as T;
}

export const stats = async () => { const { data, error } = await supabase.rpc('admin_dashboard_stats'); if (error) throw error; return data as Record<string, number | null>; };
export interface Perf { student_id: string; full_name: string; group_name: string | null; is_active: boolean; lessons_done: number; quiz_attempts: number; avg_quiz: number | null; submitted: number; avg_grade: number | null }
export const performance = async () => { const { data, error } = await supabase.rpc('admin_student_performance'); if (error) throw error; return (data ?? []) as Perf[]; };

export const listStudents = async () => {
  const { data, error } = await supabase.from('profiles').select('*').eq('role', 'student').order('full_name');
  if (error) throw error; return (data ?? []) as Profile[];
};
export const createStudent = (b: { email: string; password: string; full_name: string; group_name?: string }) => invoke('admin-create-student', { action: 'create', ...b });
export const updateStudent = (user_id: string, patch: { full_name?: string; group_name?: string | null; is_active?: boolean }) => invoke('admin-create-student', { action: 'update', user_id, ...patch });
export const resetStudentPassword = (user_id: string, password: string) => invoke('admin-create-student', { action: 'reset_password', user_id, password });

export const gradeSubmission = (submission_id: string, score: number, feedback?: string) => invoke('grade-submission', { action: 'grade', submission_id, score, feedback });
export const returnSubmission = (submission_id: string, feedback: string) => invoke('grade-submission', { action: 'return', submission_id, feedback });

export const listAssignments = async () => {
  const { data, error } = await supabase.from('assignments').select('*').order('created_at', { ascending: false });
  if (error) throw error; return (data ?? []) as Assignment[];
};
export const loadAssignmentFull = async (id: string) => {
  const [a, q, t, att] = await Promise.all([
    supabase.from('assignments').select('*').eq('id', id).single(),
    supabase.from('assignment_questions').select('*').eq('assignment_id', id).order('position'),
    supabase.from('assignment_targets').select('*').eq('assignment_id', id),
    supabase.from('assignment_attachments').select('*').eq('assignment_id', id),
  ]);
  for (const r of [a, q, t, att]) if (r.error) throw r.error;
  return { assignment: a.data as Assignment, questions: q.data as AssignmentQuestion[], targets: t.data as { id: string; student_id: string | null; group_name: string | null }[], attachments: att.data as Attachment[] };
};
export interface AssignmentDraft {
  title: string; instructions: string; due_at: string | null; allow_resubmit: boolean; max_score: number; status: 'draft' | 'published'; lesson_id: string | null;
}
export interface QDraft { kind: AssignmentQuestion['kind']; prompt: string; options: string[] | null; points: number }
export interface TargetDraft { student_id?: string; group_name?: string }

/** يحفظ الواجب وأسئلته وأهدافه (يستبدل الأسئلة والأهداف بالقائمة الحالية) */
export async function saveAssignment(id: string | null, a: AssignmentDraft, questions: QDraft[], targets: TargetDraft[], userId: string): Promise<string> {
  let aid = id;
  if (aid) {
    const { error } = await supabase.from('assignments').update(a).eq('id', aid); if (error) throw error;
    await supabase.from('assignment_questions').delete().eq('assignment_id', aid);
    await supabase.from('assignment_targets').delete().eq('assignment_id', aid);
  } else {
    const { data, error } = await supabase.from('assignments').insert({ ...a, created_by: userId }).select('id').single();
    if (error) throw error; aid = data.id as string;
  }
  if (questions.length) {
    const { error } = await supabase.from('assignment_questions').insert(questions.map((q, i) => ({ ...q, assignment_id: aid, position: i + 1 })));
    if (error) throw error;
  }
  if (targets.length) {
    const { error } = await supabase.from('assignment_targets').insert(targets.map((t) => ({ ...t, assignment_id: aid })));
    if (error) throw error;
  }
  return aid!;
}
export const deleteAssignment = async (id: string) => {
  const { data: files } = await supabase.from('assignment_attachments').select('storage_path').eq('assignment_id', id);
  const { error } = await supabase.from('assignments').delete().eq('id', id); if (error) throw error;
  if (files?.length) await supabase.storage.from('homework-files').remove(files.map((f) => f.storage_path));
};
export const setAssignmentStatus = async (id: string, status: 'draft' | 'published') => {
  const { error } = await supabase.from('assignments').update({ status }).eq('id', id); if (error) throw error;
};
export async function addAttachment(assignmentId: string, file: File) {
  const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
  const path = `assignments/${assignmentId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from('homework-files').upload(path, file, { contentType: file.type }); if (up.error) throw up.error;
  const { error } = await supabase.from('assignment_attachments').insert({ assignment_id: assignmentId, storage_path: path, file_name: file.name.slice(0, 200), mime_type: file.type, size_bytes: file.size });
  if (error) { await supabase.storage.from('homework-files').remove([path]); throw error; }
}
export async function removeAttachment(a: Attachment) {
  const { error } = await supabase.from('assignment_attachments').delete().eq('id', a.id); if (error) throw error;
  await supabase.storage.from('homework-files').remove([a.storage_path]);
}

export async function loadSubmissionsOverview(assignmentId: string) {
  const [subs, students, targets] = await Promise.all([
    supabase.from('submissions').select('*').eq('assignment_id', assignmentId),
    supabase.from('profiles').select('id, full_name, group_name, is_active').eq('role', 'student'),
    supabase.from('assignment_targets').select('student_id, group_name').eq('assignment_id', assignmentId),
  ]);
  for (const r of [subs, students, targets]) if (r.error) throw r.error;
  const grades = await supabase.from('grades').select('*').in('submission_id', (subs.data ?? []).map((s) => s.id));
  const all = (students.data ?? []) as Pick<Profile, 'id' | 'full_name' | 'group_name' | 'is_active'>[];
  const t = targets.data ?? [];
  const applicable = t.length === 0 ? all : all.filter((s) => t.some((x) => x.student_id === s.id || (x.group_name && x.group_name === s.group_name)));
  return { students: applicable, submissions: (subs.data ?? []) as Submission[], grades: (grades.data ?? []) as { submission_id: string; score: number }[] };
}
export async function loadSubmissionDetail(submissionId: string) {
  const [ans, files, fb, hist, gr] = await Promise.all([
    supabase.from('submission_answers').select('question_id, answer').eq('submission_id', submissionId),
    supabase.from('submission_files').select('*').eq('submission_id', submissionId),
    supabase.from('feedback').select('*').eq('submission_id', submissionId).order('created_at'),
    supabase.from('submission_history').select('*').eq('submission_id', submissionId).order('created_at'),
    supabase.from('grades').select('*').eq('submission_id', submissionId).maybeSingle(),
  ]);
  for (const r of [ans, files, fb, hist, gr]) if (r.error) throw r.error;
  return { answers: ans.data ?? [], files: (files.data ?? []) as Attachment[], feedback: fb.data ?? [], history: hist.data ?? [], grade: gr.data };
}

export const listAudit = async (limit = 300) => {
  const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error; return (data ?? []) as AuditLog[];
};
export const quizStats = async () => {
  const [q, a] = await Promise.all([
    supabase.from('quizzes').select('id, slug, title, is_published, lesson_id'),
    supabase.from('quiz_attempts').select('quiz_id, score, max_score, completed_at').not('completed_at', 'is', null),
  ]);
  if (q.error) throw q.error; if (a.error) throw a.error; return { quizzes: q.data ?? [], attempts: a.data ?? [] };
};
```
