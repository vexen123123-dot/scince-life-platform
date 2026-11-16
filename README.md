# منصة العلوم والحياة 🔬

رحلتك التفاعلية لاكتشاف جسم الإنسان والعلوم — الصف التاسع الأساسي (فلسطين) — الفصل الأول.

- **عمل الطالب المبدع:** سليمان بديع قديح
- **تحت إشراف المعلمة الفاضلة:** رولا طه

> **حالة المشروع بصراحة:** الكود مكتوب بالكامل، وسياسات قاعدة البيانات (RLS) اختُبرت فعلاً على PostgreSQL محلي (67 فحصاً ناجحاً). لكن لم يُشغَّل `npm install/build` ولا الواجهة في بيئة التطوير التي كُتب فيها (بلا إنترنت)، ولم تُجرَّب دوال Edge على Supabase الحقيقي. **لذلك أول خطوة لك هي `npm run build` وإصلاح أي خطأ نوع (type) يظهر** — راجع قسم «ما لم يُختبر» في آخر الملف.

---

## 1) ما الذي يحتويه المشروع؟

| الميزة | الوصف |
|---|---|
| الدروس | الدرس 1 المغذيات (8 أقسام) والدرس 2 الجهاز الهضمي (11 قسماً): أهداف، شرح، جداول، أنشطة تفاعلية، مراجعة |
| المختبر ثلاثي الأبعاد | الجهاز الهضمي: تدوير/تكبير/لمس، اختيار عضو، تظليل، لوحة معلومات عربية، إعادة الكاميرا، ملء الشاشة، إخفاء التسميات |
| 8 محاكاة | رحلة الطعام، الهضم الميكانيكي والكيميائي، الأميليز، البيبسين، هضم الكربوهيدرات، استحلاب الصفراء، امتصاص الزغابات، الحركة الدودية — بتشغيل/إيقاف/استئناف/إعادة |
| وضع العرض الصفّي | ملء الشاشة، خط كبير، التالي/السابق، إخفاء الأدوات، اختصارات لوحة المفاتيح |
| 7 خرائط مفاهيم | قابلة للنقر |
| الاختبارات | 68 سؤالاً، 10 أنواع، تصحيح **على الخادم** (الإجابة الصحيحة لا تصل المتصفح قبل المحاولة)، إعادة الأخطاء |
| الواجبات | إنشاء/تعديل/نشر، إسناد لطلاب أو مجموعات، مرفقات، مسودات، تسليم، رفع صور وملفات، تصحيح، ملاحظات، إعادة للتصحيح، سجل |
| لوحات التحكم | لوحة الطالب، ولوحة الإدارة (إحصاءات، رسوم، جداول بحث/ترتيب/صفحات، سجل تدقيق) |

## 2) هيكل المجلدات

```
science-life/
├─ src/
│  ├─ pages/ (+ admin/)       صفحات التطبيق
│  ├─ features/               lessons، simulations، lab3d، quiz، conceptmaps
│  ├─ content/                نصوص الدروس وبنك الأسئلة وخرائط المفاهيم
│  ├─ services/               استدعاءات Supabase
│  ├─ contexts/ hooks/ lib/ components/ layouts/
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/             1 المخطط • 2 الأمان وRLS • 3 التخزين • 4 بذر المحتوى
│  ├─ functions/              provision-admin • admin-create-student • grade-submission
│  └─ tests/                  rls_tests.sql
├─ scripts/                   diagnostics.mjs • generate-seed.ts • local-db-test.sh
├─ docs/                      3D-MODELS.md • PROGRESS.md
├─ public/models/             ضع هنا ملفات GLB المرخّصة (اختياري)
├─ vercel.json  .env.example  README.md
```

## 3) ما تحتاجه قبل البدء

