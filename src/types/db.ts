export type Role = 'student' | 'admin';
export interface Profile { id: string; full_name: string; role: Role; group_name: string | null; is_active: boolean; created_at: string }
export interface Unit { id: string; slug: string; title: string; description: string; position: number; is_published: boolean }
export interface Lesson { id: string; unit_id: string; slug: string; title: string; summary: string; position: number; is_published: boolean }
export interface LessonProgress { user_id: string; lesson_id: string; completed_sections: string[]; completed_at: string | null }
export interface Assignment {
  id: string; title: string; instructions: string; lesson_id: string | null; due_at: string | null;
  status: 'draft' | 'published'; allow_resubmit: boolean; max_score: number; created_at: string;
}
export interface AssignmentQuestion { id: string; assignment_id: string; position: number; kind: 'mcq' | 'true_false' | 'short' | 'essay'; prompt: string; options: string[] | null; points: number }
export interface Attachment { id: string; assignment_id?: string; storage_path: string; file_name: string; mime_type: string; size_bytes: number }
export type SubStatus = 'draft' | 'submitted' | 'returned' | 'graded';
export interface Submission { id: string; assignment_id: string; student_id: string; status: SubStatus; attempt: number; submitted_at: string | null; updated_at: string }
export interface Grade { id: string; submission_id: string; score: number; graded_at: string }
export interface Feedback { id: string; submission_id: string; body: string; created_at: string }
export interface Quiz { id: string; lesson_id: string | null; slug: string; title: string; description: string; is_published: boolean }
export interface QuizQuestion { id: string; quiz_id: string; position: number; kind: string; prompt: string; options: unknown; points: number }
export interface QuizAttempt { id: string; quiz_id: string; student_id: string; score: number; max_score: number; started_at: string; completed_at: string | null; is_retry: boolean }
export interface Announcement { id: string; title: string; body: string; is_published: boolean; created_at: string }
export interface AuditLog { id: number; actor_id: string | null; action: string; entity: string; entity_id: string | null; details: Record<string, unknown>; created_at: string }
