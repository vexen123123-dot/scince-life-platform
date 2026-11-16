# اختبارات بلا إنترنت (لبيئات لا تسمح بـ npm install)

هذه ليست بديلاً عن `npm run build`؛ هي فحوص تشغيل حقيقية للكود الفعلي حيث يمكن.

## ui-harness — تشغيل مكوّنات الواجهة الحقيقية في Chromium
يجمّع (esbuild) المحاكاة الثمانية وأقسام الدرسين وأنشطتها وخرائط المفاهيم من `src/` كما هي، ويستبدل فقط
`react-router-dom` و`lucide-react` بملفات صغيرة للاختبار (لا تُستعمل في المشروع). يتطلب React وesbuild وplaywright مثبّتة عالمياً.
```
cd tests/offline/ui-harness && node build.mjs && node run.cjs && node run3.cjs
```
> المسارات مكتوبة لبيئة التطوير الحالية (`/opt/npm-tools`، `/home/claude/science-life`)؛ عدّلها عند النقل.

## edge — اختبار منطق دوال Edge مع عميل Supabase مزيّف
`test.ts` يُشغَّل بـ bun على نسخة من `supabase/functions` يُستبدل فيها رابط esm.sh بـ `fake.ts` (راجع الأوامر في PROGRESS.md).
