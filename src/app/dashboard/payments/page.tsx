'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getPaymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod, togglePaymentMethodStatus } from '@/services/payment-methods.service';
import { PaymentMethod } from '@/types';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import AccessDenied from '@/components/AccessDenied';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, CreditCard, CheckCircle2, XCircle } from 'lucide-react';

interface PMForm { name: string; paymentData: string; notes: string; isActive: boolean; }
const emptyForm: PMForm = { name: '', paymentData: '', notes: '', isActive: true };

export default function PaymentsPage() {
  const { isAdmin, hasPermission } = useAuth();
  const canManage = isAdmin || hasPermission('manage_payment_methods');
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState<PMForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadMethods = useCallback(async () => {
    setLoading(true);
    try { setMethods(await getPaymentMethods()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadMethods(); }, [loadMethods]);

  const openAdd = () => { setEditingMethod(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (m: PaymentMethod) => {
    setEditingMethod(m);
    setForm({ name: m.name, paymentData: m.paymentData, notes: m.notes || '', isActive: m.isActive });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error('يرجى إدخال اسم طريقة الدفع'); return; }
    setSubmitting(true);
    try {
      if (editingMethod) { await updatePaymentMethod(editingMethod.id!, form); toast.success('تم التحديث'); }
      else { await addPaymentMethod(form); toast.success('تمت الإضافة'); }
      setModalOpen(false); loadMethods();
    } catch { toast.error('حدث خطأ'); }
    finally { setSubmitting(false); }
  };

  const handleToggle = async (m: PaymentMethod) => {
    try { await togglePaymentMethodStatus(m.id!, !m.isActive); toast.success(m.isActive ? 'تم التعطيل' : 'تم التفعيل'); loadMethods(); }
    catch { toast.error('حدث خطأ'); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try { await deletePaymentMethod(deletingId); toast.success('تم الحذف'); setDeleteDialog(false); loadMethods(); }
    catch { toast.error('فشل الحذف'); } finally { setDeleteLoading(false); }
  };

  if (!canManage) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="section-header">
        <h1 className="section-title">طرق الدفع</h1>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" />إضافة طريقة دفع</button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card h-32 animate-pulse bg-slate-700/30" />)}
        </div>
      ) : methods.length === 0 ? (
        <div className="card empty-state">
          <CreditCard className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400">لا توجد طرق دفع</p>
          <button onClick={openAdd} className="btn-primary mt-4"><Plus className="w-4 h-4" />إضافة</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {methods.map(m => (
            <div key={m.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100 text-sm">{m.name}</h3>
                    {m.isActive ? (
                      <span className="badge-active text-xs"><CheckCircle2 className="w-2.5 h-2.5" />فعال</span>
                    ) : (
                      <span className="badge-inactive text-xs"><XCircle className="w-2.5 h-2.5" />معطل</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(m)} className="btn-ghost p-1"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setDeletingId(m.id!); setDeleteDialog(true); }} className="btn-danger p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {m.paymentData && (
                <div className="bg-slate-900/50 rounded-lg p-2.5 text-xs text-slate-400 font-mono break-all border border-slate-700/50">
                  {m.paymentData}
                </div>
              )}
              {m.notes && <p className="text-xs text-slate-500 mt-2">{m.notes}</p>}
              <button
                onClick={() => handleToggle(m)}
                className={`mt-3 text-xs w-full py-1.5 rounded-lg transition-colors
                  ${m.isActive ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
              >
                {m.isActive ? 'تعطيل' : 'تفعيل'}
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingMethod ? 'تعديل طريقة الدفع' : 'إضافة طريقة دفع'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">اسم طريقة الدفع *</label>
            <input className="input" placeholder="مثال: فوري / فيزا / Instapay" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">بيانات الدفع</label>
            <textarea className="input resize-none" rows={3} placeholder="رقم الحساب أو بيانات الاستلام..." value={form.paymentData} onChange={e => setForm(f => ({ ...f, paymentData: e.target.value }))} />
          </div>
          <div>
            <label className="label">ملاحظات</label>
            <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div>
            <label className="label">الحالة</label>
            <select className="input" value={form.isActive ? 'active' : 'inactive'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'active' }))}>
              <option value="active">فعال</option>
              <option value="inactive">معطل</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-700">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'جارٍ الحفظ...' : editingMethod ? 'حفظ' : 'إضافة'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={deleteDialog} onClose={() => setDeleteDialog(false)} onConfirm={handleDelete} message="هل أنت متأكد من حذف طريقة الدفع هذه؟" confirmLabel="حذف" loading={deleteLoading} />
    </div>
  );
}
