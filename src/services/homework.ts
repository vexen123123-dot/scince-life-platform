import { supabase } from '../lib/supabase';
import { MAX_UPLOAD_BYTES, validateFile } from '../lib/format';
import type { Assignment, AssignmentQuestion, Attachment, Feedback, Grade, Submission } from '../types/db';

export interface SubFile extends Attachment { submission_id: string }
export interface AnswerRow { question_id: string; answer: { text?: string; value?: string | boolean } }

export async function listMyAssignments(userId: string) {
  const [a, s, g] = await Promise.all([
    supabase.from('assignments').select('*').eq('status', 'published').order('due_at', { ascending: true, nullsFirst: false }),
    supabase.from('submissions').select('*').eq('student_id', userId),
    supabase.from('grades').select('*'),
  ]);
  if (a.error) throw a.error; if (s.error) throw s.error; if (g.error) throw g.error;
  return { assignments: (a.data ?? []) as Assignment[], submissions: (s.data ?? []) as Submission[], grades: (g.data ?? []) as Grade[] };
}

export async function loadAssignmentForStudent(id: string, userId: string) {
  const [a, q, att, sub] = await Promise.all([
    supabase.from('assignments').select('*').eq('id', id).maybeSingle(),
    supabase.from('assignment_questions').select('*').eq('assignment_id', id).order('position'),
    supabase.from('assignment_attachments').select('*').eq('assignment_id', id),
    supabase.from('submissions').select('*').eq('assignment_id', id).eq('student_id', userId).maybeSingle(),
  ]);
  for (const r of [a, q, att, sub]) if (r.error) throw r.error;
  const submission = sub.data as Submission | null;
  let answers: AnswerRow[] = [], files: SubFile[] = [], grade: Grade | null = null, feedback: Feedback[] = [];
  if (submission) {
    const [ans, fl, gr, fb] = await Promise.all([
      supabase.from('submission_answers').select('question_id, answer').eq('submission_id', submission.id),
      supabase.from('submission_files').select('*').eq('submission_id', submission.id).order('created_at'),
      supabase.from('grades').select('*').eq('submission_id', submission.id).maybeSingle(),
      supabase.from('feedback').select('*').eq('submission_id', submission.id).order('created_at'),
    ]);
    for (const r of [ans, fl, gr, fb]) if (r.error) throw r.error;
    answers = (ans.data ?? []) as AnswerRow[]; files = (fl.data ?? []) as SubFile[];
    grade = gr.data as Grade | null; feedback = (fb.data ?? []) as Feedback[];
  }
  return {
    assignment: a.data as Assignment | null, questions: (q.data ?? []) as AssignmentQuestion[],
    attachments: (att.data ?? []) as Attachment[], submission, answers, files, grade, feedback,
  };
}

export async function ensureSubmission(assignmentId: string, userId: string): Promise<Submission> {
  const { data: ex } = await supabase.from('submissions').select('*').eq('assignment_id', assignmentId).eq('student_id', userId).maybeSingle();
  if (ex) return ex as Submission;
  const { data, error } = await supabase.from('submissions').insert({ assignment_id: assignmentId, student_id: userId }).select().single();
  if (error) throw error;
  return data as Submission;
}

export async function saveAnswers(submissionId: string, answers: Record<string, AnswerRow['answer']>) {
  const rows = Object.entries(answers).map(([question_id, answer]) => ({ submission_id: submissionId, question_id, answer }));
  if (!rows.length) return;
  const { error } = await supabase.from('submission_answers').upsert(rows, { onConflict: 'submission_id,question_id' });
  if (error) throw error;
}

export async function uploadSubmissionFile(userId: string, assignmentId: string, submissionId: string, file: File): Promise<SubFile> {
  const bad = validateFile(file); if (bad) throw new Error(bad);
  const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
  const path = `submissions/${userId}/${assignmentId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from('homework-files').upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw up.error;
  const { data, error } = await supabase.from('submission_files')
    .insert({ submission_id: submissionId, storage_path: path, file_name: file.name.slice(0, 200), mime_type: file.type, size_bytes: Math.min(file.size, MAX_UPLOAD_BYTES) })
    .select().single();
  if (error) { await supabase.storage.from('homework-files').remove([path]); throw error; }
  return data as SubFile;
}

export async function deleteSubmissionFile(f: SubFile) {
  const { error } = await supabase.from('submission_files').delete().eq('id', f.id);
  if (error) throw error;
  await supabase.storage.from('homework-files').remove([f.storage_path]);
}

export async function submitSubmission(submissionId: string) {
  const { error } = await supabase.from('submissions').update({ status: 'submitted' }).eq('id', submissionId);
  if (error) throw error;
}

/** رابط موقّع قصير العمر للملفات الخاصة */
export async function signedUrl(path: string, seconds = 300): Promise<string> {
  const { data, error } = await supabase.storage.from('homework-files').createSignedUrl(path, seconds);
  if (error || !data) throw error ?? new Error('تعذّر إنشاء الرابط');
  return data.signedUrl;
}
