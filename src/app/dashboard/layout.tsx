'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { logoutUser } from '@/services/auth.service';
import { getUnreadCount } from '@/services/notifications.service';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Users, Clock, Package, Server,
  CreditCard, DollarSign, RotateCcw, Bell, LogOut,
  Menu, X, ChevronLeft, Loader2, Shield
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard, permission: null },
  { href: '/dashboard/subscriptions', label: 'اشتراكات العملاء', icon: Users, permission: 'add_subscription' },
  { href: '/dashboard/pending', label: 'الطلبات قيد التنفيذ', icon: Clock, permission: 'add_subscription' },
  { href: '/dashboard/products', label: 'منتجات الاشتراكات', icon: Package, permission: 'manage_products' },
  { href: '/dashboard/technical', label: 'الحسابات الفنية', icon: Server, permission: 'manage_technical_accounts' },
  { href: '/dashboard/payments', label: 'طرق الدفع', icon: CreditCard, permission: 'manage_payment_methods' },
  { href: '/dashboard/financial', label: 'الحسابات المالية', icon: DollarSign, permission: 'view_financial_accounts' },
  { href: '/dashboard/refunds', label: 'طلبات الاسترجاع', icon: RotateCcw, permission: 'add_subscription' },
  { href: '/dashboard/users', label: 'المستخدمين والصلاحيات', icon: Shield, permission: 'manage_users' },
  { href: '/dashboard/notifications', label: 'الإشعارات', icon: Bell, permission: 'view_notifications' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { appUser, loading, isAdmin, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!loading && !appUser) {
      router.replace('/login');
    }
  }, [appUser, loading, router]);

  useEffect(() => {
    if (appUser) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [appUser]);

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch {}
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast.success('تم تسجيل الخروج');
      router.replace('/login');
    } catch {
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    }
  };

  const isAllowed = (permission: string | null) => {
    if (!permission) return true;
    return isAdmin || hasPermission(permission as Parameters<typeof hasPermission>[0]);
  };

  const visibleItems = navItems.filter(item => isAllowed(item.permission));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!appUser) return null;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {sidebarOpen ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-sm">📱</div>
            <span className="font-bold text-slate-100 text-sm">إدارة الاشتراكات</span>
          </div>
        ) : (
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-sm mx-auto">📱</div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden lg:flex text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group
                ${isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
                }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {item.href === '/dashboard/notifications' && unreadCount > 0 && sidebarOpen && (
                <span className="mr-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-3 border-t border-slate-700">
        <div className={`flex items-center gap-3 ${sidebarOpen ? '' : 'justify-center'}`}>
          <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">
            {appUser.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-200 truncate">{appUser.username}</p>
              <p className="text-xs text-slate-500">{appUser.role === 'admin' ? 'مدير' : 'موظف'}</p>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 transition-colors p-1"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-slate-900 border-l border-slate-700 flex-shrink-0 sidebar-transition
          ${sidebarOpen ? 'w-60' : 'w-16'}`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative w-64 bg-slate-900 border-l border-slate-700 z-10">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className="bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden text-slate-400 hover:text-slate-200"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm hidden sm:block">{appUser.email}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${appUser.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-400'}`}>
              {appUser.role === 'admin' ? 'مدير' : 'موظف'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/notifications" className="relative text-slate-400 hover:text-slate-200 transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">خروج</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
