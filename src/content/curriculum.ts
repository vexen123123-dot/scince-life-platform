import type { LessonContent, UnitContent } from '../types/content';
import { lesson1 } from './lesson1';
import { lesson2 } from './lesson2';

export const units: UnitContent[] = [
  {
    slug: 'human-body-systems',
    title: 'الوحدة الأولى: أجهزة جسم الإنسان',
    description: 'المغذيات والجهاز الهضمي — الصف التاسع، الفصل الأول.',
    position: 1,
  },
];

// لإضافة درس جديد: أنشئ ملف lessonN.ts بنفس الشكل وأضفه هنا، ثم شغّل: npm run seed:generate
export const lessons: LessonContent[] = [lesson1, lesson2];

export function getLessonBySlug(slug: string) {
  return lessons.find((l) => l.slug === slug);
}
