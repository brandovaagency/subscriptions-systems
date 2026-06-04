'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { getRefundRequests, addRefundRequest, updateRefundStatus } from '@/services/refunds.service';
import { getSubscriptions } from '@/services/subscriptions.service';
import { getActivePaymentMethods } from '@/services/payment-methods.service';
import { RefundRequest, CustomerSubscription, PaymentMethod } from '@/types';
import Modal from '@/components/Modal';
import AccessDenied from '@/components/AccessDenied';
import { TableSkeleton } from '@/components/Skeleton';
import toast from 'react-hot-toast';
import { Plus, RotateCcw, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';

const toDateStr = (d: Date | { toDate(): Date }) => {
  const date = d instanceof Date ? d : d.toDate();
  return format(date, 'dd/MM/yyyy');
};

const statusLabel = { pending: 'قيد المراجعة', completed: 'مكتمل', rejected: 'مرفوض' };
const statusClass = {
  pending: 'badge-pending',
  completed: 'badge-completed',
  rejected: 'badge-inactive',
};

interface RefundForm {
  customerPhone: string;
  customerSubscriptionId: string;
  amount: number;
  reason: string;
  paymentMethodId: string;
  notes: string;
}
const emptyForm: RefundForm = { customerPhone: '', customerSubscriptionId: '', amount: 0, reason: '', paymentMethodId: '', notes: '' };

export default function RefundsPage() {
  const { appUser, isAdmin, hasPermission } = useAuth();
  const canAccess = isAdmin || hasPermission('add_subscription');
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<RefundForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [editingRefund, setEditingRefund] = useState<RefundRequest | null>(null);
  const [newStatus, setNewStatus] = useState<'completed' | 'rejected'>('completed');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [r, subs, methods] = await Promise.all([getRefundRequests(), getSubscriptions(), getActivePaymentMethods()]);
      setRefunds(r);
      setSubscriptions(subs);
      setPaymentMethods(methods);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredSubs = subscriptions.filter(s => s.customerPhone === form.customerPhone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerPhone || !form.amount || !form.reason) { toast.error('يرجى ملء الحقول المطلوبة'); return; }
    setSubmitting(true);
    try {
      const pmName = paymentMethods.find(m => m.id === form.paymentMethodId)?.name || '';
      await addRefundRequest({ ...form }, pmName);
      toast.success('تم إنشاء طلب الاسترجاع');
      setModalOpen(false);
      setForm(emptyForm);
      loadData();
    } catch { toast.error('حدث خطأ'); }
    finally { setSubmitting(false); }
  };

  const handleStatusUpdate = async () => {
    if (!editingRefund?.id) return;
    setSubmitting(true);
    try {
      await updateRefundStatus(editingRefund.id, newStatus, editingRefund, appUser?.id || '');
      toast.success(newStatus === 'completed' ? 'تم إكمال طلب الاسترجاع وخصم المبلغ' : 'تم رفض الطلب');
      setStatusModalOpen(false);
      loadData();
    } catch { toast.error('حدث خطأ'); }
    finally { setSubmitting(false); }
  };

  if (!canAccess) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="section-header">
        <h1 className="section-title">طلبات استرجاع الأموال</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4" />إنشاء طلب</button>
      </div>

      {loading ? <TableSkeleton rows={5} cols={7} /> : refunds.length === 0 ? (
        <div className="card empty-state">
          <RotateCcw className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400">لا توجد طلبات استرجاع</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>رقم العميل</th>
                <th>المبلغ</th>
                <th>سبب الاسترجاع</th>
                <th>طريقة الاستلام</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map(r => (
                <tr key={r.id}>
                  <td className="font-mono text-sm">{r.customerPhone}</td>
                  <td className="font-mono font-medium text-red-400">{r.amount} ج</td>
                  <td className="text-slate-300 max-w-40 truncate">{r.reason}</td>
                  <td className="text-slate-400 text-sm">{paymentMethods.find(p => p.id === r.paymentMethodId)?.name || '—'}</td>
                  <td>
                    <span className={statusClass[r.status]}>
                      {r.status === 'pending' && <Clock className="w-3 h-3" />}
                      {r.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                      {r.status === 'rejected' && <XCircle className="w-3 h-3" />}
                      {statusLabel[r.status]}
                    </span>
                  </td>
                  <td className="text-slate-400 text-sm">{toDateStr(r.createdAt)}</td>
                  <td>
                    {r.status === 'pending' && (
                      <button
                        onClick={() => { setEditingRefund(r); setNewStatus('completed'); setStatusModalOpen(true); }}
                        className="btn-ghost text-xs"
                      >
                        تحديث الحالة
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="إنشاء طلب استرجاع">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">رقم العميل *</label>
              <input className="input" dir="ltr" placeholder="01xxxxxxxxx" value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value, customerSubscriptionId: '' }))} />
            </div>
            <div>
              <label className="label">المبلغ *</label>
              <input type="number" className="input" min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
            </div>
          </div>
          {form.customerPhone && filteredSubs.length > 0 && (
            <div>
              <label className="label">الاشتراك المرتبط</label>
              <select className="input" value={form.customerSubscriptionId} onChange={e => setForm(f => ({ ...f, customerSubscriptionId: e.target.value }))}>
                <option value="">اختر الاشتراك...</option>
                {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.productName} — {s.durationLabel}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">سبب الاسترجاع *</label>
            <textarea className="input resize-none" rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <div>
            <label className="label">طريقة الاستلام</label>
            <select className="input" value={form.paymentMethodId} onChange={e => setForm(f => ({ ...f, paymentMethodId: e.target.value }))}>
              <option value="">اختر طريقة الاستلام...</option>
              {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">ملاحظات</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-700">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'جارٍ الإنشاء...' : 'إنشاء الطلب'}</button>
          </div>
        </form>
      </Modal>

      {/* Status Update Modal */}
      <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="تحديث حالة الطلب" size="sm">
        <div className="space-y-4">
          <p className="text-slate-300 text-sm">تحديث حالة طلب استرجاع <span className="font-bold">{editingRefund?.customerPhone}</span></p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setNewStatus('completed')}
              className={`py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
                ${newStatus === 'completed' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
            >
              <CheckCircle2 className="w-4 h-4" />مكتمل
            </button>
            <button
              type="button"
              onClick={() => setNewStatus('rejected')}
              className={`py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
                ${newStatus === 'rejected' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
            >
              <XCircle className="w-4 h-4" />مرفوض
            </button>
          </div>
          {newStatus === 'completed' && (
            <p className="text-yellow-400 text-xs bg-yellow-500/10 p-3 rounded-lg">
              سيتم خصم مبلغ {editingRefund?.amount} ج من الحسابات المالية تلقائيًا
            </p>
          )}
          <div className="flex gap-3 justify-end">
            <button onClick={() => setStatusModalOpen(false)} className="btn-secondary">إلغاء</button>
            <button onClick={handleStatusUpdate} disabled={submitting} className="btn-primary">{submitting ? 'جارٍ التحديث...' : 'تأكيد'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
