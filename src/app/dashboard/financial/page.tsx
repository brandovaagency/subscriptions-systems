'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import {
  getTransactions, getMonthlyStats, getAllTimeStats, addManualTransaction
} from '@/services/financial.service';
import { getActivePaymentMethods } from '@/services/payment-methods.service';
import { FinancialTransaction, PaymentMethod } from '@/types';
import Modal from '@/components/Modal';
import AccessDenied from '@/components/AccessDenied';
import { TableSkeleton } from '@/components/Skeleton';
import toast from 'react-hot-toast';
import { DollarSign, TrendingUp, TrendingDown, Plus, Filter, RefreshCw, ArrowUpRight, ArrowDownLeft, RotateCcw } from 'lucide-react';

const toDateStr = (d: Date | { toDate(): Date }) => {
  const date = d instanceof Date ? d : d.toDate();
  return format(date, 'dd/MM/yyyy HH:mm');
};

interface ManualForm {
  type: 'income' | 'expense';
  title: string;
  amount: number;
  paymentMethodId: string;
  notes: string;
  customerPhone: string;
}
const emptyForm: ManualForm = { type: 'income', title: '', amount: 0, paymentMethodId: '', notes: '', customerPhone: '' };

export default function FinancialPage() {
  const { appUser, isAdmin, hasPermission } = useAuth();
  const canView = isAdmin || hasPermission('view_financial_accounts');
  const canManage = isAdmin || hasPermission('manage_financial_accounts');

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({ income: 0, expenses: 0, refunds: 0 });
  const [allTimeStats, setAllTimeStats] = useState({ income: 0, expenses: 0, refunds: 0 });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ManualForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'refund'>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [txns, methods, monthly, allTime] = await Promise.all([
        getTransactions(typeFilter === 'all' ? undefined : { type: typeFilter }),
        getActivePaymentMethods(),
        getMonthlyStats(),
        getAllTimeStats(),
      ]);
      setTransactions(txns);
      setPaymentMethods(methods);
      setMonthlyStats(monthly);
      setAllTimeStats(allTime);
    } finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || form.amount <= 0) { toast.error('يرجى ملء الحقول المطلوبة'); return; }
    setSubmitting(true);
    try {
      await addManualTransaction({
        type: form.type,
        source: 'manual',
        title: form.title,
        amount: form.amount,
        paymentMethodId: form.paymentMethodId || undefined,
        notes: form.notes,
        customerPhone: form.customerPhone || undefined,
      }, appUser?.id || '');
      toast.success('تم تسجيل المعاملة المالية');
      setModalOpen(false);
      setForm(emptyForm);
      loadData();
    } catch { toast.error('حدث خطأ'); }
    finally { setSubmitting(false); }
  };

  const monthlyProfit = monthlyStats.income - monthlyStats.expenses - monthlyStats.refunds;
  const allTimeProfit = allTimeStats.income - allTimeStats.expenses - allTimeStats.refunds;

  const typeLabel = { income: 'دخل', expense: 'مصروف', refund: 'استرجاع' };
  const sourceLabel: Record<string, string> = { subscription: 'اشتراك', manual: 'يدوي', refund: 'استرجاع' };
  const typeColor = {
    income: 'text-green-400 bg-green-500/10',
    expense: 'text-red-400 bg-red-500/10',
    refund: 'text-purple-400 bg-purple-500/10',
  };
  const typeIcon = { income: ArrowUpRight, expense: ArrowDownLeft, refund: RotateCcw };

  if (!canView) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="section-header">
        <h1 className="section-title">الحسابات المالية</h1>
        {canManage && (
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            إضافة معاملة
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Monthly */}
        <div className="card col-span-2 lg:col-span-3">
          <h3 className="text-sm font-medium text-slate-400 mb-4">إحصائيات هذا الشهر</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'الدخل الكلي', value: allTimeStats.income, color: 'text-green-400' },
              { label: 'المصروفات الكلية', value: allTimeStats.expenses, color: 'text-red-400' },
              { label: 'صافي الربح الكلي', value: allTimeProfit, color: allTimeProfit >= 0 ? 'text-blue-400' : 'text-red-400' },
              { label: 'دخل الشهر', value: monthlyStats.income, color: 'text-green-400' },
              { label: 'مصروفات الشهر', value: monthlyStats.expenses, color: 'text-red-400' },
              { label: 'صافي الشهر', value: monthlyProfit, color: monthlyProfit >= 0 ? 'text-blue-400' : 'text-red-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
                <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                <p className={`text-lg font-bold font-mono ${stat.color}`}>
                  {stat.value.toLocaleString('ar-EG')} ج
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <div className="flex gap-2 flex-wrap">
          {(['all', 'income', 'expense', 'refund'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors
                ${typeFilter === t ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
            >
              {t === 'all' ? 'الكل' : typeLabel[t]}
            </button>
          ))}
        </div>
        <button onClick={loadData} className="btn-secondary mr-auto"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Transactions Table */}
      {loading ? <TableSkeleton rows={8} cols={6} /> : transactions.length === 0 ? (
        <div className="card empty-state">
          <DollarSign className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400">لا توجد معاملات مالية</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>النوع</th>
                <th>العنوان</th>
                <th>المبلغ</th>
                <th>المصدر</th>
                <th>العميل</th>
                <th>طريقة الدفع</th>
                <th>التاريخ</th>
                <th>المنشئ</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => {
                const Icon = typeIcon[tx.type];
                return (
                  <tr key={tx.id}>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${typeColor[tx.type]}`}>
                        <Icon className="w-3 h-3" />
                        {typeLabel[tx.type]}
                      </span>
                    </td>
                    <td className="font-medium text-slate-200">{tx.title}</td>
                    <td className={`font-mono font-medium ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('ar-EG')} ج
                    </td>
                    <td className="text-slate-400 text-xs">{sourceLabel[tx.source] || tx.source}</td>
                    <td className="font-mono text-sm text-slate-400">{tx.customerPhone || '—'}</td>
                    <td className="text-slate-400 text-sm">
                      {paymentMethods.find(p => p.id === tx.paymentMethodId)?.name || '—'}
                    </td>
                    <td className="text-slate-400 text-sm">{toDateStr(tx.createdAt)}</td>
                    <td className="text-slate-500 text-xs">{tx.createdBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Transaction Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="إضافة معاملة مالية">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">نوع المعاملة</label>
            <div className="grid grid-cols-2 gap-2">
              {(['income', 'expense'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${form.type === t
                      ? t === 'income' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                >
                  {t === 'income' ? '⬆ دخل' : '⬇ مصروف'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">العنوان *</label>
            <input className="input" placeholder="وصف المعاملة..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">المبلغ *</label>
              <input type="number" className="input" min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">رقم العميل</label>
              <input className="input" dir="ltr" placeholder="01xxxxxxxxx" value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} />
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
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'جارٍ الحفظ...' : 'تسجيل المعاملة'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
