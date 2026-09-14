import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, ArrowLeft, Settings, RotateCcw } from 'lucide-react';
import { MediaFile, TranscodePreset } from '../types/media';

const TRANSCODE_PRESET_LABELS: Record<TranscodePreset, string> = {
  direct: 'Direct Play (Original)',
  '1080p': 'Transcodificar 1080p (4.5 Mbps)',
  '720p': 'Transcodificar 720p (2.5 Mbps)',
  '480p': 'Transcodificar 480p (1.2 Mbps)',
  '360p': 'Transcodificar 360p (700 Kbps)',
};

interface VideoPlayerProps {
  media: MediaFile;
  onClose: () => void;
  onProgressUpdate: (mediaId: string, stoppedAt: number, duration: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ media, onClose, onProgressUpdate }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [seekOffset, setSeekOffset] = useState<number>(media.progress?.stoppedAt || 0);
  const [currentTime, setCurrentTime] = useState<number>(media.progress?.stoppedAt || 0);
  const [duration, setDuration] = useState<number>(media.duration || 0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [preset, setPreset] = useState<TranscodePreset>('direct');
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [showControls, setShowControls] = useState<boolean>(true);

  const controlsTimeoutRef = useRef<number | null>(null);

  const resetInactivityTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 5000);
  };

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  const initialSeekDoneRef = useRef<boolean>(false);

  const isNativeFormat = ['.mp4', '.webm'].includes(media.format?.toLowerCase() || '');
  const isNativeCodec = ['h264', 'vp8', 'vp9', 'av1'].includes(media.videoCodec?.toLowerCase() || '');
  const isDirectStream = preset === 'direct' && isNativeFormat && isNativeCodec;

  const seekOffsetRef = useRef(seekOffset);
  seekOffsetRef.current = seekOffset;

  const durationRef = useRef(duration);
  durationRef.current = duration;

  const onProgressUpdateRef = useRef(onProgressUpdate);
  onProgressUpdateRef.current = onProgressUpdate;

  useEffect(() => {
    const initial = media.progress?.stoppedAt || 0;
    initialSeekDoneRef.current = false;

    if (isDirectStream) {
      setSeekOffset(0);
      setCurrentTime(initial);
      setStreamUrl(`/api/stream/${media.id}?preset=direct`);
    } else {
      setSeekOffset(initial);
      setCurrentTime(initial);
      setStreamUrl(`/api/stream/${media.id}?preset=${preset}&startTime=${initial}`);
    }
  }, [media.id, preset, isDirectStream]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        const time = isDirectStream ? videoRef.current.currentTime : (seekOffsetRef.current + videoRef.current.currentTime);
        const dur = durationRef.current || media.duration || 0;
        if (time >= 0) {
          onProgressUpdateRef.current(media.id, time, dur);
        }
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      if (videoRef.current) {
        const time = isDirectStream ? videoRef.current.currentTime : (seekOffsetRef.current + videoRef.current.currentTime);
        const dur = durationRef.current || media.duration || 0;
        if (time >= 0) {
          onProgressUpdateRef.current(media.id, time, dur);
        }
      }
    };
  }, [media.id, media.duration, isDirectStream]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && isDirectStream && !initialSeekDoneRef.current) {
      const initial = media.progress?.stoppedAt || 0;
      if (initial > 0) {
        videoRef.current.currentTime = initial;
      }
      initialSeekDoneRef.current = true;
    }
  };

  const handleCanPlay = () => {
    if (videoRef.current && isPlaying) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const realTime = isDirectStream ? videoRef.current.currentTime : (seekOffset + videoRef.current.currentTime);
      setCurrentTime(realTime);
      if (media.duration && media.duration > 0) {
        setDuration(media.duration);
      } else if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
        setDuration(isDirectStream ? videoRef.current.duration : (seekOffset + videoRef.current.duration));
      }
    }
  };

  const performSeek = (targetSecond: number) => {
    const validSeek = Math.max(0, Math.min(targetSecond, duration || media.duration || 100));

    if (isDirectStream) {
      if (videoRef.current) {
        videoRef.current.currentTime = validSeek;
        videoRef.current.play().catch(() => {});
      }
      setCurrentTime(validSeek);
    } else {
      const newUrl = `/api/stream/${media.id}?preset=${preset}&startTime=${validSeek}`;
      setSeekOffset(validSeek);
      setCurrentTime(validSeek);

      if (streamUrl === newUrl) {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(() => {});
        }
      } else {
        setStreamUrl(newUrl);
      }
    }
    setIsPlaying(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTo = parseFloat(e.target.value);
    performSeek(seekTo);
  };

  const handleRestart = () => {
    performSeek(0);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    const container = document.getElementById('player-container');
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (sec: number): string => {
    if (isNaN(sec) || sec < 0) return '0:00';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black flex flex-col ${!showControls && isPlaying ? 'cursor-none' : 'cursor-default'}`}
      id="player-container"
      onMouseMove={resetInactivityTimer}
      onClick={resetInactivityTimer}
    >
      <div
        className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-6 bg-gradient-to-b from-black/90 to-transparent transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4">
          <button className="text-white hover:text-purple-400 transition-colors" onClick={onClose} id="btn-player-back">
            <ArrowLeft size={26} />
          </button>
          <div className="font-display font-bold text-lg text-white">{media.title}</div>
        </div>
      </div>

      {streamUrl && (
        <video
          ref={videoRef}
          src={streamUrl}
          className={`w-full h-full object-contain ${!showControls && isPlaying ? 'cursor-none' : 'cursor-pointer'}`}
          autoPlay
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
          id="localreel-html5-video"
        />
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col gap-4 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 font-mono">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="1"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-500"
            id="player-timeline-slider"
          />
          <span className="text-xs text-gray-400 font-mono">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button className="text-white hover:text-purple-400 transition-transform hover:scale-110" onClick={togglePlay} id="btn-player-toggle-play">
              {isPlaying ? <Pause size={28} /> : <Play size={28} />}
            </button>

            <button
              className="text-white hover:text-purple-400 transition-transform hover:scale-110 flex items-center gap-1 text-xs"
              onClick={handleRestart}
              title="Volver al inicio (0:00)"
              id="btn-player-restart"
            >
              <RotateCcw size={20} />
            </button>

            <div className="flex items-center gap-2">
              <button className="text-white hover:text-purple-400 transition-transform hover:scale-110" onClick={toggleMute} id="btn-player-mute">
                {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-500"
                id="player-volume-slider"
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-gray-400" />
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value as TranscodePreset)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                id="select-transcode-quality"
              >
                {Object.entries(TRANSCODE_PRESET_LABELS).map(([value, label]) => (
                  <option key={value} value={value} className="bg-gray-900 text-white">
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <button className="text-white hover:text-purple-400 transition-transform hover:scale-110" onClick={toggleFullscreen} id="btn-player-fullscreen">
              <Maximize size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
