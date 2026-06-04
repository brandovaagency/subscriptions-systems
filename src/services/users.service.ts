import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { AppUser, UserPermissions, UserRole } from '@/types';
import { createUserAccount } from './auth.service';

const COLLECTION = 'users';

export const getUsers = async (): Promise<AppUser[]> => {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as AppUser[];
};

export const getUserById = async (id: string): Promise<AppUser | null> => {
  const docSnap = await getDoc(doc(db, COLLECTION, id));
  if (!docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate(),
    updatedAt: docSnap.data().updatedAt?.toDate(),
  } as AppUser;
};

export const addUser = async (
  email: string,
  password: string,
  username: string,
  role: UserRole,
  permissions: UserPermissions,
  isActive: boolean
): Promise<string> => {
  return await createUserAccount(email, password, username, role, permissions);
};

export const updateUser = async (
  id: string,
  data: Partial<Omit<AppUser, 'id' | 'createdAt'>>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const toggleUserStatus = async (id: string, isActive: boolean): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, id), {
    isActive,
    updatedAt: serverTimestamp(),
  });
};

export const updateUserPermissions = async (
  id: string,
  permissions: UserPermissions
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, id), {
    permissions,
    updatedAt: serverTimestamp(),
  });
};

export const deleteUser = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, id));
};
