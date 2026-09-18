import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { MediaFile, LibraryFolder, User } from '../types/media';
import { getAuthHeaders } from '../utils/api';

export const MEDIA_KEYS = {
  all: ['media'] as const,
  list: (searchQuery: string, userId?: string) => ['media', { searchQuery, userId }] as const,
};

export const FOLDER_KEYS = {
  all: ['folders'] as const,
  list: (userId?: string) => ['folders', { userId }] as const,
};

// Cache Helper for updating single media item in React Query cache
export function updateMediaInCache(queryClient: QueryClient, updatedMedia: MediaFile) {
  queryClient.setQueriesData<MediaFile[]>({ queryKey: MEDIA_KEYS.all }, (oldMedia) => {
    if (!oldMedia) return oldMedia;
    const exists = oldMedia.some((item) => item.id === updatedMedia.id);
    if (exists) {
      return oldMedia.map((item) => (item.id === updatedMedia.id ? updatedMedia : item));
    } else {
      return [updatedMedia, ...oldMedia];
    }
  });
}

export function useMediaList(searchQuery: string, currentUser: User | null) {
  return useQuery<MediaFile[]>({
    queryKey: MEDIA_KEYS.list(searchQuery, currentUser?.id),
    queryFn: async () => {
      const res = await fetch(`/api/media?q=${encodeURIComponent(searchQuery)}`, {
        headers: getAuthHeaders(currentUser),
      });
      if (!res.ok) throw new Error('Error al cargar la lista de medios');
      return res.json();
    },
    enabled: !!currentUser,
  });
}

export function useFolders(currentUser: User | null) {
  return useQuery<LibraryFolder[]>({
    queryKey: FOLDER_KEYS.list(currentUser?.id),
    queryFn: async () => {
      const res = await fetch('/api/media/folders', {
        headers: getAuthHeaders(currentUser),
      });
      if (!res.ok) throw new Error('Error al cargar directorios');
      return res.json();
    },
    enabled: !!currentUser,
  });
}

export function useScanLibraryMutation(currentUser: User | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/media/scan', {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
      });
      if (!res.ok) throw new Error('Error al escanear biblioteca');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
    },
  });
}

export function useAddFolderMutation(currentUser: User | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pathStr: string) => {
      const res = await fetch('/api/media/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(currentUser),
        },
        body: JSON.stringify({ path: pathStr }),
      });
      if (!res.ok) throw new Error('Error al añadir directorio');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLDER_KEYS.all });
    },
  });
}

export function useRemoveFolderMutation(currentUser: User | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/media/folders/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(currentUser),
      });
      if (!res.ok) throw new Error('Error al eliminar directorio');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLDER_KEYS.all });
    },
  });
}

export function useCleanLibraryMutation(currentUser: User | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/media/clean', {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
      });
      if (!res.ok) throw new Error('Error al limpiar biblioteca');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FOLDER_KEYS.all });
    },
  });
}

// Composite Hooks combining atomic mutations
export function useAddFolderWithScan(currentUser: User | null) {
  const addFolderMutation = useAddFolderMutation(currentUser);
  const scanMutation = useScanLibraryMutation(currentUser);

  return useMutation({
    mutationFn: async (pathStr: string) => {
      const folder = await addFolderMutation.mutateAsync(pathStr);
      await scanMutation.mutateAsync();
      return folder;
    },
  });
}

export function useRemoveFolderWithScan(currentUser: User | null) {
  const removeFolderMutation = useRemoveFolderMutation(currentUser);
  const scanMutation = useScanLibraryMutation(currentUser);

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await removeFolderMutation.mutateAsync(id);
      await scanMutation.mutateAsync();
      return result;
    },
  });
}

export function useSaveProgressMutation(currentUser: User | null) {
  return useMutation({
    mutationFn: async ({ mediaId, stoppedAt, duration }: { mediaId: string; stoppedAt: number; duration: number }) => {
      const res = await fetch(`/api/media/${mediaId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(currentUser),
        },
        body: JSON.stringify({ stoppedAt, duration }),
      });
      if (!res.ok) throw new Error('Error al guardar progreso');
      return res.json();
    },
    // No automatic invalidation here while playing (to prevent HTTP refetching every 5 sec).
    // Invalidation occurs when the video player is closed.
  });
}
