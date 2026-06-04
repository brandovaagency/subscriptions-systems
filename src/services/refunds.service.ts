import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { RefundRequest, RefundRequestForm, RefundStatus } from '@/types';
import { addFinancialTransaction } from './financial.service';
import { createNotification } from './notifications.service';

const COLLECTION = 'refundRequests';

export const getRefundRequests = async (): Promise<RefundRequest[]> => {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as RefundRequest[];
};

export const addRefundRequest = async (
  form: RefundRequestForm,
  paymentMethodName: string
): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...form,
    paymentMethodName,
    status: 'pending' as RefundStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await createNotification({
    type: 'refund_request',
    title: 'طلب استرجاع أموال جديد',
    message: `طلب استرجاع ${form.amount} جنيه للعميل ${form.customerPhone}`,
    relatedId: docRef.id,
  });

  return docRef.id;
};

export const updateRefundStatus = async (
  id: string,
  status: RefundStatus,
  refund: RefundRequest,
  createdBy: string,
  notes?: string
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, id), {
    status,
    notes: notes || refund.notes,
    updatedAt: serverTimestamp(),
  });

  if (status === 'completed') {
    await addFinancialTransaction({
      type: 'refund',
      source: 'refund',
      amount: refund.amount,
      customerSubscriptionId: refund.customerSubscriptionId,
      customerPhone: refund.customerPhone,
      paymentMethodId: refund.paymentMethodId,
      title: `استرجاع أموال للعميل ${refund.customerPhone}`,
      createdBy,
    });
  }
};
