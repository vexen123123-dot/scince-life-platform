// يولّد ملف SQL لبذر المنهج وبنك الأسئلة في Supabase من ملفات المحتوى في src/content
// التشغيل: npm run seed:generate   ثم   npx supabase db push
import { writeFileSync } from 'node:fs';
import { units, lessons } from '../src/content/curriculum';
import { quizzes } from '../src/content/questionBank';

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const json = (v: unknown) => {
  const s = JSON.stringify(v);
  if (s.includes('$j$')) throw new Error('محتوى غير مسموح: $j$');
  return `$j$${s}$j$::jsonb`;
};

const out: string[] = [];
out.push('-- ملف مُولَّد تلقائياً بواسطة scripts/generate-seed.ts — لا تعدّله يدوياً.');
out.push('-- يمكن إعادة تشغيله بأمان (idempotent).\n');

for (const u of units) {
  out.push(`insert into public.units (slug, title, description, position) values (${q(u.slug)}, ${q(u.title)}, ${q(u.description)}, ${u.position})
on conflict (slug) do update set title = excluded.title, description = excluded.description, position = excluded.position;`);
}

for (const l of lessons) {
  out.push(`insert into public.lessons (unit_id, slug, title, summary, position)
select id, ${q(l.slug)}, ${q(l.title)}, ${q(l.summary)}, ${l.position} from public.units where slug = ${q(l.unitSlug)}
on conflict (slug) do update set title = excluded.title, summary = excluded.summary, position = excluded.position;`);
  l.sections.forEach((s, i) => {
    out.push(`insert into public.lesson_sections (lesson_id, slug, title, position, blocks)
select id, ${q(s.slug)}, ${q(s.title)}, ${i + 1}, ${json(s.blocks)} from public.lessons where slug = ${q(l.slug)}
on conflict (lesson_id, slug) do update set title = excluded.title, position = excluded.position, blocks = excluded.blocks;`);
  });
}

for (const z of quizzes) {
  out.push(`insert into public.quizzes (lesson_id, slug, title, description)
select id, ${q(z.slug)}, ${q(z.title)}, ${q(z.description)} from public.lessons where slug = ${q(z.lessonSlug)}
on conflict (slug) do update set title = excluded.title, description = excluded.description;`);
  const rows = z.questions.map((qq, i) =>
    `  (${q(qq.kind)}::public.question_kind, ${q(qq.prompt)}, ${qq.options ? json(qq.options) : 'null'}, ${json(qq.answer_key)}, ${q(qq.explanation)}, ${qq.points ?? 1}, ${i + 1})`);
  out.push(`do $seed$
declare qid uuid;
begin
  select id into qid from public.quizzes where slug = ${q(z.slug)};
  if not exists (select 1 from public.quiz_questions where quiz_id = qid) then
    insert into public.quiz_questions (quiz_id, kind, prompt, options, answer_key, explanation, points, position)
    select qid, v.* from (values
${rows.join(',\n')}
    ) as v(kind, prompt, options, answer_key, explanation, points, position);
  end if;
end $seed$;`);
}

out.push(`insert into public.platform_settings (key, value, is_public) values
  ('site', ${json({ name: 'منصة العلوم والحياة', tagline: 'رحلتك التفاعلية لاكتشاف جسم الإنسان والعلوم', grade: 'الصف التاسع الأساسي — فلسطين', semester: 'الفصل الأول' })}, true),
  ('credits', ${json({ student: 'سليمان بديع قديح', teacher: 'رولا طه' })}, true),
  ('homework', ${json({ max_file_mb: 10 })}, true)
on conflict (key) do nothing;`);

writeFileSync(new URL('../supabase/migrations/20260101000004_seed_content.sql', import.meta.url), out.join('\n\n') + '\n');
console.log('تم توليد ملف البذر:', lessons.length, 'دروس،', quizzes.reduce((n, z) => n + z.questions.length, 0), 'سؤالاً');
