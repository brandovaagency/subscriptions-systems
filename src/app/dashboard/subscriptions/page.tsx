'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import {
  getSubscriptions, addSubscription, updateSubscription,
  deleteSubscription, extendSubscription
} from '@/services/subscriptions.service';
import { getActiveProducts } from '@/services/products.service';
import { getActiveTechnicalAccountsByType } from '@/services/technical-accounts.service';
import { CustomerSubscription, SubscriptionProduct, TechnicalAccount } from '@/types';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import AccessDenied from '@/components/AccessDenied';
import { TableSkeleton } from '@/components/Skeleton';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, Clock, Search, RefreshCw,
  CheckCircle2, XCircle, CalendarDays
} from 'lucide-react';

const getSubscriptionStatus = (endDate: Date | { toDate(): Date }): 'active' | 'expired' => {
  const date = endDate instanceof Date ? endDate : endDate.toDate();
  return date >= new Date() ? 'active' : 'expired';
};

const toDateStr = (d: Date | { toDate(): Date }): string => {
  const date = d instanceof Date ? d : d.toDate();
  return format(date, 'dd/MM/yyyy');
};

interface SubFormData {
  customerPhone: string;
  productId: string;
  durationLabel: string;
  durationMonths: number;
  price: number;
  startDate: string;
  technicalAccountId: string;
  technicalAccountEmail: string;
  orderStatus: 'pending' | 'completed';
  notes: string;
}

const emptyForm: SubFormData = {
  customerPhone: '', productId: '', durationLabel: '', durationMonths: 0,
  price: 0, startDate: format(new Date(), 'yyyy-MM-dd'),
  technicalAccountId: '', technicalAccountEmail: '', orderStatus: 'pending', notes: '',
};

