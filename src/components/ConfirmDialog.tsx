'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  variant?: 'danger' | 'warning';
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'تأكيد العملية',
  message,
  confirmLabel = 'تأكيد',
  loading = false,
  variant = 'danger',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center
            ${variant === 'danger' ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
            <AlertTriangle className={`w-7 h-7 ${variant === 'danger' ? 'text-red-400' : 'text-yellow-400'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
            <p className="text-slate-400 text-sm mt-2">{message}</p>
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              disabled={loading}
              className="btn-secondary flex-1 justify-center"
            >
              إلغاء
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 justify-center flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white disabled:opacity-50'
                }`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
