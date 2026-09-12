import React from 'react';
import { Play, Film, Clock } from 'lucide-react';
import { MediaFile } from '../types/media';

interface MediaCardProps {
  media: MediaFile;
  onSelect: (media: MediaFile) => void;
}

const formatDuration = (seconds?: number): string => {
  if (!seconds || seconds <= 0) return 'Desconocida';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
};

export const MediaCard: React.FC<MediaCardProps> = ({ media, onSelect }) => {
  const progressPercent =
    media.progress && media.progress.duration > 0
      ? Math.min(100, Math.floor((media.progress.stoppedAt / media.progress.duration) * 100))
      : 0;

  return (
    <div
      className="group relative bg-brand-card/70 border border-white/10 rounded-2xl overflow-hidden cursor-pointer flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02] hover:border-purple-500/50 hover:shadow-card hover:shadow-purple-500/20"
      onClick={() => onSelect(media)}
      id={`media-card-${media.id}`}
    >
      <div className="relative w-full aspect-video bg-gray-900 overflow-hidden">
        {media.thumbnailPath ? (
          <img
            src={media.thumbnailPath}
            alt={media.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-500">
            <Film size={36} />
            <span className="text-xs uppercase font-semibold">{media.format?.toUpperCase() || 'VÍDEO'}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-brand-dark/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-13 h-13 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/50 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play size={24} className="ml-1" />
          </div>
        </div>

        {media.format && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-bold uppercase text-cyan-400 tracking-wider">
            {media.format.replace('.', '')}
          </div>
        )}

        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-1 flex-1">
        <div className="font-display font-semibold text-gray-100 text-base truncate" title={media.title}>
          {media.title}
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock size={13} />
            {formatDuration(media.duration)}
          </span>
          {media.fileSize > 0 && <span>• {formatFileSize(media.fileSize)}</span>}
        </div>
      </div>
    </div>
  );
};
