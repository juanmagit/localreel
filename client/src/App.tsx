import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { Header } from './components/Header';
import { FolderModal } from './components/FolderModal';
import { NotificationModal } from './components/NotificationModal';
import { UserManagementModal } from './components/UserManagementModal';
import { Sparkles } from 'lucide-react';
import {
  MediaEventPayload,
  AppNotification,
  User,
  CURRENT_USER_STORAGE_KEY,
} from './types/media';
import { useUsers } from './hooks/useUsersQuery';
import {
  useMediaList,
  useFolders,
  useScanLibraryMutation,
  useAddFolderWithScan,
  useRemoveFolderWithScan,
  useCleanLibraryMutation,
  useSaveProgressMutation,
  updateMediaInCache,
  MEDIA_KEYS,
} from './hooks/useMediaQueries';

import { AppContext } from './context/AppContext';

export const App: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFolderModalOpen, setIsFolderModalOpen] = useState<boolean>(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [scanProgress, setScanProgress] = useState<{ processed: number; total: number } | null>(null);
  const [toast, setToast] = useState<AppNotification | null>(null);

  // React Query Hooks
  const { data: users = [] } = useUsers();
  const { data: mediaList = [], isLoading } = useMediaList(searchQuery, currentUser);
  const { data: folders = [] } = useFolders(currentUser);

  const scanMutation = useScanLibraryMutation(currentUser);
  const addFolderMutation = useAddFolderWithScan(currentUser);
  const removeFolderMutation = useRemoveFolderWithScan(currentUser);
  const cleanMutation = useCleanLibraryMutation(currentUser);
  const saveProgressMutation = useSaveProgressMutation(currentUser);

  // Auto Login in Dev Mode (VITE_DEV_AUTO_LOGIN=true) or prompt user select
  useEffect(() => {
    const isDevAutoLogin = import.meta.env.VITE_DEV_AUTO_LOGIN === 'true';
    if (!currentUser && users.length > 0) {
      if (isDevAutoLogin) {
        const admin = users.find((u) => u.role === 'admin') || users[0];
        if (admin) {
          setCurrentUser(admin);
          localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(admin));
        } else {
          navigate({ to: '/login' });
        }
      } else {
        navigate({ to: '/login' });
      }
    }
  }, [currentUser, users, navigate]);

  // Keep currentUser state in sync when user data is updated in background
  useEffect(() => {
    if (currentUser && users.length > 0) {
      const updated = users.find((u) => u.id === currentUser.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(currentUser)) {
        setCurrentUser(updated);
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updated));
      }
    }
  }, [users, currentUser]);

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
  };

  const handleSwitchUser = () => {
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    navigate({ to: '/login' });
  };

  const addNotification = (title: string, message: string, type: AppNotification['type']) => {
    const newNotif: AppNotification = {
      id: Date.now().toString() + Math.random().toString().slice(2, 6),
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setToast(newNotif);
    setTimeout(() => {
      setToast((current) => (current?.id === newNotif.id ? null : current));
    }, 4000);
  };

  // SSE Events for Live Thumbnail and Scan Updates
  useEffect(() => {
    if (!currentUser) return;

    const eventSource = new EventSource(`/api/media/events?userId=${encodeURIComponent(currentUser.id)}`);

    eventSource.onmessage = (event) => {
      try {
        const payload: MediaEventPayload = JSON.parse(event.data);

        if (payload.type === 'SCAN_STARTED' && payload.totalFiles) {
          setScanProgress({ processed: 0, total: payload.totalFiles });
          addNotification(
            'Escaneo iniciado',
            payload.message || `Procesando ${payload.totalFiles} archivo(s)...`,
            'info',
          );
        } else if (payload.type === 'MEDIA_UPDATED' && payload.media) {
          if (payload.totalFiles && payload.processedCount !== undefined) {
            setScanProgress({ processed: payload.processedCount, total: payload.totalFiles });
          }
          updateMediaInCache(queryClient, payload.media);
          addNotification(
            'Miniatura generada',
            `Lista la portada para "${payload.media.title}"`,
            'success',
          );
        } else if (payload.type === 'MEDIA_ERROR') {
          if (payload.totalFiles && payload.processedCount !== undefined) {
            setScanProgress({ processed: payload.processedCount, total: payload.totalFiles });
          }
          addNotification(
            'Error en miniatura',
            payload.message || `No se pudo procesar la miniatura para el archivo`,
            'warning',
          );
        } else if (payload.type === 'SUBTITLE_ERROR') {
          addNotification(
            'Error en subtítulos',
            payload.message || 'No se pudo leer el archivo de subtítulos',
            'warning',
          );
        } else if (payload.type === 'SCAN_COMPLETED') {
          setScanProgress(null);
          queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
          addNotification(
            'Escaneo completado',
            payload.message || 'Se han procesado todas las miniaturas y bibliotecas.',
            'success',
          );
        }
      } catch (err) {
        console.error('Error procesando evento SSE:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient, currentUser?.id]);

  const handleScanLibrary = () => {
    scanMutation.mutate();
  };

  const handleAddFolder = async (pathStr: string) => {
    await addFolderMutation.mutateAsync(pathStr);
  };

  const handleRemoveFolder = async (id: string) => {
    await removeFolderMutation.mutateAsync(id);
  };

  const handleCleanLibrary = async () => {
    const data = await cleanMutation.mutateAsync();
    addNotification(
      'Limpieza completada',
      `Se eliminaron ${data?.purgedCount || 0} registros huérfanos.`,
      'info',
    );
  };

  const handleSaveProgress = useCallback(
    (mediaId: string, stoppedAt: number, duration: number) => {
      saveProgressMutation.mutate({ mediaId, stoppedAt, duration });
    },
    [saveProgressMutation],
  );

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark font-sans text-gray-100 selection:bg-purple-500 selection:text-white">
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenFolders={() => setIsFolderModalOpen(true)}
        onScanLibrary={handleScanLibrary}
        isScanning={scanMutation.isPending}
        scanProgress={scanProgress}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onOpenUserManagement={() => setIsUserManagementModalOpen(true)}
      />

      <main className="flex-1 px-4 sm:px-8 pb-12">
        <AppContext.Provider
          value={{
            currentUser,
            mediaList,
            isLoading,
            folders,
            onOpenFolderModal: () => setIsFolderModalOpen(true),
            onSaveProgress: handleSaveProgress,
            onSelectUser: handleSelectUser,
            onSwitchUser: handleSwitchUser,
          }}
        >
          <Outlet />
        </AppContext.Provider>
      </main>

      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
        currentUser={currentUser}
      />

      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        folders={folders}
        onAddFolder={handleAddFolder}
        onRemoveFolder={handleRemoveFolder}
        onCleanLibrary={handleCleanLibrary}
      />

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onClearAll={handleClearNotifications}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 p-4 bg-gray-900/95 border border-purple-500/40 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.25)] text-white max-w-sm backdrop-blur-md animate-fadeIn" id="toast-notification">
          <Sparkles className="text-pink-400 shrink-0 mt-0.5" size={20} />
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xs text-purple-300">{toast.title}</h4>
            <p className="text-xs text-gray-200 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

