# نقطة الحفظ (PROGRESS)

## مكتمل (مكتوب)
- قاعدة البيانات: 4 migrations (مخطط، RLS/محفّزات/دوال، تخزين خاص، بذر)، اختبارات RLS **67/67 ناجحة** على PG16 محلي.
- دوال Edge الثلاث (مكتوبة، غير مجرَّبة على Supabase).
- المحتوى: درسان، 68 سؤالاً، 7 خرائط مفاهيم.
- الواجهة: كل الصفحات + المختبر 3D + 8 محاكاة + وضع العرض + الاختبارات + الواجبات + لوحة الطالب + لوحة الإدارة (طلاب، محتوى، واجبات/تصحيح، اختبارات، إعدادات، تدقيق).
- App/main/CSS، diagnostics.mjs، README العربي.

## لم يُنجز / لم يُتحقق
- `npm install` + `npm run build` (لا إنترنت في بيئة الكتابة) ← قد تظهر أخطاء أنواع TypeScript.
- نشر الدوال واختبارها، ربط Supabase، GitHub، Vercel (خطوات خارجية، README).
- نماذج GLB حقيقية.

## الخطوة التالية بالضبط
1. `npm install && npm run build` وإصلاح الأخطاء.
2. اتباع README §5–§8 (Supabase ثم الحسابات).
3. `npm run diagnostics` ثم النشر على Vercel.

## فحص الأنواع الجزئي (آخر تحديث)
شُغّل `tsc` بدون حزم React/Vite/Three (غير متاحة بلا إنترنت): كل الأخطاء الباقية ناتجة عن غياب تلك الحزم
(TS7026/TS7006/TS2307/key-prop)، ولا أخطاء أنواع داخلية ظاهرة بعد إصلاح `React.RefObject` وإضافة `src/vite-env.d.ts`.
الفحص الحاسم يبقى `npm run build` بعد `npm install`.

## تحقيق البيئة وما أمكن اختباره فعلاً (الجولة الأخيرة)
**التحقيق:** لا `node_modules` ولا `package-lock.json`؛ كاش npm (30MB) يحوي أدوات غير ذات صلة (eslint، serve…) ولا يحوي vite/three/supabase/react-router/recharts؛
`registry.npmjs.org` مُستثنى من البروكسي ولا يُوصَل إليه مباشرة؛ bun وpnpm موجودان لكن بلا كاش حزم. مثبّت عالمياً: typescript وreact/react-dom 19 وesbuild وtailwind 4 وplaywright+Chromium.
**القيد الفعلي:** لا يمكن تثبيت `vite` و`three` و`@react-three/fiber` و`@supabase/supabase-js` و`react-router-dom` و`recharts` و`@types/react`، فلا بناء كامل ولا `tsc` كامل ولا معاينة للمشروع كاملاً.
**ما نُفّذ بدلاً من ذلك (كود المشروع الحقيقي، لا بدائل):**
1. مكوّنات الواجهة الحقيقية في Chromium (`tests/offline/ui-harness`): 8 محاكاة (تشغيل/إيقاف/تالي/إعادة) و18 قسماً من الدرسين وكل أزرار الأنشطة → **0 أخطاء** (pageerror/console). استُبدل فقط react-router وlucide بملفات اختبار صغيرة.
2. منطق دوال Edge الثلاث بعميل Supabase مزيّف (`tests/offline/edge`) → **24/24 ناجح** (403 لغير المسؤول/الموقوف/سر خاطئ، التحقق من البريد وكلمة المرور والدرجة، عدم الترقية إلى admin من create-student، التدقيق).
3. اختبارات RLS على PostgreSQL 16: **67/67**.
4. `tsc` جزئي: لا أخطاء أنواع داخلية ظاهرة (الباقي ناتج عن غياب الحزم).
**لم يُختبر بعد:** صفحات تعتمد على Supabase/Router الحقيقي، المختبر ثلاثي الأبعاد (three/R3F)، Recharts، البناء الكامل، النشر.
**أفضل حل متاح:** نشر على Vercel (يبني في السحابة بـ npm install حقيقي ويعطي رابطاً) — يحتاج ربط GitHub/Vercel بحساب المستخدم؛ أو تشغيل `npm install && npm run build` في أي جهاز/بيئة ذات إنترنت (مثل GitHub Codespaces من المتصفح بلا طرفية على الهاتف).
