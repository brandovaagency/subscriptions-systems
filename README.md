# 🔑 نظام إدارة الاشتراكات الرقمية

نظام SaaS متكامل لإدارة الاشتراكات الرقمية مبني بـ **Next.js + TypeScript + Firebase**.

---

## 📁 هيكل المشروع

```
subscriptions-system/
├── src/
│   ├── types/
│   │   └── index.ts                    # TypeScript Interfaces لكل الكيانات
│   ├── lib/
│   │   └── firebase/
│   │       └── config.ts               # إعداد Firebase
│   ├── services/
│   │   ├── auth.service.ts             # خدمة المصادقة
│   │   ├── users.service.ts            # خدمة المستخدمين
│   │   ├── products.service.ts         # خدمة منتجات الاشتراكات
│   │   ├── technical-accounts.service.ts # خدمة الحسابات الفنية
│   │   ├── payment-methods.service.ts  # خدمة طرق الدفع
│   │   ├── subscriptions.service.ts    # خدمة الاشتراكات
│   │   ├── financial.service.ts        # خدمة الحسابات المالية
│   │   ├── notifications.service.ts    # خدمة الإشعارات
│   │   └── refunds.service.ts          # خدمة طلبات الاسترجاع
│   ├── hooks/
│   │   └── useAuth.tsx                 # Auth Context Provider
│   ├── components/
│   │   ├── layout/                     # Layout, Sidebar, Navbar
│   │   ├── ui/                         # UI Components
│   │   └── shared/                     # Shared Components
│   └── app/                            # Next.js App Router Pages
├── scripts/
│   └── seed-admin.ts                   # Script لإنشاء أول Admin
├── firestore.rules                     # قواعد أمان Firestore
├── .env.example                        # نموذج متغيرات البيئة
└── README.md
```

---

## 🚀 طريقة الإعداد والتشغيل

### الخطوة 1 — إنشاء مشروع Firebase

