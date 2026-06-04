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
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { CustomerSubscription, CustomerSubscriptionForm, OrderStatus, SubscriptionStatus } from '@/types';
import { addFinancialTransaction } from './financial.service';
import { createNotification } from './notifications.service';

const COLLECTION = 'customerSubscriptions';

const computeStatus = (endDate: Date): SubscriptionStatus => {
  return endDate >= new Date() ? 'active' : 'expired';
};

export const getSubscriptions = async (): Promise<CustomerSubscription[]> => {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const endDate = data.endDate?.toDate();
    return {
      id: doc.id,
      ...data,
      startDate: data.startDate?.toDate(),
      endDate,
      subscriptionStatus: computeStatus(endDate),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  }) as CustomerSubscription[];
};

export const getPendingSubscriptions = async (): Promise<CustomerSubscription[]> => {
  const q = query(collection(db, COLLECTION), where('orderStatus', '==', 'pending'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startDate: data.startDate?.toDate(),
      endDate: data.endDate?.toDate(),
      subscriptionStatus: computeStatus(data.endDate?.toDate()),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  }) as CustomerSubscription[];
};

export const getExpiringSubscriptions = async (withinDays: number = 5): Promise<CustomerSubscription[]> => {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + withinDays);

  const q = query(
    collection(db, COLLECTION),
    where('endDate', '>=', Timestamp.fromDate(now)),
    where('endDate', '<=', Timestamp.fromDate(future))
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startDate: data.startDate?.toDate(),
      endDate: data.endDate?.toDate(),
      subscriptionStatus: 'active' as SubscriptionStatus,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  }) as CustomerSubscription[];
};

export const addSubscription = async (
  form: CustomerSubscriptionForm,
  product: { name: string },
  duration: { label: string; months: number; price: number },
  technicalAccountEmail: string,
  createdBy: string
): Promise<string> => {
  const startDate = new Date(form.startDate);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + duration.months);

  const subscriptionData = {
    customerPhone: form.customerPhone,
    productId: form.productId,
    productName: product.name,
    durationLabel: duration.label,
    durationMonths: duration.months,
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    price: duration.price,
    technicalAccountId: form.technicalAccountId || null,
    technicalAccountEmail: technicalAccountEmail || null,
    orderStatus: form.orderStatus,
    notes: form.notes || null,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COLLECTION), subscriptionData);

  // Auto-create financial transaction if completed
  if (form.orderStatus === 'completed') {
    await addFinancialTransaction({
      type: 'income',
      source: 'subscription',
      amount: duration.price,
      customerSubscriptionId: docRef.id,
      customerPhone: form.customerPhone,
      title: `اشتراك ${product.name} - ${duration.label}`,
      createdBy,
    });
  }

  // Create notification if pending
  if (form.orderStatus === 'pending') {
    await createNotification({
      type: 'pending_order',
      title: 'طلب جديد قيد التنفيذ',
      message: `طلب اشتراك ${product.name} للعميل ${form.customerPhone}`,
      relatedId: docRef.id,
    });
  }

  return docRef.id;
};

export const updateSubscription = async (
  id: string,
  data: Partial<CustomerSubscription>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const completeOrder = async (
  subscription: CustomerSubscription,
  createdBy: string
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, subscription.id), {
    orderStatus: 'completed' as OrderStatus,
    updatedAt: serverTimestamp(),
  });

  await addFinancialTransaction({
    type: 'income',
    source: 'subscription',
    amount: subscription.price,
    customerSubscriptionId: subscription.id,
    customerPhone: subscription.customerPhone,
    title: `اشتراك ${subscription.productName} - ${subscription.durationLabel}`,
    createdBy,
  });

  await createNotification({
    type: 'pending_order',
    title: 'تم تنفيذ الطلب بنجاح',
    message: `تم تنفيذ اشتراك ${subscription.productName} للعميل ${subscription.customerPhone}`,
    relatedId: subscription.id,
  });
};

export const extendSubscription = async (
  id: string,
  currentEndDate: Date,
  additionalMonths: number,
  newPrice: number,
  createdBy: string,
  productName: string,
  durationLabel: string,
  customerPhone: string
): Promise<void> => {
  const newEndDate = new Date(currentEndDate);
  newEndDate.setMonth(newEndDate.getMonth() + additionalMonths);

  await updateDoc(doc(db, COLLECTION, id), {
    endDate: Timestamp.fromDate(newEndDate),
    durationMonths: additionalMonths,
    durationLabel,
    price: newPrice,
    updatedAt: serverTimestamp(),
  });

  await addFinancialTransaction({
    type: 'income',
    source: 'subscription',
    amount: newPrice,
    customerSubscriptionId: id,
    customerPhone,
    title: `تجديد اشتراك ${productName} - ${durationLabel}`,
    createdBy,
  });
};

export const deleteSubscription = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, id));
};
