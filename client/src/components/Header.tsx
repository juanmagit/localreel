import React, { useState, useRef, useEffect } from 'react';
import { Film, Search, FolderPlus, RefreshCw, Bell, Loader2, Shield, User as UserIcon, LogOut, Users } from 'lucide-react';
import { User } from '../types/media';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenFolders: () => void;
  onScanLibrary: () => void;
  isScanning: boolean;
  scanProgress?: { processed: number; total: number } | null;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  currentUser: User | null;
  onSwitchUser: () => void;
  onOpenUserManagement: () => void;
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
  currentUser,
  onSwitchUser,
  onOpenUserManagement,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const isBatchProcessing = scanProgress && scanProgress.total > 0;
  const progressPercent = isBatchProcessing
    ? Math.round((scanProgress.processed / scanProgress.total) * 100)
    : 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 h-[74px] bg-brand-dark/85 backdrop-blur-md border-b border-white/10 gap-2">
      <div className="flex items-center gap-2 sm:gap-3 font-display text-xl sm:text-2xl font-extrabold tracking-wide uppercase bg-gradient-to-r from-purple-400 via-pink-500 to-pink-600 bg-clip-text text-transparent shrink-0">
        <Film className="text-pink-500" size={24} />
        <span>LocalReel</span>
      </div>

      {currentUser && (
        <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/5 border border-white/10 rounded-full w-32 sm:w-80 focus-within:w-48 sm:focus-within:w-96 focus-within:border-purple-500 focus-within:shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all duration-300">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-gray-100 text-xs sm:text-sm w-full placeholder-gray-400"
            id="search-media-input"
          />
        </div>
      )}

      {currentUser && (
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Progress Counter Badge */}
          {isBatchProcessing && (
            <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 bg-purple-950/60 border border-purple-500/40 rounded-lg text-xs font-mono text-purple-200 animate-pulse" id="header-scan-progress">
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
            <Bell size={18} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-pink-500 rounded-full border border-gray-900 shadow-md">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Admin Folder Management (only for admins) */}
          {isAdmin && (
            <button
              className="inline-flex items-center gap-2 p-2 sm:px-4 sm:py-2 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/20 text-gray-100 border border-white/10 transition-all duration-200"
              onClick={onOpenFolders}
              title="Directorios"
              id="btn-manage-folders"
            >
              <FolderPlus size={18} />
              <span className="hidden md:inline">Directorios</span>
            </button>
          )}

          {/* Scan Library Button */}
          {isAdmin && (
            <button
              className="inline-flex items-center gap-2 p-2 sm:px-4 sm:py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
              onClick={onScanLibrary}
              disabled={isScanning}
              title="Reescanear"
              id="btn-scan-library"
            >
              <RefreshCw size={18} className={isScanning ? 'animate-spin' : ''} />
              <span className="hidden md:inline">{isScanning ? 'Escaneando...' : 'Reescanear'}</span>
            </button>
          )}

          {/* User Profile Badge & Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1.5 sm:pl-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 transition-all duration-200"
              id="btn-user-profile-menu"
            >
              <div className="hidden sm:flex flex-col items-end text-right leading-tight">
                <span className="text-xs font-semibold text-white truncate max-w-[100px]">{currentUser.name}</span>
                <span className="text-[10px] text-gray-400 capitalize flex items-center gap-0.5">
                  {isAdmin && <Shield size={10} className="text-amber-400 fill-amber-400/20" />}
                  {isAdmin ? 'Admin' : 'Usuario'}
                </span>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-md"
                style={{ backgroundColor: currentUser.avatarColor || '#8B5CF6' }}
              >
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-gray-900/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md py-1.5 z-50 animate-fade-in">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenUserManagement();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-gray-200 hover:bg-purple-600/20 hover:text-purple-300 flex items-center gap-2.5 transition-colors"
                  >
                    <Users size={16} className="text-purple-400" />
                    <span>Gestionar usuarios</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onSwitchUser();
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-gray-200 hover:bg-white/10 hover:text-white flex items-center gap-2.5 transition-colors border-t border-white/5"
                >
                  <LogOut size={16} className="text-pink-400" />
                  <span>Cambiar de usuario</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
