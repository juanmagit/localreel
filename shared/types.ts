export type TranscodePreset = 'direct' | '1080p' | '720p' | '480p' | '360p';

export interface WatchProgress {
  id?: number;
  mediaId: string;
  stoppedAt: number;
  duration: number;
  isCompleted: boolean;
  updatedAt?: string | Date;
}

export interface MediaFile {
  id: string;
  title: string;
  filePath: string;
  fileSize: number;
  duration: number;
  format?: string;
  videoCodec?: string;
  audioCodec?: string;
  width?: number;
  height?: number;
  thumbnailPath?: string;
  folderPath?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  progress?: WatchProgress | null;
}

export interface LibraryFolder {
  id: string;
  path: string;
  label?: string;
  createdAt?: string | Date;
}

export type MediaEventType = 'MEDIA_UPDATED' | 'SCAN_COMPLETED';

export interface MediaEventPayload {
  type: MediaEventType;
  media?: MediaFile;
}
