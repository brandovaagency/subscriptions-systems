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
import { PaymentMethod, PaymentMethodForm } from '@/types';

const COLLECTION = 'paymentMethods';

export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as PaymentMethod[];
};

export const getActivePaymentMethods = async (): Promise<PaymentMethod[]> => {
  const q = query(collection(db, COLLECTION), where('isActive', '==', true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as PaymentMethod[];
};

export const addPaymentMethod = async (data: PaymentMethodForm): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updatePaymentMethod = async (id: string, data: Partial<PaymentMethodForm>): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deletePaymentMethod = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, id));
};

export const togglePaymentMethodStatus = async (id: string, isActive: boolean): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, id), { isActive, updatedAt: serverTimestamp() });
};
