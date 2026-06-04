import { limit,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Notification, NotificationType } from '@/types';

const COLLECTION = 'notifications';

export const getNotifications = async (limitCount?: number): Promise<Notification[]> => {
  const q = limitCount
    ? query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(limitCount))
    : query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as Notification[];
};

export const getUnreadCount = async (): Promise<number> => {
  const q = query(collection(db, COLLECTION), where('isRead', '==', false));
  const snapshot = await getDocs(q);
  return snapshot.size;
};

export const createNotification = async (data: {
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
}): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    isRead: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const markAsRead = async (id: string): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, id), { isRead: true });
};

export const markAllAsRead = async (): Promise<void> => {
  const q = query(collection(db, COLLECTION), where('isRead', '==', false));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => {
    batch.update(d.ref, { isRead: true });
  });
  await batch.commit();
};
