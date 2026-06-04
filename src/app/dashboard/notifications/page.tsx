'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { getNotifications, markAsRead, markAllAsRead } from '@/services/notifications.service';
import { Notification } from '@/types';
import AccessDenied from '@/components/AccessDenied';
import toast from 'react-hot-toast';
import { Bell, BellOff, Check, CheckCheck, Clock, AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';

const typeConfig = {
  subscription_expiring: { label: 'انتهاء اشتراك', icon: AlertTriangle, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  pending_order: { label: 'طلب جديد', icon: Clock, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  customer_issue: { label: 'مشكلة عميل', icon: Bell, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  refund_request: { label: 'طلب استرجاع', icon: RotateCcw, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
};

const toDate = (d: Date | { toDate(): Date }): Date => d instanceof Date ? d : d.toDate();

export default function NotificationsPage() {
  const { isAdmin, hasPermission } = useAuth();
  const canAccess = isAdmin || hasPermission('view_notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try { setNotifications(await getNotifications()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { toast.error('حدث خطأ'); }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('تم تعليم كل الإشعارات كمقروءة');
    } catch { toast.error('حدث خطأ'); }
    finally { setMarkingAll(false); }
  };

  if (!canAccess) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="section-header">
        <div>
          <h1 className="section-title flex items-center gap-2">
            الإشعارات
            {unreadCount > 0 && (
              <span className="text-sm font-normal bg-red-500 text-white px-2 py-0.5 rounded-full">
                {unreadCount} جديد
              </span>
            )}
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={loadNotifications} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} disabled={markingAll} className="btn-secondary">
              <CheckCheck className="w-4 h-4" />
              تعليم الكل كمقروء
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="card h-20 animate-pulse bg-slate-700/30" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card empty-state">
          <BellOff className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-300 font-medium">لا توجد إشعارات</p>
          <p className="text-slate-500 text-sm mt-1">ستظهر الإشعارات هنا عند وجودها</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => {
            const config = typeConfig[notif.type];
            const Icon = config.icon;
            const date = toDate(notif.createdAt);
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all
                  ${notif.isRead
                    ? 'bg-slate-800/50 border-slate-700/50 opacity-70'
                    : 'bg-slate-800 border-slate-600 shadow-sm'
                  }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${config.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${config.color}`}>{config.label}</span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        )}
                      </div>
                      <p className="text-slate-200 font-medium mt-1 text-sm">{notif.title}</p>
                      <p className="text-slate-400 text-sm mt-0.5">{notif.message}</p>
                    </div>
                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkRead(notif.id!)}
                        className="flex-shrink-0 text-slate-500 hover:text-green-400 transition-colors p-1 rounded-lg hover:bg-green-500/10"
                        title="تعليم كمقروء"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs mt-2">
                    {format(date, "EEEE، d MMMM yyyy — HH:mm", { locale: ar })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