- حساب مجاني على [Supabase](https://supabase.com) و[GitHub](https://github.com) و[Vercel](https://vercel.com).
- **Node.js 20 أو أحدث** من https://nodejs.org (اختر LTS). تحقق في الطرفية:
  ```bash
  node -v
  npm -v
  ```

> **رمز الأقسام:** 🖥️ = أمر في الطرفية (Terminal)، 🌐 = خطوة في لوحة Supabase/GitHub/Vercel عبر المتصفح.

## 4) تشغيل المشروع محلياً

🖥️
```bash
cd science-life
npm install
npm run build     # يفحص الأنواع ويبني — أصلح أي خطأ يظهر هنا أولاً
npm run dev       # يفتح http://localhost:5173
```
بدون إعداد Supabase تعمل الدروس والمحاكاة والمختبر من المحتوى المضمّن مع شريط تنبيه؛ أما الدخول والواجبات والاختبارات المحفوظة فتحتاج Supabase.

## 5) إنشاء مشروع Supabase

1. 🌐 في https://supabase.com/dashboard اضغط **New project**، اختر اسماً وكلمة مرور قاعدة بيانات قوية (احفظها في مدير كلمات مرور) وأقرب منطقة.
2. 🌐 بعد الإنشاء: **Project Settings → General** وانسخ **Reference ID** (هذا `project-ref`).
3. 🌐 **Project Settings → API** وانسخ: **Project URL** و**Publishable key** (أو `anon`). **لا تنسخ `service_role` إلى أي مكان في المشروع.**

## 6) ربط المشروع وتطبيق قاعدة البيانات

🖥️
```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```
هذا ينشئ الجداول وسياسات RLS وحاوية التخزين الخاصة `homework-files` ويبذر الدروس والأسئلة.

🌐 تأكد في **Table Editor** أن الجداول ظهرت، وفي **Authentication → Providers → Email** أن **Allow new users to sign up** مُعطَّل (الملف `config.toml` يعطّله محلياً، لكن إعداد المشروع السحابي يُراجَع من اللوحة). فعّل أيضاً حداً أدنى لكلمة المرور 10 أحرف من **Authentication → Policies / Passwords**.

## 7) نشر دوال Edge وضبط الأسرار

🖥️ ولّد سراً عشوائياً طويلاً (24 حرفاً فأكثر) **للتهيئة الأولى فقط**:
```bash
openssl rand -base64 32
```
ثم:
```bash
npx supabase secrets set ADMIN_BOOTSTRAP_SECRET="<السر-الذي-ولّدته>"
npx supabase functions deploy provision-admin
npx supabase functions deploy admin-create-student
npx supabase functions deploy grade-submission
```
`SUPABASE_URL` و`SUPABASE_SERVICE_ROLE_KEY` تُحقن في الدوال تلقائياً من Supabase؛ **لا تضعهما في أي ملف.**

## 8) إنشاء حسابات المسؤولَين وحساب الطالب

**لا يوجد تسجيل عام ولا أي بريد أو كلمة مرور مضمَّنة في الكود.** أنتم تختارون البريد وكلمة المرور (10 أحرف فأكثر).

### 8.1 المسؤولان (صلاحيات متطابقة تماماً: دور `admin`)

🖥️ نفّذ الأمر مرة لكل مسؤول (استبدل القيم بين `<>`):
```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/provision-admin" \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-secret: <السر>" \
  -d '{"mode":"create","email":"<بريد-سليمان-الإداري>","password":"<كلمة-مرور-قوية>","full_name":"سليمان بديع قديح"}'

curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/provision-admin" \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-secret: <السر>" \
  -d '{"mode":"create","email":"<بريد-المعلمة>","password":"<كلمة-مرور-قوية>","full_name":"المعلمة رولا طه"}'
```
النجاح: `{"ok":true,"user_id":"…","role":"admin"}`.

> يجب أن يكون بريد سليمان **الإداري** مختلفاً عن بريد حسابه **كطالب** (حسابان منفصلان).

### 8.2 حساب سليمان كطالب (منفصل)

بعد الدخول كمسؤول: **لوحة الإدارة ← الطلاب ← إضافة طالب**، وأدخل اسمه وبريداً مختلفاً عن بريد الإدارة وكلمة مرور. (الدالة `admin-create-student` تتحقق أن المستدعي مسؤول.)

### 8.3 احذف سر التهيئة

🖥️
```bash
npx supabase secrets unset ADMIN_BOOTSTRAP_SECRET
```
بعدها يمكن للمسؤولين فقط (بجلسة دخول) استدعاء `provision-admin`.

### كيف نضمن عدم إمكان ترقية النفس؟
- الملف الشخصي يُنشأ بدور `student` دائماً بمحفّز قاعدة بيانات.
- محفّز `guard_profile_update` يمنع تغيير `role` إلا من `postgres/service_role` (أي الدوال الآمنة فقط).
- كل الجداول الحساسة عليها RLS، والتحقق في الخادم لا في الواجهة.

## 9) متغيرات البيئة

🖥️ انسخ `.env.example` إلى `.env` (لا يُرفع إلى GitHub):
```bash
cp .env.example .env
```
واملأ:
```
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
```

## 10) الاختبارات والتشخيص

🖥️ بعد ضبط `.env` وإنشاء الحسابات:
```bash
npm run diagnostics
```
يفحص: الاتصال، منع الزائر من القراءة، تعطيل التسجيل العام، إخفاء مفاتيح الأسئلة. ولاختبارات الأدوار مرّر بيانات اعتماد **في الجلسة فقط** (لا تُحفظ في ملف):
```bash
TEST_STUDENT_EMAIL=… TEST_STUDENT_PASSWORD=… TEST_ADMIN_EMAIL=… TEST_ADMIN_PASSWORD=… npm run diagnostics
```
يفحص: دخول الطالب/المسؤول وجلب الدور، منع الطالب من الترقية وإنشاء الواجبات وكتابة الدرجات وقراءة سجل التدقيق، إنشاء واجب بالمسؤول، رفع ملف خاص ورابط موقّع.

اختبار سياسات القاعدة محلياً (يتطلب PostgreSQL 16 محلياً):
```bash
PGHOST=… PGPORT=… PGUSER=postgres bash scripts/local-db-test.sh
```

> **بلا طرفية على جهازك؟** بعد رفع المشروع إلى GitHub، يشغّل ملف `.github/workflows/ci.yml` تلقائياً `npm install` وفحص الأنواع والبناء واختبارات قاعدة البيانات في السحابة (تبويب **Actions**)، فترى الأخطاء الحقيقية دون أي أوامر. ويمكنك أيضاً فتح المستودع في **GitHub Codespaces** (زر Code ← Codespaces) لتشغيل `npm run dev` من المتصفح.

## 11) GitHub

🖥️
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<حسابك>/science-life.git
git push -u origin main
```
(أنشئ المستودع الفارغ أولاً 🌐 من github.com/new.) تأكد أن `.env` غير ظاهر في `git status`.

## 12) النشر على Vercel

1. 🌐 vercel.com ← **Add New → Project** ← استورد المستودع (Framework: Vite، Build: `npm run build`، Output: `dist`).
2. 🌐 **Environment Variables**: أضف `VITE_SUPABASE_URL` و`VITE_SUPABASE_PUBLISHABLE_KEY` فقط. **لا تضف `service_role`.**
3. 🌐 اضغط **Deploy**. ملف `vercel.json` يوجّه كل المسارات إلى `index.html` (SPA).
4. 🌐 في Supabase: **Authentication → URL Configuration** أضف رابط Vercel إلى **Site URL**.

## 13) اختبار الإنتاج (قائمة يدوية)

- [ ] فتح الرابط، ظهور العربية واتجاه RTL والاعتمادات في التذييل
- [ ] دخول الطالب ← لوحة الطالب فقط؛ فتح `/admin` يعيده
- [ ] دخول المسؤول ← لوحة الإدارة
- [ ] إنشاء واجب ونشره ← ظهوره للطالب ← حفظ مسودة ← تسليم مع رفع صورة
- [ ] تصحيح الواجب ← ظهور الدرجة والملاحظات للطالب
- [ ] اختبار ← النتيجة محفوظة وتظهر في لوحة الإدارة
- [ ] المختبر ثلاثي الأبعاد على الهاتف (لمس/تكبير)

## 14) نماذج ثلاثية الأبعاد

المجسمات الحالية **مولَّدة برمجياً (تقريبية)** وليست نماذج GLB حقيقية. لاستعمال نموذج حقيقي راجع `docs/3D-MODELS.md` (التحقق من الترخيص ومسار `public/models` وإعداد `GLB_CONFIG`).

## 15) إضافة درس جديد

من **لوحة الإدارة ← الوحدات والدروس**: أضف الدرس ثم أقسامه (كتل JSON). أو أضف ملفاً في `src/content/` وشغّل `npm run seed:generate` ثم `npx supabase db push`.

## 16) ما لم يُختبر (للأمانة)

- لم يُنفَّذ `npm install` ولا `npm run build` ولا الواجهة في بيئة الكتابة؛ فحص الصياغة فقط (esbuild).
- دوال Edge (Deno) لم تُنشر ولم تُجرَّب على Supabase حقيقي.
- مسار GLB غير مُجرَّب (لا توجد نماذج).
- اختبارات RLS (67) نُفّذت على PostgreSQL 16 محلي مع محاكاة بسيطة لـ `auth/storage` وليس على Supabase السحابي؛ شغّل `npm run diagnostics` بعد النشر.

## الترخيص والاعتمادات

عمل الطالب المبدع: سليمان بديع قديح — تحت إشراف المعلمة الفاضلة: رولا طه. المحتوى مبني على كتاب العلوم والحياة للصف التاسع (فلسطين)؛ المعلومات الإضافية خارج الكتاب موسومة «معلومة إضافية».
