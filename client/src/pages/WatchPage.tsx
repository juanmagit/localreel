import React from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { VideoPlayer } from '../components/VideoPlayer';
import { useMediaDetail, MEDIA_KEYS } from '../hooks/useMediaQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Film } from 'lucide-react';
import { useAppOutletContext } from '../context/AppContext';

export const WatchPage: React.FC = () => {
  const { mediaId } = useParams({ from: '/watch/$mediaId' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser, onSaveProgress } = useAppOutletContext();

  const { data: media, isLoading, isError } = useMediaDetail(mediaId, currentUser);

  const handleClose = () => {
    queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
    navigate({ to: '/' });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-gray-400 gap-3">
        <Film size={44} className="animate-spin text-pink-500" />
        <p className="text-sm font-medium">Cargando reproductor...</p>
      </div>
    );
  }

  if (isError || !media) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-gray-400 gap-4">
        <p className="text-red-400 text-sm">No se pudo cargar el archivo de vídeo solicitado.</p>
        <button
          onClick={handleClose}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Volver al catálogo
        </button>
      </div>
    );
  }

  return (
    <VideoPlayer
      media={media}
      onClose={handleClose}
      onProgressUpdate={onSaveProgress}
    />
  );
};
