import React from 'react';
import { Film, Search, FolderPlus, RefreshCw, Bell, Loader2 } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenFolders: () => void;
  onScanLibrary: () => void;
  isScanning: boolean;
  scanProgress?: { processed: number; total: number } | null;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  onOpenFolders,
  onScanLibrary,
  isScanning,
  scanProgress,
  unreadNotificationsCount,
  onOpenNotifications,
}) => {
  const isBatchProcessing = scanProgress && scanProgress.total > 0;
  const progressPercent = isBatchProcessing
    ? Math.round((scanProgress.processed / scanProgress.total) * 100)
    : 0;

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 bg-brand-dark/85 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center gap-3 font-display text-2xl font-extrabold tracking-wide uppercase bg-gradient-to-r from-purple-400 via-pink-500 to-pink-600 bg-clip-text text-transparent">
        <Film className="text-pink-500" size={28} />
        <span>LocalReel</span>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full w-80 focus-within:w-96 focus-within:border-purple-500 focus-within:shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all duration-300">
        <Search size={18} className="text-gray-400" />
        <input
          type="text"
          placeholder="Buscar películas o vídeos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-gray-100 text-sm w-full placeholder-gray-400"
          id="search-media-input"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Progress Counter Badge */}
        {isBatchProcessing && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-purple-950/60 border border-purple-500/40 rounded-lg text-xs font-mono text-purple-200 animate-pulse" id="header-scan-progress">
            <Loader2 size={14} className="animate-spin text-pink-400" />
            <span>Miniaturas {scanProgress.processed}/{scanProgress.total} ({progressPercent}%)</span>
            <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-lg text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-200"
          title="Centro de notificaciones"
          id="btn-header-notifications"
        >
          <Bell size={20} />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-pink-500 rounded-full border border-gray-900 shadow-md">
              {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/20 text-gray-100 border border-white/10 transition-all duration-200"
          onClick={onOpenFolders}
          id="btn-manage-folders"
        >
          <FolderPlus size={18} />
          <span>Directorios</span>
        </button>

        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
          onClick={onScanLibrary}
          disabled={isScanning}
          id="btn-scan-library"
        >
          <RefreshCw size={18} className={isScanning ? 'animate-spin' : ''} />
          <span>{isScanning ? 'Escaneando...' : 'Reescanear'}</span>
        </button>
      </div>
    </header>
  );
};
