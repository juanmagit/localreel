import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, ArrowLeft, Settings, RotateCcw, Subtitles } from 'lucide-react';
import { MediaFile, TranscodePreset } from '../types/media';
import { useAppOutletContext } from '../context/AppContext';

const TRANSCODE_PRESET_LABELS: Record<TranscodePreset, string> = {
  direct: 'Direct Play (Original)',
  '1080p': 'Transcodificar 1080p (4.5 Mbps)',
  '720p': 'Transcodificar 720p (2.5 Mbps)',
  '480p': 'Transcodificar 480p (1.2 Mbps)',
  '360p': 'Transcodificar 360p (700 Kbps)',
};

const SUBTITLE_STYLE_STORAGE_KEY = 'localreel_subtitle_style';

export interface SubtitleStyleSettings {
  fontSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  textColor: string;
  textOpacity: number;
  shadowStyle: 'soft' | 'outline' | 'glow' | 'none';
  bgColor: string;
}

const DEFAULT_SUBTITLE_STYLE: SubtitleStyleSettings = {
  fontSize: 'md',
  textColor: '#ffffff',
  textOpacity: 1,
  shadowStyle: 'soft',
  bgColor: 'rgba(0, 0, 0, 0.75)',
};

const FONT_SIZE_MAP: Record<SubtitleStyleSettings['fontSize'], string> = {
  sm: '2.2rem',
  md: '3.6rem',
  lg: '3.2rem',
  xl: '4.0rem',
  '2xl': '5.0rem',
};

const FONT_SIZE_OPTIONS = Object.keys(FONT_SIZE_MAP) as SubtitleStyleSettings['fontSize'][];

const SHADOW_STYLE_MAP: Record<SubtitleStyleSettings['shadowStyle'], string> = {
  soft: '0 1px 3px rgba(0, 0, 0, 0.9)',
  outline: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.8)',
  glow: '0 0 8px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)',
  none: 'none',
};

const COLOR_OPTIONS = [
  { label: 'Blanco', value: '#ffffff' },
  { label: 'Amarillo', value: '#facc15' },
  { label: 'Cyan', value: '#38bdf8' },
  { label: 'Verde', value: '#4ade80' },
  { label: 'Rojo', value: '#ff0000' },
  { label: 'Gris', value: '#ababab' },
  { label: 'Naranja', value: '#FFA500' },
];

const OPACITY_OPTIONS = [
  { label: '100%', value: 1 },
  { label: '80%', value: 0.8 },
  { label: '60%', value: 0.6 },
  { label: '40%', value: 0.4 },
  { label: '20%', value: 0.2 },
  { label: '10%', value: 0.1 },
];

const SHADOW_OPTIONS: { label: string; value: SubtitleStyleSettings['shadowStyle'] }[] = [
  { label: 'Suave', value: 'soft' },
  { label: 'Contorno', value: 'outline' },
  { label: 'Brillo', value: 'glow' },
  { label: 'Sin sombra', value: 'none' },
];

const BG_OPTIONS = [
  { label: 'Oscuro', value: 'rgba(0, 0, 0, 0.75)' },
  { label: 'Sólido', value: '#000000' },
  { label: 'Sin fondo', value: 'transparent' },
];



