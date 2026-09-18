import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { MediaCard } from '../components/MediaCard';
import { Film, FolderPlus } from 'lucide-react';
import { MediaFile } from '../types/media';
import { useAppOutletContext } from '../context/AppContext';

export const CatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const { mediaList, isLoading, folders, currentUser, onOpenFolderModal } =
    useAppOutletContext();

  const handleSelectMedia = (media: MediaFile) => {
    navigate({ to: '/watch/$mediaId', params: { mediaId: media.id } });
  };

  return (
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
              onClick={onOpenFolderModal}
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
              onSelect={handleSelectMedia}
            />
          ))}
        </div>
      )}
    </div>
  );
};
