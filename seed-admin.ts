/**
 * SEED SCRIPT — إنشاء أول مستخدم Admin
 * 
 * الاستخدام:
 * 1. تأكد من إعداد ملف .env.local بمتغيرات Firebase
 * 2. شغّل الأمر: npx ts-node scripts/seed-admin.ts
 * 
 * ملاحظة: هذا الملف يستخدم Firebase Admin SDK
 * تحتاج لتحميل: npm install firebase-admin ts-node
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// إعداد Admin SDK
// Option 1: استخدم Service Account JSON
const serviceAccount = require(path.join(process.cwd(), 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

async function seedAdmin() {
  const adminEmail = 'admin@yourdomain.com'; // غيّر هذا
  const adminPassword = 'ChangeMe@123';      // غيّر هذا فوراً بعد تسجيل الدخول
  const adminName = 'مدير النظام';

  try {
    // إنشاء مستخدم في Firebase Auth
    const userRecord = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: adminName,
    });

    console.log('✅ تم إنشاء مستخدم Auth:', userRecord.uid);

    // إنشاء بيانات المستخدم في Firestore
    await db.collection('users').doc(userRecord.uid).set({
      username: adminName,
      email: adminEmail,
      role: 'admin',
      isActive: true,
      permissions: {
        add_subscription: true,
        edit_subscription: true,
        delete_subscription: true,
        manage_products: true,
        manage_technical_accounts: true,
        edit_technical_accounts: true,
        view_financial_accounts: true,
        manage_financial_accounts: true,
        manage_payment_methods: true,
        manage_users: true,
        view_notifications: true,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ تم إنشاء بيانات المستخدم في Firestore');
    console.log(`
🎉 تم إنشاء حساب المدير بنجاح!
━━━━━━━━━━━━━━━━━━━━━━━━━━
البريد الإلكتروني: ${adminEmail}
كلمة المرور: ${adminPassword}
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ غيّر كلمة المرور فوراً بعد تسجيل الدخول!
    `);

  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      console.log('⚠️ المستخدم موجود بالفعل. تحقق من Firebase Console.');
    } else {
      console.error('❌ خطأ:', error.message);
    }
  }

  process.exit(0);
}

seedAdmin();