interface VideoPlayerProps {
  media: MediaFile;
  onClose: () => void;
  onProgressUpdate: (mediaId: string, stoppedAt: number, duration: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ media, onClose, onProgressUpdate }) => {
  const { currentUser } = useAppOutletContext();
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

  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | 'off'>(() => {
    return media.subtitles && media.subtitles.length > 0 ? media.subtitles[0].id : 'off';
  });
  const [isSubtitleMenuOpen, setIsSubtitleMenuOpen] = useState<boolean>(false);
  const [subtitleTab, setSubtitleTab] = useState<'tracks' | 'style'>('tracks');

  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyleSettings>(() => {
    try {
      const saved = localStorage.getItem(SUBTITLE_STYLE_STORAGE_KEY);
      return saved ? { ...DEFAULT_SUBTITLE_STYLE, ...JSON.parse(saved) } : DEFAULT_SUBTITLE_STYLE;
    } catch {
      return DEFAULT_SUBTITLE_STYLE;
    }
  });

  const updateSubtitleStyle = (patch: Partial<SubtitleStyleSettings>) => {
    setSubtitleStyle((prev) => {
      const updated = { ...prev, ...patch };
      localStorage.setItem(SUBTITLE_STYLE_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const subtitleCssVars = {
    '--sub-size': FONT_SIZE_MAP[subtitleStyle.fontSize],
    '--sub-color': subtitleStyle.textColor,
    '--sub-shadow': SHADOW_STYLE_MAP[subtitleStyle.shadowStyle],
    '--sub-bg': subtitleStyle.bgColor,
    '--sub-opacity': subtitleStyle.textOpacity ?? 1,
  } as React.CSSProperties;

  const controlsTimeoutRef = useRef<number | null>(null);

  const resetInactivityTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
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

  // Synchronize HTML5 video text tracks mode whenever selectedSubtitleId changes
  useEffect(() => {
    if (!videoRef.current) return;
    const textTracks = videoRef.current.textTracks;
    if (!textTracks) return;

    const updateTrackModes = () => {
      for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        const subTrack = media.subtitles?.[i];
        if (subTrack && subTrack.id === selectedSubtitleId) {
          track.mode = 'showing';
        } else {
          track.mode = 'disabled';
        }
      }
    };

    updateTrackModes();
    textTracks.addEventListener('change', updateTrackModes);
    return () => {
      textTracks.removeEventListener('change', updateTrackModes);
    };
  }, [selectedSubtitleId, media.subtitles, streamUrl]);

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
      style={subtitleCssVars}
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
        >
          {media.subtitles?.map((track) => (
            <track
              key={track.id}
              kind="subtitles"
              src={`/api/media/${media.id}/subtitles/${track.id}?userId=${encodeURIComponent(currentUser?.id || '')}`}
              srcLang={track.language || 'es'}
              label={track.label}
              default={selectedSubtitleId === track.id}
            />
          ))}
        </video>
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
            {media.subtitles && media.subtitles.length > 0 && (
              <div className="relative">
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    selectedSubtitleId !== 'off'
                      ? 'bg-purple-600/40 border-purple-500 text-purple-200 shadow-sm'
                      : 'bg-white/10 border-white/20 text-gray-300 hover:text-white hover:bg-white/20'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSubtitleMenuOpen((prev) => !prev);
                  }}
                  title="Seleccionar Subtítulos"
                  id="btn-player-subtitles"
                >
                  <Subtitles size={16} />
                  <span>Subtítulos</span>
                  {selectedSubtitleId !== 'off' && (
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                  )}
                </button>

                {isSubtitleMenuOpen && (
                  <div
                    className="absolute bottom-full right-0 mb-2 w-72 bg-gray-900/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-md p-3 z-30 flex flex-col gap-3 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Subtitle Tabs Header */}
                    <div className="flex border-b border-white/10 pb-2 gap-2">
                      <button
                        className={`flex-1 py-1 rounded-lg font-medium text-center transition-colors ${
                          subtitleTab === 'tracks'
                            ? 'bg-purple-600/50 text-white shadow'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                        onClick={() => setSubtitleTab('tracks')}
                        id="tab-subtitle-tracks"
                      >
                        Pistas
                      </button>
                      <button
                        className={`flex-1 py-1 rounded-lg font-medium text-center transition-colors ${
                          subtitleTab === 'style'
                            ? 'bg-purple-600/50 text-white shadow'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                        onClick={() => setSubtitleTab('style')}
                        id="tab-subtitle-style"
                      >
                        Estilo
                      </button>
                    </div>

                    {subtitleTab === 'tracks' ? (
                      <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                        <button
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                            selectedSubtitleId === 'off'
                              ? 'bg-purple-600/40 text-white font-semibold'
                              : 'text-gray-300 hover:bg-white/10'
                          }`}
                          onClick={() => {
                            setSelectedSubtitleId('off');
                            setIsSubtitleMenuOpen(false);
                          }}
                          id="btn-subtitle-off"
                        >
                          Desactivado
                        </button>
                        {media.subtitles.map((track) => (
                          <button
                            key={track.id}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                              selectedSubtitleId === track.id
                                ? 'bg-purple-600/40 text-white font-semibold'
                                : 'text-gray-300 hover:bg-white/10'
                            }`}
                            onClick={() => {
                              setSelectedSubtitleId(track.id);
                              setIsSubtitleMenuOpen(false);
                            }}
                            id={`btn-subtitle-track-${track.id}`}
                          >
                            <span className="truncate">{track.label}</span>
                            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 uppercase font-mono ml-2">
                              {track.format}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
                        {/* Size Selection */}
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                            Tamaño del Texto
                          </label>
                          <div className="grid grid-cols-5 gap-1">
                            {FONT_SIZE_OPTIONS.map((sz) => (
                              <button
                                key={sz}
                                className={`py-1 rounded text-center font-bold uppercase transition-colors text-[10px] ${
                                  subtitleStyle.fontSize === sz
                                    ? 'bg-purple-600 text-white shadow'
                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                                onClick={() => updateSubtitleStyle({ fontSize: sz })}
                                id={`btn-subtitle-size-${sz}`}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Color Selection */}
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                            Color del Texto
                          </label>
                          <div className="flex items-center gap-3 py-1">
                            {COLOR_OPTIONS.map((c) => (
                              <button
                                key={c.value}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                  subtitleStyle.textColor === c.value
                                    ? 'scale-110 ring-2 ring-purple-400 shadow-md'
                                    : 'opacity-70 hover:opacity-100 hover:scale-105'
                                }`}
                                style={{ backgroundColor: c.value }}
                                onClick={() => updateSubtitleStyle({ textColor: c.value })}
                                title={c.label}
                                id={`btn-subtitle-color-${c.value.replace('#', '')}`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Text Opacity Selection */}
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                            Opacidad del Texto
                          </label>
                          <div className="grid grid-cols-4 gap-1">
                            {OPACITY_OPTIONS.map((op) => (
                              <button
                                key={op.value}
                                className={`py-1 rounded text-center transition-colors text-[10px] ${
                                  (subtitleStyle.textOpacity ?? 1) === op.value
                                    ? 'bg-purple-600 text-white font-semibold shadow'
                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                                onClick={() => updateSubtitleStyle({ textOpacity: op.value })}
                                id={`btn-subtitle-opacity-${op.value * 100}`}
                              >
                                {op.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Shadow / Outline Selection */}
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                            Borde / Sombra
                          </label>
                          <div className="grid grid-cols-2 gap-1">
                            {SHADOW_OPTIONS.map((sh) => (
                              <button
                                key={sh.value}
                                className={`py-1 px-2 rounded text-center transition-colors text-[11px] ${
                                  subtitleStyle.shadowStyle === sh.value
                                    ? 'bg-purple-600 text-white font-semibold shadow'
                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                                onClick={() => updateSubtitleStyle({ shadowStyle: sh.value })}
                                id={`btn-subtitle-shadow-${sh.value}`}
                              >
                                {sh.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Background Selection */}
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                            Fondo de Caja
                          </label>
                          <div className="grid grid-cols-3 gap-1">
                            {BG_OPTIONS.map((bg) => (
                              <button
                                key={bg.value}
                                className={`py-1 px-1 rounded text-center text-[10px] transition-colors ${
                                  subtitleStyle.bgColor === bg.value
                                    ? 'bg-purple-600 text-white font-semibold shadow'
                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                                onClick={() => updateSubtitleStyle({ bgColor: bg.value })}
                                id={`btn-subtitle-bg-${bg.label}`}
                              >
                                {bg.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Subtitle Live Preview */}
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                            Vista Previa
                          </label>
                          <div className="p-3 bg-gradient-to-r from-purple-950/80 via-slate-900/80 to-blue-950/80 rounded-lg border border-white/10 flex items-center justify-center min-h-[50px] overflow-hidden relative">
                            <div className="absolute inset-0 bg-[radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />
                            <span
                              className="px-2 py-0.5 rounded transition-all select-none relative z-10"
                              style={{
                                backgroundColor: subtitleStyle.bgColor,
                                color: subtitleStyle.textColor,
                                opacity: subtitleStyle.textOpacity ?? 1,
                                fontSize: FONT_SIZE_MAP[subtitleStyle.fontSize],
                                textShadow: SHADOW_STYLE_MAP[subtitleStyle.shadowStyle],
                              }}
                            >
                              Vista previa de subtítulo
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Settings size={18} className="text-gray-400" />
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value as TranscodePreset)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white outline-none cursor-pointer hover:bg-white/20 transition-colors"
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
