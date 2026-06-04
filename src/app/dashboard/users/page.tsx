'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getUsers, addUser, updateUser, updateUserPermissions, toggleUserStatus
} from '@/services/users.service';
import { AppUser, Permission, UserPermissions } from '@/types';
import Modal from '@/components/Modal';
import AccessDenied from '@/components/AccessDenied';
import { TableSkeleton } from '@/components/Skeleton';
import toast from 'react-hot-toast';
import { Plus, Pencil, UserX, UserCheck, Shield, CheckCircle2, XCircle } from 'lucide-react';

const PERMISSIONS: { key: Permission; label: string }[] = [
  { key: 'add_subscription', label: 'إضافة اشتراك' },
  { key: 'edit_subscription', label: 'تعديل اشتراك' },
  { key: 'delete_subscription', label: 'حذف اشتراك' },
  { key: 'manage_products', label: 'إدارة المنتجات' },
  { key: 'manage_technical_accounts', label: 'إدارة الحسابات الفنية' },
  { key: 'edit_technical_accounts', label: 'تعديل الحسابات الفنية' },
  { key: 'view_financial_accounts', label: 'عرض الحسابات المالية' },
  { key: 'manage_financial_accounts', label: 'إدارة الحسابات المالية' },
  { key: 'manage_payment_methods', label: 'إدارة طرق الدفع' },
  { key: 'manage_users', label: 'إدارة المستخدمين' },
  { key: 'view_notifications', label: 'عرض الإشعارات' },
];

interface UserForm {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'staff';
  isActive: boolean;
  permissions: Partial<Record<Permission, boolean>>;
}

const defaultPerms: Partial<Record<Permission, boolean>> = PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.key]: false }), {});

const emptyForm: UserForm = {
  username: '', email: '', password: '', role: 'staff', isActive: true, permissions: { ...defaultPerms }
};