export default function SubscriptionsPage() {
  const { appUser, isAdmin, hasPermission } = useAuth();
  const canAdd = isAdmin || hasPermission('add_subscription');
  const canEdit = isAdmin || hasPermission('edit_subscription');
  const canDelete = isAdmin || hasPermission('delete_subscription');

  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [techAccounts, setTechAccounts] = useState<TechnicalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<CustomerSubscription | null>(null);
  const [form, setForm] = useState<SubFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [extendModal, setExtendModal] = useState(false);
  const [extendingSub, setExtendingSub] = useState<CustomerSubscription | null>(null);
  const [extendMonths, setExtendMonths] = useState(1);

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, prods] = await Promise.all([getSubscriptions(), getActiveProducts()]);
      setSubscriptions(subs);
      setProducts(prods);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleProductChange = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    setForm(f => ({ ...f, productId, durationLabel: '', durationMonths: 0, price: 0, technicalAccountId: '', technicalAccountEmail: '' }));
    if (product) {
      const accounts = await getActiveTechnicalAccountsByType(product.name);
      setTechAccounts(accounts);
    }
  };

  const handleDurationChange = (label: string) => {
    const product = products.find(p => p.id === form.productId);
    const duration = product?.durations.find(d => d.label === label);
    if (duration) {
      const startDate = new Date(form.startDate);
      startDate.setMonth(startDate.getMonth() + duration.months);
      setForm(f => ({ ...f, durationLabel: label, durationMonths: duration.months, price: duration.price }));
    }
  };

  const getEndDate = (): string => {
    if (!form.startDate || !form.durationMonths) return '';
    const d = new Date(form.startDate);
    d.setMonth(d.getMonth() + form.durationMonths);
    return format(d, 'dd/MM/yyyy');
  };

  const openAdd = () => {
    setEditingSub(null);
    setForm(emptyForm);
    setTechAccounts([]);
    setModalOpen(true);
  };

  const openEdit = async (sub: CustomerSubscription) => {
    setEditingSub(sub);
    if (sub.productId) {
      const accounts = await getActiveTechnicalAccountsByType(sub.productName);
      setTechAccounts(accounts);
    }
    const startDate = sub.startDate instanceof Date ? sub.startDate : (sub.startDate as { toDate(): Date }).toDate();
    setForm({
      customerPhone: sub.customerPhone,
      productId: sub.productId,
      durationLabel: sub.durationLabel,
      durationMonths: sub.durationMonths,
      price: sub.price,
      startDate: format(startDate, 'yyyy-MM-dd'),
      technicalAccountId: sub.technicalAccountId || '',
      technicalAccountEmail: sub.technicalAccountEmail || '',
      orderStatus: sub.orderStatus,
      notes: sub.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerPhone || !form.productId || !form.durationLabel) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }
    setSubmitting(true);
    try {
      const product = products.find(p => p.id === form.productId)!;
      const techAccount = techAccounts.find(t => t.id === form.technicalAccountId);
      const startDate = new Date(form.startDate);
      const endDate = new Date(form.startDate);
      endDate.setMonth(endDate.getMonth() + form.durationMonths);

      const form2: import('@/types').CustomerSubscriptionForm = {
        customerPhone: form.customerPhone,
        productId: form.productId,
        durationLabel: form.durationLabel,
        startDate: form.startDate,
        technicalAccountId: form.technicalAccountId || '',
        orderStatus: form.orderStatus,
        notes: form.notes,
      };

      if (editingSub) {
        const data = {
          customerPhone: form.customerPhone,
          productId: form.productId,
          productName: product.name,
          durationLabel: form.durationLabel,
          durationMonths: form.durationMonths,
          startDate,
          endDate,
          price: form.price,
          technicalAccountId: form.technicalAccountId || '',
          technicalAccountEmail: techAccount?.email || form.technicalAccountEmail || '',
          orderStatus: form.orderStatus,
          notes: form.notes,
          createdBy: appUser?.id || '',
        };
        await updateSubscription(editingSub.id!, data);
        toast.success('تم تحديث الاشتراك بنجاح');
      } else {
        await addSubscription(
          form2,
          { name: product.name },
          { label: form.durationLabel, months: form.durationMonths, price: form.price },
          techAccount?.email || form.technicalAccountEmail || '',
          appUser?.id || ''
        );
        toast.success('تم إضافة الاشتراك بنجاح');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('حدث خطأ، يرجى المحاولة مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await deleteSubscription(deletingId);
      toast.success('تم حذف الاشتراك');
      setDeleteDialog(false);
      loadData();
    } catch {
      toast.error('فشل الحذف');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExtend = async () => {
    if (!extendingSub?.id) return;
    setSubmitting(true);
    try {
      await extendSubscription(extendingSub.id, extendMonths);
      toast.success('تم تمديد الاشتراك');
      setExtendModal(false);
      loadData();
    } catch {
      toast.error('فشل تمديد الاشتراك');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = subscriptions.filter(s => {
    const matchSearch = !search || s.customerPhone.includes(search) || s.productName.includes(search);
    const status = getSubscriptionStatus(s.endDate);
    const matchStatus = statusFilter === 'all' || status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (!canAdd && !canEdit && !canDelete) return <AccessDenied />;

  const selectedProduct = products.find(p => p.id === form.productId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="section-header">
        <h1 className="section-title">اشتراكات العملاء</h1>
        {canAdd && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" />
            إضافة اشتراك
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pr-10"
            placeholder="بحث برقم العميل أو اسم المنتج..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-full sm:w-48"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="all">كل الاشتراكات</option>
          <option value="active">فعالة</option>
          <option value="expired">منتهية</option>
        </select>
        <button onClick={loadData} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <CalendarDays className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400">لا توجد اشتراكات</p>
          {canAdd && <button onClick={openAdd} className="btn-primary mt-4"><Plus className="w-4 h-4" />إضافة اشتراك</button>}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>رقم العميل</th>
                <th>المنتج</th>
                <th>المدة</th>
                <th>البداية</th>
                <th>النهاية</th>
                <th>السعر</th>
                <th>الحساب الفني</th>
                <th>حالة الاشتراك</th>
                <th>حالة الطلب</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sub => {
                const status = getSubscriptionStatus(sub.endDate);
                return (
                  <tr key={sub.id}>
                    <td className="font-mono text-sm">{sub.customerPhone}</td>
                    <td>{sub.productName}</td>
                    <td>{sub.durationLabel}</td>
                    <td className="text-slate-400 text-sm">{toDateStr(sub.startDate)}</td>
                    <td className="text-slate-400 text-sm">{toDateStr(sub.endDate)}</td>
                    <td className="font-mono">{sub.price} ج</td>
                    <td className="text-slate-400 text-sm">{sub.technicalAccountEmail || '—'}</td>
                    <td>
                      {status === 'active' ? (
                        <span className="badge-active"><CheckCircle2 className="w-3 h-3" />فعال</span>
                      ) : (
                        <span className="badge-inactive"><XCircle className="w-3 h-3" />منتهي</span>
                      )}
                    </td>
                    <td>
                      {sub.orderStatus === 'pending' ? (
                        <span className="badge-pending"><Clock className="w-3 h-3" />قيد التنفيذ</span>
                      ) : (
                        <span className="badge-completed"><CheckCircle2 className="w-3 h-3" />مكتمل</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => openEdit(sub)}
                              className="btn-ghost text-xs"
                              title="تعديل"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { setExtendingSub(sub); setExtendMonths(1); setExtendModal(true); }}
                              className="btn-ghost text-xs text-indigo-400"
                              title="تمديد"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => { setDeletingId(sub.id!); setDeleteDialog(true); }}
                            className="btn-danger"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingSub ? 'تعديل الاشتراك' : 'إضافة اشتراك جديد'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">رقم العميل *</label>
              <input
                className="input"
                placeholder="01xxxxxxxxx"
                value={form.customerPhone}
                onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                dir="ltr"
              />
            </div>
            <div>
              <label className="label">نوع الاشتراك *</label>
              <select
                className="input"
                value={form.productId}
                onChange={e => handleProductChange(e.target.value)}
              >
                <option value="">اختر المنتج...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">مدة الاشتراك *</label>
              <select
                className="input"
                value={form.durationLabel}
                onChange={e => handleDurationChange(e.target.value)}
                disabled={!form.productId}
              >
                <option value="">اختر المدة...</option>
                {selectedProduct?.durations.map(d => (
                  <option key={d.label} value={d.label}>{d.label} — {d.price} ج</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">تاريخ البداية</label>
              <input
                type="date"
                className="input"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                dir="ltr"
              />
            </div>
            <div>
              <label className="label">تاريخ النهاية (تلقائي)</label>
              <input
                className="input bg-slate-900/50 cursor-not-allowed"
                value={getEndDate()}
                readOnly
                dir="ltr"
              />
            </div>
            <div>
              <label className="label">التكلفة (تلقائي)</label>
              <input
                className="input bg-slate-900/50 cursor-not-allowed"
                value={form.price ? `${form.price} ج` : ''}
                readOnly
              />
            </div>
            <div>
              <label className="label">الحساب الفني</label>
              <select
                className="input"
                value={form.technicalAccountId}
                onChange={e => {
                  const acc = techAccounts.find(t => t.id === e.target.value);
                  setForm(f => ({ ...f, technicalAccountId: e.target.value, technicalAccountEmail: acc?.email || '' }));
                }}
                disabled={!form.productId}
              >
                <option value="">اختر الحساب الفني...</option>
                {techAccounts.map(t => (
                  <option key={t.id} value={t.id}>{t.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">حالة الطلب</label>
              <select
                className="input"
                value={form.orderStatus}
                onChange={e => setForm(f => ({ ...f, orderStatus: e.target.value as 'pending' | 'completed' }))}
              >
                <option value="pending">قيد التنفيذ</option>
                <option value="completed">مكتمل</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">ملاحظات</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="ملاحظات إضافية..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-700">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'جارٍ الحفظ...' : editingSub ? 'حفظ التعديلات' : 'إضافة الاشتراك'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Extend Modal */}
      <Modal isOpen={extendModal} onClose={() => setExtendModal(false)} title="تمديد الاشتراك" size="sm">
        <div className="space-y-4">
          <p className="text-slate-300 text-sm">
            تمديد اشتراك العميل: <span className="font-bold text-slate-100">{extendingSub?.customerPhone}</span>
          </p>
          <div>
            <label className="label">عدد الأشهر</label>
            <input
              type="number"
              className="input"
              min={1}
              max={24}
              value={extendMonths}
              onChange={e => setExtendMonths(Number(e.target.value))}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setExtendModal(false)} className="btn-secondary">إلغاء</button>
            <button onClick={handleExtend} disabled={submitting} className="btn-primary">تمديد</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDelete}
        message="هل أنت متأكد من حذف هذا الاشتراك؟ لا يمكن التراجع عن هذه العملية."
        confirmLabel="حذف"
        loading={deleteLoading}
      />
    </div>
  );
}