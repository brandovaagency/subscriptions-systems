import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase/config';
import { AppUser, UserPermissions, UserRole } from '@/types';

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
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
};

export const DEFAULT_STAFF_PERMISSIONS: UserPermissions = {
  add_subscription: false,
  edit_subscription: false,
  delete_subscription: false,
  manage_products: false,
  manage_technical_accounts: false,
  edit_technical_accounts: false,
  view_financial_accounts: false,
  manage_financial_accounts: false,
  manage_payment_methods: false,
  manage_users: false,
  view_notifications: true,
};

export const loginUser = async (email: string, password: string): Promise<AppUser> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const appUser = await getUserData(userCredential.user.uid);
  if (!appUser) throw new Error('بيانات المستخدم غير موجودة');
  if (!appUser.isActive) throw new Error('هذا الحساب معطل. تواصل مع المدير');
  return appUser;
};

export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

export const getUserData = async (uid: string): Promise<AppUser | null> => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  } as AppUser;
};

export const createUserAccount = async (
  email: string,
  password: string,
  username: string,
  role: UserRole,
  permissions: UserPermissions
): Promise<string> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;

  await setDoc(doc(db, 'users', uid), {
    username,
    email,
    role,
    permissions,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return uid;
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
