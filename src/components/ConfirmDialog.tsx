import { ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl p-5 max-w-sm w-full shadow-xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{title}</h3>
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">{message}</div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm text-white transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
