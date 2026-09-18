import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from './components/Header';
import { MediaCard } from './components/MediaCard';
import { VideoPlayer } from './components/VideoPlayer';
import { FolderModal } from './components/FolderModal';
import { NotificationModal } from './components/NotificationModal';
import { UserSelectModal } from './components/UserSelectModal';
import { UserManagementModal } from './components/UserManagementModal';
import { Film, FolderPlus, Sparkles } from 'lucide-react';
import {
  MediaFile,
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

export const App: React.FC = () => {
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [isUserSelectModalOpen, setIsUserSelectModalOpen] = useState<boolean>(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
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
          setIsUserSelectModalOpen(true);
        }
      } else {
        setIsUserSelectModalOpen(true);
      }
    }
  }, [currentUser, users]);

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
    setIsUserSelectModalOpen(false);
  };

  const handleSwitchUser = () => {
    setIsUserSelectModalOpen(true);
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

  const handleClosePlayer = () => {
    setSelectedMedia(null);
    queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
  };

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

      <main className="flex-1 px-8 pb-12">
        <div className="mt-8">
          <div className="font-display text-xl font-bold mb-5 flex items-center justify-between">
            <span>Catálogo de Vídeos ({mediaList.length})</span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Film size={40} className="animate-spin" />
              <p className="text-sm">Cargando catálogo...</p>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="glass-panel rounded-2xl flex flex-col items-center justify-center p-12 text-center gap-4 text-gray-400">
              <Film size={48} className="text-pink-500" />
              <h3 className="font-display text-lg font-semibold text-white">No se han encontrado vídeos</h3>
              <p className="max-w-md text-sm leading-relaxed">
                {folders.length === 0
                  ? 'Añade una carpeta de tu disco duro para escanearla y reproducir tus películas en la red local.'
                  : 'No se han detectado archivos de vídeo (.mp4, .mkv, .avi, .mov) en tus carpetas configuradas.'}
              </p>
              {currentUser?.role === 'admin' && (
                <button
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg hover:shadow-purple-500/40 transition-all mt-2"
                  onClick={() => setIsFolderModalOpen(true)}
                  id="btn-empty-add-folder"
                >
                  <FolderPlus size={18} />
                  <span>Configurar Directorios</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
              {mediaList.map((media) => (
                <MediaCard
                  key={media.id}
                  media={media}
                  onSelect={(item) => setSelectedMedia(item)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <UserSelectModal
        isOpen={isUserSelectModalOpen}
        onSelectUser={handleSelectUser}
      />

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

      {selectedMedia && (
        <VideoPlayer
          media={selectedMedia}
          onClose={handleClosePlayer}
          onProgressUpdate={handleSaveProgress}
        />
      )}
    </div>
  );
};