export default function UsersPage() {
  const { isAdmin, hasPermission } = useAuth();
  const canManage = isAdmin || hasPermission('manage_users');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [permUser, setPermUser] = useState<AppUser | null>(null);
  const [tempPerms, setTempPerms] = useState<Partial<Record<Permission, boolean>>>({});

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try { setUsers(await getUsers()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const openAdd = () => { setEditingUser(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (user: AppUser) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
      permissions: { ...defaultPerms, ...user.permissions },
    });
    setModalOpen(true);
  };

  const openPermissions = (user: AppUser) => {
    setPermUser(user);
    setTempPerms({ ...defaultPerms, ...user.permissions });
    setPermModalOpen(true);
  };

  const togglePerm = (key: Permission) => {
    setTempPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.email) { toast.error('يرجى ملء الحقول المطلوبة'); return; }
    if (!editingUser && !form.password) { toast.error('يرجى إدخال كلمة المرور'); return; }
    setSubmitting(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.id!, { username: form.username, role: form.role, isActive: form.isActive, permissions: form.permissions as UserPermissions });
        toast.success('تم تحديث المستخدم');
      } else {
        await addUser(form.email, form.password, form.username, form.role, form.permissions as UserPermissions, form.isActive);
        toast.success('تم إضافة المستخدم');
      }
      setModalOpen(false);
      loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally { setSubmitting(false); }
  };

  const handleSavePerms = async () => {
    if (!permUser?.id) return;
    setSubmitting(true);
    try {
      await updateUserPermissions(permUser.id, tempPerms as UserPermissions);
      toast.success('تم حفظ الصلاحيات');
      setPermModalOpen(false);
      loadUsers();
    } catch { toast.error('حدث خطأ'); }
    finally { setSubmitting(false); }
  };

  const handleToggleStatus = async (user: AppUser) => {
    try {
      await toggleUserStatus(user.id!, !user.isActive);
      toast.success(user.isActive ? 'تم تعطيل المستخدم' : 'تم تفعيل المستخدم');
      loadUsers();
    } catch { toast.error('حدث خطأ'); }
  };

  if (!canManage) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="section-header">
        <h1 className="section-title">المستخدمين والصلاحيات</h1>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" />إضافة مستخدم</button>
      </div>

      {loading ? <TableSkeleton rows={4} cols={6} /> : users.length === 0 ? (
        <div className="card empty-state">
          <Shield className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400">لا يوجد مستخدمون</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>اسم المستخدم</th>
                <th>البريد الإلكتروني</th>
                <th>الدور</th>
                <th>الحالة</th>
                <th>الصلاحيات</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const permCount = Object.values(user.permissions || {}).filter(Boolean).length;
                return (
                  <tr key={user.id}>
                    <td className="font-medium text-slate-100">{user.username}</td>
                    <td dir="ltr" className="text-left font-mono text-sm text-slate-400">{user.email}</td>
                    <td>
                      <span className={`text-xs px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-400'}`}>
                        {user.role === 'admin' ? 'مدير' : 'موظف'}
                      </span>
                    </td>
                    <td>
                      {user.isActive ? (
                        <span className="badge-active"><CheckCircle2 className="w-3 h-3" />فعال</span>
                      ) : (
                        <span className="badge-inactive"><XCircle className="w-3 h-3" />معطل</span>
                      )}
                    </td>
                    <td>
                      {user.role === 'admin' ? (
                        <span className="text-xs text-indigo-400">كل الصلاحيات</span>
                      ) : (
                        <button
                          onClick={() => openPermissions(user)}
                          className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                        >
                          {permCount} / {PERMISSIONS.length} صلاحية
                        </button>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(user)} className="btn-ghost"><Pencil className="w-3.5 h-3.5" /></button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors
                            ${user.isActive ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
                        >
                          {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          {user.isActive ? 'تعطيل' : 'تفعيل'}
                        </button>
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">اسم المستخدم *</label>
              <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <label className="label">الدور</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'staff' }))}>
                <option value="staff">موظف</option>
                <option value="admin">مدير</option>
              </select>
            </div>
          </div>
          {!editingUser && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">البريد الإلكتروني *</label>
                <input className="input" type="email" dir="ltr" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">كلمة المرور *</label>
                <input className="input" type="password" dir="ltr" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
            </div>
          )}
          <div>
            <label className="label">الحالة</label>
            <select className="input" value={form.isActive ? 'active' : 'inactive'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'active' }))}>
              <option value="active">فعال</option>
              <option value="inactive">معطل</option>
            </select>
          </div>
          {form.role === 'staff' && (
            <div>
              <label className="label mb-2">الصلاحيات</label>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSIONS.map(p => (
                  <label key={p.key} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={!!form.permissions[p.key]}
                      onChange={() => setForm(f => ({ ...f, permissions: { ...f.permissions, [p.key]: !f.permissions[p.key] } }))}
                      className="w-4 h-4 accent-indigo-500"
                    />
                    <span className="text-sm text-slate-300 group-hover:text-slate-100">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-700">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'جارٍ الحفظ...' : editingUser ? 'حفظ' : 'إضافة'}</button>
          </div>
        </form>
      </Modal>

      {/* Permissions Modal */}
      <Modal isOpen={permModalOpen} onClose={() => setPermModalOpen(false)} title={`صلاحيات: ${permUser?.username}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setTempPerms(PERMISSIONS.reduce((a, p) => ({ ...a, [p.key]: true }), {}))} className="text-xs text-indigo-400 hover:text-indigo-300">تحديد الكل</button>
            <button onClick={() => setTempPerms({ ...defaultPerms })} className="text-xs text-red-400 hover:text-red-300">إلغاء الكل</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PERMISSIONS.map(p => (
              <label key={p.key} className="flex items-center gap-3 p-2.5 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors border border-slate-700/50">
                <input
                  type="checkbox"
                  checked={!!tempPerms[p.key]}
                  onChange={() => togglePerm(p.key)}
                  className="w-4 h-4 accent-indigo-500"
                />
                <span className="text-sm text-slate-300">{p.label}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-700">
            <button onClick={() => setPermModalOpen(false)} className="btn-secondary">إلغاء</button>
            <button onClick={handleSavePerms} disabled={submitting} className="btn-primary">{submitting ? 'جارٍ الحفظ...' : 'حفظ الصلاحيات'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
