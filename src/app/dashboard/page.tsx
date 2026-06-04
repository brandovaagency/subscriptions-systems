'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  getSubscriptions, getExpiringSubscriptions,
} from '@/services/subscriptions.service';
import { getMonthlyStats } from '@/services/financial.service';
import { getNotifications } from '@/services/notifications.service';
import { CustomerSubscription, Notification } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import {
  Users, Clock, DollarSign, TrendingUp, AlertTriangle,
  Bell, RefreshCw, Package, ArrowLeft, Loader2
} from 'lucide-react';

interface DashboardStats {
  activeSubscriptions: number;
  expiredSubscriptions: number;
  pendingOrders: number;
  expiringCount: number;
  monthlyIncome: number;
  monthlyProfit: number;
}

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeSubscriptions: 0, expiredSubscriptions: 0,
    pendingOrders: 0, expiringCount: 0,
    monthlyIncome: 0, monthlyProfit: 0,
  });
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<CustomerSubscription[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [allSubs, expiring, monthlyStats, notifications] = await Promise.all([
        getSubscriptions(),
        getExpiringSubscriptions(5),
        getMonthlyStats(),
        getNotifications(5),
      ]);

      const today = new Date();
      const activeCount = allSubs.filter(s => {
        const endDate = s.endDate instanceof Date ? s.endDate : (s.endDate as { toDate(): Date }).toDate();
        return endDate >= today;
      }).length;
      const expiredCount = allSubs.length - activeCount;
      const pendingCount = allSubs.filter(s => s.orderStatus === 'pending').length;

      setStats({
        activeSubscriptions: activeCount,
        expiredSubscriptions: expiredCount,
        pendingOrders: pendingCount,
        expiringCount: expiring.length,
        monthlyIncome: monthlyStats.income,
        monthlyProfit: monthlyStats.income - monthlyStats.expenses - monthlyStats.refunds,
      });
      setExpiringSubscriptions(expiring.slice(0, 5));
      setRecentNotifications(notifications);
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'اشتراكات فعالة',
      value: stats.activeSubscriptions,
      icon: Users,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      href: '/dashboard/subscriptions',
    },
    {
      label: 'اشتراكات منتهية',
      value: stats.expiredSubscriptions,
      icon: RefreshCw,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      href: '/dashboard/subscriptions',
    },
    {
      label: 'طلبات قيد التنفيذ',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      href: '/dashboard/pending',
    },
    {
      label: 'تنتهي قريبًا (5 أيام)',
      value: stats.expiringCount,
      icon: AlertTriangle,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      href: '/dashboard/subscriptions',
    },
  ];

  const financialCards = [
    {
      label: 'دخل هذا الشهر',
      value: `${stats.monthlyIncome.toLocaleString('ar-EG')} ج`,
      icon: DollarSign,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'صافي ربح الشهر',
      value: `${stats.monthlyProfit.toLocaleString('ar-EG')} ج`,
      icon: TrendingUp,
      color: stats.monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400',
      bg: stats.monthlyProfit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
    },
  ];

  const notifTypeLabel = {
    subscription_expiring: 'انتهاء اشتراك',
    pending_order: 'طلب جديد',
    customer_issue: 'مشكلة عميل',
    refund_request: 'طلب استرجاع',
  };

  const notifTypeColor = {
    subscription_expiring: 'bg-orange-500/10 text-orange-400',
    pending_order: 'bg-yellow-500/10 text-yellow-400',
    customer_issue: 'bg-red-500/10 text-red-400',
    refund_request: 'bg-purple-500/10 text-purple-400',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">لوحة التحكم</h1>
          <p className="text-slate-400 text-sm mt-1">
            {format(new Date(), "EEEE، d MMMM yyyy", { locale: ar })}
          </p>
        </div>
        <button onClick={loadDashboard} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="stat-card hover:border-slate-600 transition-colors cursor-pointer">
              <div className={`stat-icon ${card.bg}`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <div>
                <div className="stat-value">{card.value}</div>
                <div className="stat-label">{card.label}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Financial Cards */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {financialCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="stat-card">
                <div className={`stat-icon ${card.bg}`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-100 font-mono">{card.value}</div>
                  <div className="stat-label">{card.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Subscriptions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              تنتهي قريبًا
            </h2>
            <Link href="/dashboard/subscriptions" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1">
              عرض الكل <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          {expiringSubscriptions.length === 0 ? (
            <div className="empty-state py-8">
              <Package className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-slate-500 text-sm">لا توجد اشتراكات تنتهي قريبًا</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expiringSubscriptions.map((sub) => {
                const endDate = sub.endDate instanceof Date ? sub.endDate : (sub.endDate as { toDate(): Date }).toDate();
                const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{sub.customerPhone}</p>
                      <p className="text-xs text-slate-500">{sub.productName}</p>
                    </div>
                    <div className="text-left">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full
                        ${daysLeft <= 1 ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {daysLeft <= 0 ? 'اليوم' : `${daysLeft} أيام`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-100 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              آخر الإشعارات
            </h2>
            <Link href="/dashboard/notifications" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1">
              عرض الكل <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          {recentNotifications.length === 0 ? (
            <div className="empty-state py-8">
              <Bell className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-slate-500 text-sm">لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentNotifications.map((notif) => (
                <div key={notif.id} className={`flex items-start gap-3 p-3 rounded-lg border border-slate-700/50
                  ${notif.isRead ? 'bg-slate-900/30' : 'bg-slate-900/60'}`}>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5
                    ${notifTypeColor[notif.type]}`}>
                    {notifTypeLabel[notif.type]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-300 truncate">{notif.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {format(notif.createdAt instanceof Date ? notif.createdAt : (notif.createdAt as { toDate(): Date }).toDate(), 'dd/MM HH:mm')}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
