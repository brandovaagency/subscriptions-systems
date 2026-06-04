'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getTechnicalAccounts, addTechnicalAccount,
  updateTechnicalAccount, deleteTechnicalAccount
} from '@/services/technical-accounts.service';
import { getActivePaymentMethods } from '@/services/payment-methods.service';
import { TechnicalAccount, PaymentMethod } from '@/types';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import AccessDenied from '@/components/AccessDenied';
import { TableSkeleton } from '@/components/Skeleton';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Server, Eye, EyeOff, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

interface TechForm {
  accountType: string;
  email: string;
  password: string;
  paymentMethodId: string;
  notes: string;
  status: 'active' | 'inactive';
}

const emptyForm: TechForm = { accountType: '', email: '', password: '', paymentMethodId: '', notes: '', status: 'active' };

export default function TechnicalPage() {
  const { isAdmin, hasPermission } = useAuth();
  const canManage = isAdmin || hasPermission('manage_technical_accounts');
  const canEdit = isAdmin || hasPermission('edit_technical_accounts');

  const [accounts, setAccounts] = useState<TechnicalAccount[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TechnicalAccount | null>(null);
  const [form, setForm] = useState<TechForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, methods] = await Promise.all([getTechnicalAccounts(), getActivePaymentMethods()]);
      setAccounts(accs);
      setPaymentMethods(methods);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => { setEditingAccount(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (acc: TechnicalAccount) => {
    setEditingAccount(acc);
    setForm({ accountType: acc.accountType, email: acc.email, password: acc.password, paymentMethodId: acc.paymentMethodId || '', notes: acc.notes || '', status: acc.status });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountType || !form.email || !form.password) { toast.error('يرجى ملء الحقول المطلوبة'); return; }
    setSubmitting(true);
    try {
      if (editingAccount) {
        await updateTechnicalAccount(editingAccount.id!, form);
        toast.success('تم تحديث الحساب الفني');
      } else {
        await addTechnicalAccount(form);
        toast.success('تم إضافة الحساب الفني');
      }
      setModalOpen(false);
      loadData();
    } catch { toast.error('حدث خطأ أثناء الحفظ'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await deleteTechnicalAccount(deletingId);
      toast.success('تم حذف الحساب');
      setDeleteDialog(false);
      loadData();
    } catch { toast.error('فشل الحذف'); }
    finally { setDeleteLoading(false); }
  };

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!canManage && !canEdit) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="section-header">
        <h1 className="section-title">الحسابات الفنية</h1>
        {canManage && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" />
            إضافة حساب
          </button>
        )}
      </div>

      {loading ? <TableSkeleton rows={5} cols={6} /> : accounts.length === 0 ? (
        <div className="card empty-state">
          <Server className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400">لا توجد حسابات فنية</p>
          {canManage && <button onClick={openAdd} className="btn-primary mt-4"><Plus className="w-4 h-4" />إضافة حساب</button>}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>نوع الحساب</th>
                <th>البريد الإلكتروني</th>
                <th>كلمة المرور</th>
                <th>طريقة الدفع</th>
                <th>الحالة</th>
                <th>ملاحظات</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc.id}>
                  <td className="font-medium">{acc.accountType}</td>
                  <td dir="ltr" className="text-left font-mono text-sm text-slate-300">{acc.email}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span dir="ltr" className="font-mono text-sm">
                        {visiblePasswords.has(acc.id!) ? acc.password : '••••••••'}
                      </span>
                      <button
                        onClick={() => togglePassword(acc.id!)}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {visiblePasswords.has(acc.id!) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="text-slate-400 text-sm">
                    {paymentMethods.find(p => p.id === acc.paymentMethodId)?.name || '—'}
                  </td>
                  <td>
                    {acc.status === 'active' ? (
                      <span className="badge-active"><CheckCircle2 className="w-3 h-3" />فعال</span>
                    ) : (
                      <span className="badge-inactive"><XCircle className="w-3 h-3" />معطل</span>
                    )}
                  </td>
                  <td className="text-slate-400 text-sm max-w-32 truncate">{acc.notes || '—'}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button onClick={() => openEdit(acc)} className="btn-ghost">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canManage && (
                        <button onClick={() => { setDeletingId(acc.id!); setDeleteDialog(true); }} className="btn-danger">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingAccount ? 'تعديل الحساب الفني' : 'إضافة حساب فني'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نوع الحساب *</label>
              <input className="input" placeholder="مثال: Netflix" value={form.accountType} onChange={e => setForm(f => ({ ...f, accountType: e.target.value }))} />
            </div>
            <div>
              <label className="label">الحالة</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}>
                <option value="active">فعال</option>
                <option value="inactive">معطل</option>
              </select>
            </div>
            <div>
              <label className="label">البريد الإلكتروني *</label>
              <input className="input" type="email" dir="ltr" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">كلمة المرور *</label>
              <input className="input" dir="ltr" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">طريقة الدفع</label>
            <select className="input" value={form.paymentMethodId} onChange={e => setForm(f => ({ ...f, paymentMethodId: e.target.value }))}>
              <option value="">اختر طريقة الدفع...</option>
              {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">ملاحظات</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-700">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'جارٍ الحفظ...' : editingAccount ? 'حفظ' : 'إضافة'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={deleteDialog} onClose={() => setDeleteDialog(false)} onConfirm={handleDelete} message="هل أنت متأكد من حذف هذا الحساب الفني؟" confirmLabel="حذف" loading={deleteLoading} />
    </div>
  );
}
