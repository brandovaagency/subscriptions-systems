// ===========================
// USER & AUTH TYPES
// ===========================

export type UserRole = 'admin' | 'staff';

export type Permission =
  | 'add_subscription'
  | 'edit_subscription'
  | 'delete_subscription'
  | 'manage_products'
  | 'manage_technical_accounts'
  | 'edit_technical_accounts'
  | 'view_financial_accounts'
  | 'manage_financial_accounts'
  | 'manage_payment_methods'
  | 'manage_users'
  | 'view_notifications';

export interface UserPermissions {
  add_subscription: boolean;
  edit_subscription: boolean;
  delete_subscription: boolean;
  manage_products: boolean;
  manage_technical_accounts: boolean;
  edit_technical_accounts: boolean;
  view_financial_accounts: boolean;
  manage_financial_accounts: boolean;
  manage_payment_methods: boolean;
  manage_users: boolean;
  view_notifications: boolean;
}

export interface AppUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: UserPermissions;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================
// SUBSCRIPTION PRODUCTS
// ===========================

export interface SubscriptionDuration {
  label: string; // e.g. شهر / 3 شهور / سنة
  months: number;
  price: number;
}

export interface SubscriptionProduct {
  id: string;
  name: string;
  description?: string;
  durations: SubscriptionDuration[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================
// TECHNICAL ACCOUNTS
// ===========================

export type TechnicalAccountStatus = 'active' | 'inactive';

export interface TechnicalAccount {
  id: string;
  accountType: string; // e.g. Netflix, Spotify
  email: string;
  password: string;
  paymentMethodId: string;
  paymentMethodName?: string;
  notes?: string;
  status: TechnicalAccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================
// PAYMENT METHODS
// ===========================

export interface PaymentMethod {
  id: string;
  name: string;
  paymentData: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================
// CUSTOMER SUBSCRIPTIONS
// ===========================

export type SubscriptionStatus = 'active' | 'expired';
export type OrderStatus = 'pending' | 'completed';

export interface CustomerSubscription {
  id: string;
  customerPhone: string;
  productId: string;
  productName: string;
  durationLabel: string;
  durationMonths: number;
  startDate: Date;
  endDate: Date;
  price: number;
  technicalAccountId?: string;
  technicalAccountEmail?: string;
  subscriptionStatus: SubscriptionStatus;
  orderStatus: OrderStatus;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================
// FINANCIAL TRANSACTIONS
// ===========================

export type TransactionType = 'income' | 'expense' | 'refund';
export type TransactionSource = 'subscription' | 'manual' | 'refund';

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  source: TransactionSource;
  amount: number;
  customerSubscriptionId?: string;
  customerPhone?: string;
  paymentMethodId?: string;
  paymentMethodName?: string;
  title: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

// ===========================
// REFUND REQUESTS
// ===========================

export type RefundStatus = 'pending' | 'completed' | 'rejected';

export interface RefundRequest {
  id: string;
  customerPhone: string;
  customerSubscriptionId: string;
  reason: string;
  paymentMethodId: string;
  paymentMethodName?: string;
  amount: number;
  status: RefundStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================
// NOTIFICATIONS
// ===========================

export type NotificationType =
  | 'subscription_expiring'
  | 'pending_order'
  | 'customer_issue'
  | 'refund_request';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: Date;
}

// ===========================
// FORM TYPES
// ===========================

export interface SubscriptionProductForm {
  name: string;
  description: string;
  isActive: boolean;
  durations: SubscriptionDuration[];
}

export interface TechnicalAccountForm {
  accountType: string;
  email: string;
  password: string;
  paymentMethodId: string;
  notes: string;
  status: TechnicalAccountStatus;
}

export interface PaymentMethodForm {
  name: string;
  paymentData: string;
  notes: string;
  isActive: boolean;
}

export interface CustomerSubscriptionForm {
  customerPhone: string;
  productId: string;
  durationLabel: string;
  startDate: string;
  technicalAccountId: string;
  orderStatus: OrderStatus;
  notes: string;
}

export interface FinancialTransactionForm {
  type: TransactionType;
  source: TransactionSource;
  amount: number;
  customerSubscriptionId?: string;
  customerPhone?: string;
  paymentMethodId?: string;
  title: string;
  notes?: string;
}

export interface RefundRequestForm {
  customerPhone: string;
  customerSubscriptionId: string;
  reason: string;
  paymentMethodId: string;
  amount: number;
  notes: string;
}

export interface UserForm {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  permissions: UserPermissions;
}

// ===========================
// DASHBOARD STATS
// ===========================

export interface DashboardStats {
  activeSubscriptions: number;
  expiredSubscriptions: number;
  pendingOrders: number;
  pendingRefunds: number;
  monthlyIncome: number;
  monthlyProfit: number;
  expiringSubscriptions: CustomerSubscription[];
  recentSubscriptions: CustomerSubscription[];
  recentNotifications: Notification[];
}
