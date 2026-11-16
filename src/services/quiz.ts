import { supabase } from '../lib/supabase';
import type { Quiz, QuizAttempt, QuizQuestion } from '../types/db';

export interface AnswerResult { is_correct: boolean; awarded: number; points: number; fraction: number; explanation: string; correct_answer: Record<string, unknown> }
export interface FinishResult { score: number; max_score: number; percent: number }

export async function listQuizzes(): Promise<Quiz[]> {
  const { data, error } = await supabase.from('quizzes').select('id, lesson_id, slug, title, description, is_published').eq('is_published', true).order('created_at');
  if (error) throw error;
  return (data ?? []) as Quiz[];
}
export async function getQuiz(slug: string): Promise<Quiz | null> {
  const { data, error } = await supabase.from('quizzes').select('id, lesson_id, slug, title, description, is_published').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data as Quiz | null;
}
// يُحدَّد الأعمدة صراحةً: answer_key و explanation محجوبان عن الطالب بصلاحيات الأعمدة
export async function getQuestions(quizId: string, ids?: string[]): Promise<QuizQuestion[]> {
  let q = supabase.from('quiz_questions').select('id, quiz_id, position, kind, prompt, options, points').eq('quiz_id', quizId).order('position');
  if (ids) q = q.in('id', ids);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as QuizQuestion[];
}
export async function startAttempt(quizId: string, ids?: string[]): Promise<string> {
  const { data, error } = await supabase.rpc('start_quiz_attempt', { p_quiz_id: quizId, p_question_ids: ids ?? null });
  if (error) throw error;
  return data as string;
}
export async function answerQuestion(attemptId: string, questionId: string, answer: unknown): Promise<AnswerResult> {
  const { data, error } = await supabase.rpc('answer_quiz_question', { p_attempt_id: attemptId, p_question_id: questionId, p_answer: answer });
  if (error) throw error;
  return data as AnswerResult;
}
export async function finishAttempt(attemptId: string): Promise<FinishResult> {
  const { data, error } = await supabase.rpc('finish_quiz_attempt', { p_attempt_id: attemptId });
  if (error) throw error;
  return data as FinishResult;
}
export async function myAttempts(userId: string, limit = 50): Promise<(QuizAttempt & { quizzes: { title: string } | null })[]> {
  const { data, error } = await supabase.from('quiz_attempts').select('*, quizzes(title)').eq('student_id', userId)
    .not('completed_at', 'is', null).order('started_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as never;
}
