import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { TechnicalAccount, TechnicalAccountForm } from '@/types';

const COLLECTION = 'technicalAccounts';

export const getTechnicalAccounts = async (): Promise<TechnicalAccount[]> => {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as TechnicalAccount[];
};

export const getActiveTechnicalAccountsByType = async (accountType: string): Promise<TechnicalAccount[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('accountType', '==', accountType),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as TechnicalAccount[];
};

export const addTechnicalAccount = async (data: TechnicalAccountForm): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateTechnicalAccount = async (id: string, data: Partial<TechnicalAccountForm>): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteTechnicalAccount = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, id));
};
