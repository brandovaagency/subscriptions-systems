'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getProducts, addProduct, updateProduct,
  deleteProduct, toggleProductStatus
} from '@/services/products.service';
import { SubscriptionProduct, SubscriptionDuration } from '@/types';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import AccessDenied from '@/components/AccessDenied';
import { TableSkeleton } from '@/components/Skeleton';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, Package, RefreshCw,
  CheckCircle2, XCircle, PlusCircle, MinusCircle
} from 'lucide-react';

interface ProductForm {
  name: string;
  description: string;
  isActive: boolean;
  durations: SubscriptionDuration[];
}

const emptyForm: ProductForm = {
  name: '', description: '', isActive: true,
  durations: [{ label: '', months: 1, price: 0 }],
};

export default function ProductsPage() {
  const { isAdmin, hasPermission } = useAuth();
  const canManage = isAdmin || hasPermission('manage_products');
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SubscriptionProduct | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try { setProducts(await getProducts()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const openAdd = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (product: SubscriptionProduct) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || '',
      isActive: product.isActive,
      durations: [...product.durations],
    });
    setModalOpen(true);
  };

  const addDuration = () => {
    setForm(f => ({ ...f, durations: [...f.durations, { label: '', months: 1, price: 0 }] }));
  };

  const removeDuration = (index: number) => {
    setForm(f => ({ ...f, durations: f.durations.filter((_, i) => i !== index) }));
  };

  const updateDuration = (index: number, field: keyof SubscriptionDuration, value: string | number) => {
    setForm(f => ({
      ...f,
      durations: f.durations.map((d, i) => i === index ? { ...d, [field]: value } : d),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('يرجى إدخال اسم المنتج'); return; }
    if (form.durations.some(d => !d.label || d.months < 1 || d.price < 0)) {
      toast.error('يرجى ملء بيانات الباقات بشكل صحيح');
      return;
    }
    setSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id!, { name: form.name, description: form.description, isActive: form.isActive, durations: form.durations });
        toast.success('تم تحديث المنتج');
      } else {
        await addProduct({ name: form.name, description: form.description, isActive: form.isActive, durations: form.durations });
        toast.success('تم إضافة المنتج');
      }
      setModalOpen(false);
      loadProducts();
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (product: SubscriptionProduct) => {
    try {
      await toggleProductStatus(product.id!, !product.isActive);
      toast.success(product.isActive ? 'تم تعطيل المنتج' : 'تم تفعيل المنتج');
      loadProducts();
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await deleteProduct(deletingId);
      toast.success('تم حذف المنتج');
      setDeleteDialog(false);
      loadProducts();
    } catch {
      toast.error('فشل الحذف');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!canManage) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="section-header">
        <h1 className="section-title">منتجات الاشتراكات</h1>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" />
          إضافة منتج
        </button>
      </div>

      {loading ? <TableSkeleton rows={4} cols={5} /> : products.length === 0 ? (
        <div className="card empty-state">
          <Package className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400">لا توجد منتجات</p>
          <button onClick={openAdd} className="btn-primary mt-4"><Plus className="w-4 h-4" />إضافة منتج</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {products.map(product => (
            <div key={product.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-100">{product.name}</h3>
                      {product.isActive ? (
                        <span className="badge-active"><CheckCircle2 className="w-3 h-3" />فعال</span>
                      ) : (
                        <span className="badge-inactive"><XCircle className="w-3 h-3" />معطل</span>
                      )}
                    </div>
                    {product.description && (
                      <p className="text-sm text-slate-400 mt-0.5">{product.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(product)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors
                      ${product.isActive ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
                  >
                    {product.isActive ? 'تعطيل' : 'تفعيل'}
                  </button>
                  <button onClick={() => openEdit(product)} className="btn-ghost">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setDeletingId(product.id!); setDeleteDialog(true); }}
                    className="btn-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Durations */}
              <div className="mt-4 flex flex-wrap gap-2">
                {product.durations.map((d, i) => (
                  <div key={i} className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                    <span className="text-slate-300 font-medium">{d.label}</span>
                    <span className="text-slate-500 mx-1">·</span>
                    <span className="text-indigo-400 font-mono">{d.price} ج</span>
                    <span className="text-slate-500 mx-1">·</span>
                    <span className="text-slate-500">{d.months} شهر</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">اسم المنتج *</label>
              <input
                className="input"
                placeholder="مثال: Netflix"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">الحالة</label>
              <select
                className="input"
                value={form.isActive ? 'active' : 'inactive'}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'active' }))}
              >
                <option value="active">فعال</option>
                <option value="inactive">معطل</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">الوصف</label>
            <input
              className="input"
              placeholder="وصف اختياري للمنتج..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Durations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">باقات الاشتراك</label>
              <button type="button" onClick={addDuration} className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                <PlusCircle className="w-4 h-4" />
                إضافة باقة
              </button>
            </div>
            <div className="space-y-3">
              {form.durations.map((d, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <div>
                      <input
                        className="input text-sm py-1.5"
                        placeholder="اسم المدة"
                        value={d.label}
                        onChange={e => updateDuration(i, 'label', e.target.value)}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        className="input text-sm py-1.5"
                        placeholder="عدد الشهور"
                        min={1}
                        value={d.months}
                        onChange={e => updateDuration(i, 'months', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        className="input text-sm py-1.5"
                        placeholder="السعر (ج)"
                        min={0}
                        value={d.price}
                        onChange={e => updateDuration(i, 'price', Number(e.target.value))}
                      />
                    </div>
                  </div>
                  {form.durations.length > 1 && (
                    <button type="button" onClick={() => removeDuration(i)} className="text-red-400 hover:text-red-300 flex-shrink-0">
                      <MinusCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-700">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'جارٍ الحفظ...' : editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDelete}
        message="هل أنت متأكد من حذف هذا المنتج؟"
        confirmLabel="حذف"
        loading={deleteLoading}
      />
    </div>
  );
}
