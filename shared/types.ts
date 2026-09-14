export type TranscodePreset = 'direct' | '1080p' | '720p' | '480p' | '360p';

export const USER_ID_HEADER = 'x-user-id';
export const CURRENT_USER_STORAGE_KEY = 'localreel_current_user';

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatarColor: string;
  hasPin: boolean;
  createdAt?: string | Date;
}

export interface CreateUserDto {
  name: string;
  role: UserRole;
  pin?: string;
  avatarColor?: string;
}

export interface UpdateUserDto {
  name?: string;
  role?: UserRole;
  pin?: string;
  avatarColor?: string;
}

export interface LoginDto {
  userId: string;
  pin?: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  message?: string;
}

export interface WatchProgress {
  id?: number;
  mediaId: string;
  userId: string;
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

export type MediaEventType = 'SCAN_STARTED' | 'MEDIA_UPDATED' | 'MEDIA_ERROR' | 'SCAN_COMPLETED';

export interface MediaEventPayload {
  type: MediaEventType;
  media?: MediaFile;
  processedCount?: number;
  totalFiles?: number;
  message?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
}
