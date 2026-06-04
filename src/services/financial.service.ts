import {
  collection,
  doc,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { FinancialTransaction, FinancialTransactionForm, TransactionType } from '@/types';

const COLLECTION = 'financialTransactions';

export const getTransactions = async (filters?: {
  type?: TransactionType;
  customerPhone?: string;
  paymentMethodId?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<FinancialTransaction[]> => {
  let q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));

  const snapshot = await getDocs(q);
  let transactions = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as FinancialTransaction[];

  // Client-side filtering for flexibility
  if (filters?.type) {
    transactions = transactions.filter((t) => t.type === filters.type);
  }
  if (filters?.customerPhone) {
    transactions = transactions.filter((t) =>
      t.customerPhone?.includes(filters.customerPhone!)
    );
  }
  if (filters?.paymentMethodId) {
    transactions = transactions.filter((t) => t.paymentMethodId === filters.paymentMethodId);
  }
  if (filters?.startDate) {
    transactions = transactions.filter((t) => t.createdAt >= filters.startDate!);
  }
  if (filters?.endDate) {
    transactions = transactions.filter((t) => t.createdAt <= filters.endDate!);
  }

  return transactions;
};

export const getMonthlyStats = async () => {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const q = query(
    collection(db, COLLECTION),
    where('createdAt', '>=', Timestamp.fromDate(firstOfMonth))
  );
  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map((doc) => doc.data());

  let income = 0;
  let expenses = 0;
  let refunds = 0;

  transactions.forEach((t) => {
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') expenses += t.amount;
    else if (t.type === 'refund') refunds += t.amount;
  });

  return { income, expenses, refunds, profit: income - expenses - refunds };
};

export const getAllTimeStats = async () => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const transactions = snapshot.docs.map((doc) => doc.data());

  let income = 0;
  let expenses = 0;
  let refunds = 0;

  transactions.forEach((t) => {
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') expenses += t.amount;
    else if (t.type === 'refund') refunds += t.amount;
  });

  return { income, expenses, refunds, profit: income - expenses - refunds };
};

export const addFinancialTransaction = async (
  data: Omit<FinancialTransactionForm, 'source'> & { source?: string; type: any; createdBy: string }
): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const addManualTransaction = async (
  form: FinancialTransactionForm,
  createdBy: string
): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...form,
    createdBy,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};
