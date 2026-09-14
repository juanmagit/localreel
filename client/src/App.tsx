import React, { useState, useEffect, useCallback } from 'react';
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
  LibraryFolder,
  MediaEventPayload,
  AppNotification,
  User,
  CURRENT_USER_STORAGE_KEY,
} from './types/media';
import { getAuthHeaders } from './utils/api';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [isUserSelectModalOpen, setIsUserSelectModalOpen] = useState<boolean>(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState<boolean>(false);

  const [mediaList, setMediaList] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState<boolean>(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [scanProgress, setScanProgress] = useState<{ processed: number; total: number } | null>(null);
  const [toast, setToast] = useState<AppNotification | null>(null);

  // Auto Login in Dev Mode (VITE_DEV_AUTO_LOGIN=true)
  useEffect(() => {
    const isDevAutoLogin = import.meta.env.VITE_DEV_AUTO_LOGIN === 'true';
    if (!currentUser) {
      if (isDevAutoLogin) {
        fetch('/api/users')
          .then((res) => (res.ok ? res.json() : []))
          .then((users: User[]) => {
            const admin = users.find((u) => u.role === 'admin') || users[0];
            if (admin) {
              setCurrentUser(admin);
              localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(admin));
            } else {
              setIsUserSelectModalOpen(true);
            }
          })
          .catch(() => setIsUserSelectModalOpen(true));
      } else {
        setIsUserSelectModalOpen(true);
      }
    }
  }, [currentUser]);

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

  const fetchMedia = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/media?q=${encodeURIComponent(searchQuery)}`, {
        headers: getAuthHeaders(currentUser),
      });
      if (res.ok) {
        const data = await res.json();
        setMediaList(data);
      }
    } catch (err) {
      console.error('Error cargando medios:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, currentUser]);

  const fetchFolders = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/media/folders', {
        headers: getAuthHeaders(currentUser),
      });
      if (res.ok) {
        const data = await res.json();
        setFolders(data);
      }
    } catch (err) {
      console.error('Error cargando carpetas:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchFolders();
    }
  }, [fetchFolders, currentUser]);

  useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        fetchMedia();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [fetchMedia, currentUser]);

  useEffect(() => {
    const eventSource = new EventSource('/api/media/events');

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
          const updated = payload.media;
          if (payload.totalFiles && payload.processedCount !== undefined) {
            setScanProgress({ processed: payload.processedCount, total: payload.totalFiles });
          }
          setMediaList((prevList) => {
            const exists = prevList.some((item) => item.id === updated.id);
            if (exists) {
              return prevList.map((item) => (item.id === updated.id ? updated : item));
            } else {
              return [updated, ...prevList];
            }
          });
          addNotification(
            'Miniatura generada',
            `Lista la portada para "${updated.title}"`,
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
          fetchMedia();
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
  }, [fetchMedia]);

  const handleScanLibrary = async () => {
    if (!currentUser) return;
    setIsScanning(true);
    try {
      await fetch('/api/media/scan', {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
      });
      await fetchMedia();
    } catch (err) {
      console.error('Error al escanear biblioteca:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddFolder = async (pathStr: string) => {
    if (!currentUser) return;
    const res = await fetch('/api/media/folders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(currentUser),
      },
      body: JSON.stringify({ path: pathStr }),
    });

    if (res.ok) {
      await fetchFolders();
      await handleScanLibrary();
    }
  };

  const handleRemoveFolder = async (id: string) => {
    if (!currentUser) return;
    const res = await fetch(`/api/media/folders/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(currentUser),
    });

    if (res.ok) {
      await fetchFolders();
      await handleScanLibrary();
    }
  };

  const handleCleanLibrary = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/media/clean', {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
      });
      if (res.ok) {
        const data = await res.json();
        addNotification(
          'Limpieza completada',
          `Se eliminaron ${data.purgedCount || 0} registros huérfanos.`,
          'info',
        );
        await fetchMedia();
      }
    } catch (err) {
      console.error('Error limpiando biblioteca:', err);
    }
  };

  const handleSaveProgress = useCallback(
    (mediaId: string, stoppedAt: number, duration: number) => {
      if (!currentUser) return;
      fetch(`/api/media/${mediaId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(currentUser),
        },
        body: JSON.stringify({ stoppedAt, duration }),
      }).catch((err) => console.error('Error guardando progreso:', err));
    },
    [currentUser],
  );

  const handleClosePlayer = () => {
    setSelectedMedia(null);
    fetchMedia();
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
        isScanning={isScanning}
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
        onUsersChanged={() => {
          fetchMedia();
          if (currentUser) {
            fetch('/api/users')
              .then((res) => (res.ok ? res.json() : []))
              .then((usersList: User[]) => {
                const updated = usersList.find((u) => u.id === currentUser.id);
                if (updated) {
                  setCurrentUser(updated);
                  localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updated));
                }
              })
              .catch(() => {});
          }
        }}
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