1. افتح [Firebase Console](https://console.firebase.google.com/)
2. انقر **Create a project**
3. أدخل اسم المشروع (مثال: `subs-manager`)
4. اختر ما إذا كنت تريد Google Analytics (اختياري)
5. انتظر حتى يكتمل الإنشاء

---

### الخطوة 2 — تفعيل Firebase Authentication

1. من القائمة الجانبية في Firebase Console → **Build → Authentication**
2. انقر **Get started**
3. اختر **Email/Password** من قائمة Sign-in providers
4. فعّل **Email/Password** وانقر **Save**

---

### الخطوة 3 — تفعيل Firestore Database

1. من القائمة الجانبية → **Build → Firestore Database**
2. انقر **Create database**
3. اختر الموقع الجغرافي الأقرب لعملائك (مثلاً `europe-west1` لمصر/الشرق الأوسط)
4. ابدأ بـ **Production mode** (سنضيف الـ Security Rules يدوياً)
5. انقر **Enable**

---

### الخطوة 4 — إضافة Firestore Security Rules

1. في Firestore → انقر تبويب **Rules**
2. احذف الكود الموجود
3. انسخ محتوى ملف `firestore.rules` والصقه
4. انقر **Publish**

---

### الخطوة 5 — الحصول على Firebase Config

1. في Firebase Console → ⚙️ Project Settings
2. تحت **Your apps** → انقر أيقونة `</>` لإضافة Web App
3. أدخل اسماً للتطبيق واضغط **Register app**
4. انسخ الـ `firebaseConfig` object

---

### الخطوة 6 — إعداد المشروع المحلي

```bash
# استنساخ المشروع أو إنشاء Next.js جديد
npx create-next-app@latest subscriptions-system --typescript --tailwind --app

# الانتقال للمجلد
cd subscriptions-system

# تثبيت Firebase
npm install firebase

# تثبيت dependencies إضافية
npm install react-hot-toast zustand date-fns

# نسخ ملف البيئة
cp .env.example .env.local
```

**حرر `.env.local` وأضف قيم Firebase الخاصة بك:**

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

### الخطوة 7 — إنشاء أول مستخدم Admin

**الطريقة الأولى (مباشرة من Firebase Console):**

1. Authentication → Users → **Add user**
2. أضف البريد وكلمة المرور
3. انسخ الـ UID الخاص به
4. Firestore → Collection `users` → Add document بالـ UID كـ Document ID
5. أضف الحقول التالية:

```json
{
  "username": "Ahmed Admin",
  "email": "admin@example.com",
  "role": "admin",
  "isActive": true,
  "permissions": {
    "add_subscription": true,
    "edit_subscription": true,
    "delete_subscription": true,
    "manage_products": true,
    "manage_technical_accounts": true,
    "edit_technical_accounts": true,
    "view_financial_accounts": true,
    "manage_financial_accounts": true,
    "manage_payment_methods": true,
    "manage_users": true,
    "view_notifications": true
  },
  "createdAt": (server timestamp),
  "updatedAt": (server timestamp)
}
```

**الطريقة الثانية (Script):**

```bash
# تحميل Service Account Key من Firebase Console → Project Settings → Service accounts
# احفظ الملف كـ serviceAccountKey.json في مجلد المشروع

npm install firebase-admin ts-node @types/node

# حرر البريد وكلمة المرور في الملف أولاً
npx ts-node scripts/seed-admin.ts
```

---

### الخطوة 8 — تشغيل المشروع

```bash
npm run dev
# أو
yarn dev
```

افتح [http://localhost:3000](http://localhost:3000)

---

## 🌐 طريقة النشر (Deploy)

### الخيار الأفضل: Vercel (مجاني ومثالي لـ Next.js)

```bash
# تثبيت Vercel CLI
npm install -g vercel

# تسجيل الدخول
vercel login

# النشر
vercel

# للـ Production
vercel --prod
```

**أو عبر واجهة Vercel:**
1. اذهب لـ [vercel.com](https://vercel.com)
2. انقر **New Project**
3. استورد مستودع GitHub
4. أضف Environment Variables (نفس محتوى `.env.local`)
5. انقر **Deploy**

### خيار بديل: Firebase Hosting

```bash
npm install -g firebase-tools

firebase login
firebase init hosting

# في firebase.json:
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
  }
}

# Build وDeploy
npm run build
firebase deploy --only hosting
```

---

## 🗄️ هيكل Firestore Collections

| Collection | الوصف |
|-----------|-------|
| `users` | بيانات المستخدمين والصلاحيات |
| `subscriptionProducts` | منتجات الاشتراكات وباقاتها |
| `technicalAccounts` | الحسابات الفنية للخدمات |
| `paymentMethods` | طرق الدفع المتاحة |
| `customerSubscriptions` | اشتراكات العملاء |
| `financialTransactions` | سجل المعاملات المالية |
| `refundRequests` | طلبات الاسترجاع |
| `notifications` | الإشعارات الداخلية |

---

## 🔐 نظام الصلاحيات

| الصلاحية | الوصف |
|---------|-------|
| `add_subscription` | إضافة اشتراكات جديدة |
| `edit_subscription` | تعديل الاشتراكات |
| `delete_subscription` | حذف الاشتراكات |
| `manage_products` | إدارة منتجات الاشتراكات |
| `manage_technical_accounts` | إضافة/حذف الحسابات الفنية |
| `edit_technical_accounts` | تعديل الحسابات الفنية |
| `view_financial_accounts` | عرض الحسابات المالية |
| `manage_financial_accounts` | إضافة معاملات مالية |
| `manage_payment_methods` | إدارة طرق الدفع |
| `manage_users` | إدارة المستخدمين |
| `view_notifications` | عرض الإشعارات |

---

## 💡 تحسينات مقترحة للمستقبل

### المرحلة الثانية:
- [ ] **إشعارات WhatsApp** عبر WhatsApp Business API أو Twilio
- [ ] **إشعارات Email** عبر SendGrid أو Mailgun
- [ ] **تقارير PDF** قابلة للتصدير
- [ ] **إحصائيات متقدمة** بـ Charts (Recharts أو Chart.js)
- [ ] **نظام Backup** تلقائي للبيانات

### المرحلة الثالثة:
- [ ] **Portal للعملاء** لمتابعة اشتراكاتهم
- [ ] **دفع إلكتروني** مباشر (Stripe أو Paymob)
- [ ] **تجديد تلقائي** للاشتراكات
- [ ] **تطبيق موبايل** React Native
- [ ] **Multi-tenant** لإدارة عدة شركات

---

## 📞 الدعم الفني

- **Firebase Docs**: [firebase.google.com/docs](https://firebase.google.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Tailwind CSS**: [tailwindcss.com/docs](https://tailwindcss.com/docs)
