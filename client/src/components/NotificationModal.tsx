import React from 'react';
import { X, Bell, CheckCheck, Trash2, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AppNotification } from '../types/media';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-amber-400 shrink-0" size={20} />;
      default:
        return <Info className="text-purple-400 shrink-0" size={20} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn" id="notification-modal-backdrop">
      <div className="relative w-full max-w-lg bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" id="notification-modal">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3 font-display text-lg font-bold text-white">
            <Bell className="text-pink-500" size={22} />
            <span>Centro de Notificaciones</span>
            <span className="px-2 py-0.5 text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
              {notifications.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            id="btn-close-notification-modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action bar */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-6 py-2 bg-white/[0.02] border-b border-white/5 text-xs">
            <button
              onClick={onMarkAllAsRead}
              className="flex items-center gap-1.5 text-gray-400 hover:text-purple-300 transition-colors"
              id="btn-mark-all-read"
            >
              <CheckCheck size={14} />
              <span>Marcar todas como leídas</span>
            </button>

            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 text-gray-400 hover:text-rose-400 transition-colors"
              id="btn-clear-notifications"
            >
              <Trash2 size={14} />
              <span>Limpiar historial</span>
            </button>
          </div>
        )}

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
              <Bell size={40} className="text-gray-600 mb-3" />
              <p className="font-semibold text-gray-300">No hay notificaciones</p>
              <p className="text-xs text-gray-500 mt-1">Los avisos de escaneo y miniaturas aparecerán aquí.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                  item.read
                    ? 'bg-white/[0.02] border-white/5 text-gray-300'
                    : 'bg-purple-950/30 border-purple-500/30 text-white shadow-[0_0_10px_rgba(168,85,247,0.1)]'
                }`}
              >
                {getIcon(item.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm truncate">{item.title}</h4>
                    <span className="text-[10px] text-gray-400 shrink-0">{item.timestamp}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            id="btn-footer-close-notifications"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
