import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MediaCard } from './components/MediaCard';
import { VideoPlayer } from './components/VideoPlayer';
import { FolderModal } from './components/FolderModal';
import { Film, FolderPlus } from 'lucide-react';
import { MediaFile, LibraryFolder } from './types/media';

export const App: React.FC = () => {
  const [mediaList, setMediaList] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch(`/api/media?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setMediaList(data);
      }
    } catch (err) {
      console.error('Error cargando medios:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/media/folders');
      if (res.ok) {
        const data = await res.json();
        setFolders(data);
      }
    } catch (err) {
      console.error('Error cargando carpetas:', err);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMedia();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchMedia]);

  const handleScanLibrary = async () => {
    setIsScanning(true);
    try {
      await fetch('/api/media/scan', { method: 'POST' });
      await fetchMedia();
    } catch (err) {
      console.error('Error al escanear biblioteca:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddFolder = async (pathStr: string) => {
    const res = await fetch('/api/media/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathStr }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error agregando carpeta.');
    }

    await fetchFolders();
    await handleScanLibrary();
  };

  const handleRemoveFolder = async (id: string) => {
    await fetch(`/api/media/folders/${id}`, { method: 'DELETE' });
    await fetchFolders();
    await fetchMedia();
  };

  const handleCleanLibrary = async () => {
    setIsScanning(true);
    try {
      await fetch('/api/media/clean', { method: 'POST' });
      await fetchMedia();
    } catch (err) {
      console.error('Error limpiando biblioteca:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveProgress = useCallback(async (mediaId: string, stoppedAt: number, duration: number) => {
    try {
      await fetch(`/api/media/${mediaId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stoppedAt, duration }),
      });
    } catch (err) {
      console.error('Error guardando progreso:', err);
    }
  }, []);

  const handleClosePlayer = () => {
    setSelectedMedia(null);
    fetchMedia();
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark text-gray-100">
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenFolders={() => setIsFolderModalOpen(true)}
        onScanLibrary={handleScanLibrary}
        isScanning={isScanning}
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
              <button
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg hover:shadow-purple-500/40 transition-all mt-2"
                onClick={() => setIsFolderModalOpen(true)}
                id="btn-empty-add-folder"
              >
                <FolderPlus size={18} />
                <span>Configurar Directorios</span>
              </button>
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

      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        folders={folders}
        onAddFolder={handleAddFolder}
        onRemoveFolder={handleRemoveFolder}
        onCleanLibrary={handleCleanLibrary}
      />

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
