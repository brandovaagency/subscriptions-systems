'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { getPendingSubscriptions, completeOrder } from '@/services/subscriptions.service';
import { CustomerSubscription } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import AccessDenied from '@/components/AccessDenied';
import { TableSkeleton } from '@/components/Skeleton';
import ConfirmDialog from '@/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { Clock, CheckCircle, RefreshCw } from 'lucide-react';

const toDateStr = (d: Date | { toDate(): Date }): string => {
  const date = d instanceof Date ? d : d.toDate();
  return format(date, 'dd/MM/yyyy HH:mm');
};

export default function PendingOrdersPage() {
  const { isAdmin, hasPermission } = useAuth();
  const canAccess = isAdmin || hasPermission('add_subscription');
  const [orders, setOrders] = useState<CustomerSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPendingSubscriptions();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleComplete = async () => {
    if (!completingId) return;
    setConfirmLoading(true);
    try {
      await completeOrder(completingId);
      toast.success('تم تحويل الطلب إلى مكتمل وتسجيل الدخل');
      setConfirmOpen(false);
      loadOrders();
    } catch {
      toast.error('حدث خطأ أثناء تحديث الطلب');
    } finally {
      setConfirmLoading(false);
    }
  };

  if (!canAccess) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="section-header">
        <div>
          <h1 className="section-title">الطلبات قيد التنفيذ</h1>
          <p className="text-slate-400 text-sm mt-1">{orders.length} طلب بانتظار التنفيذ</p>
        </div>
        <button onClick={loadOrders} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : orders.length === 0 ? (
        <div className="card empty-state">
          <CheckCircle className="w-12 h-12 text-green-500/30 mb-3" />
          <p className="text-slate-300 font-medium">لا توجد طلبات قيد التنفيذ</p>
          <p className="text-slate-500 text-sm mt-1">جميع الطلبات مكتملة</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>رقم العميل</th>
                <th>المنتج</th>
                <th>المدة</th>
                <th>السعر</th>
                <th>تاريخ الطلب</th>
                <th>الحساب الفني</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td className="font-mono text-sm">{order.customerPhone}</td>
                  <td>{order.productName}</td>
                  <td>{order.durationLabel}</td>
                  <td className="font-mono font-medium text-green-400">{order.price} ج</td>
                  <td className="text-slate-400 text-sm">{toDateStr(order.createdAt!)}</td>
                  <td className="text-slate-400 text-sm">{order.technicalAccountEmail || '—'}</td>
                  <td>
                    <button
                      onClick={() => { setCompletingId(order.id!); setConfirmOpen(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      تحويل لمكتمل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {orders.length > 0 && (
        <div className="card bg-yellow-500/5 border-yellow-500/20">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-yellow-300 font-medium text-sm">تنبيه</p>
              <p className="text-slate-400 text-xs mt-0.5">
                يوجد {orders.length} طلب ينتظر التنفيذ. عند تحويل الطلب لمكتمل يتم تسجيل الدخل تلقائيًا.
              </p>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleComplete}
        title="تأكيد إكمال الطلب"
        message="هل أنت متأكد من تحويل هذا الطلب إلى مكتمل؟ سيتم تسجيل الدخل في الحسابات المالية تلقائيًا."
        confirmLabel="تحويل لمكتمل"
        loading={confirmLoading}
        variant="warning"
      />
    </div>
  );
}
