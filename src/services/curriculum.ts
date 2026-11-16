import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { units as bundledUnits, lessons as bundledLessons } from '../content/curriculum';
import type { SectionContent } from '../types/content';
import type { Lesson, LessonProgress, Unit } from '../types/db';

export type Source = 'database' | 'bundled';
export interface CurriculumData { units: Unit[]; lessons: Lesson[]; source: Source }
export interface LessonData { lesson: { id: string | null; slug: string; title: string; summary: string }; sections: SectionContent[]; source: Source }

function bundledCurriculum(): CurriculumData {
  return {
    source: 'bundled',
    units: bundledUnits.map((u) => ({ id: u.slug, slug: u.slug, title: u.title, description: u.description, position: u.position, is_published: true })),
    lessons: bundledLessons.map((l) => ({ id: l.slug, unit_id: l.unitSlug, slug: l.slug, title: l.title, summary: l.summary, position: l.position, is_published: true })),
  };
}

export async function loadCurriculum(): Promise<CurriculumData> {
  if (!isSupabaseConfigured) return bundledCurriculum();
  const [u, l] = await Promise.all([
    supabase.from('units').select('*').order('position'),
    supabase.from('lessons').select('*').order('position'),
  ]);
  if (u.error) throw u.error;
  if (l.error) throw l.error;
  if (!u.data?.length) return bundledCurriculum(); // قاعدة فارغة: لم تُطبَّق ترحيلات البذر بعد
  return { units: u.data as Unit[], lessons: l.data as Lesson[], source: 'database' };
}

export async function loadLesson(slug: string): Promise<LessonData | null> {
  if (isSupabaseConfigured) {
    const { data: lesson, error } = await supabase.from('lessons').select('id, slug, title, summary').eq('slug', slug).maybeSingle();
    if (error) throw error;
    if (lesson) {
      const { data: secs, error: e2 } = await supabase.from('lesson_sections').select('slug, title, blocks').eq('lesson_id', lesson.id).order('position');
      if (e2) throw e2;
      return { lesson, sections: (secs ?? []) as SectionContent[], source: 'database' };
    }
  }
  const b = bundledLessons.find((x) => x.slug === slug);
  return b ? { lesson: { id: null, slug: b.slug, title: b.title, summary: b.summary }, sections: b.sections, source: 'bundled' } : null;
}

export async function loadMyProgress(userId: string): Promise<LessonProgress[]> {
  const { data, error } = await supabase.from('lesson_progress').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as LessonProgress[];
}

export async function saveProgress(userId: string, lessonId: string, completed: string[], total: number) {
  const { error } = await supabase.from('lesson_progress').upsert({
    user_id: userId, lesson_id: lessonId, completed_sections: completed,
    completed_at: completed.length >= total ? new Date().toISOString() : null,
  }, { onConflict: 'user_id,lesson_id' });
  if (error) throw error;
}
