import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, CreateUserDto, UpdateUserDto, LoginDto, LoginResponse } from '../types/media';
import { getAuthHeaders } from '../utils/api';
import { MEDIA_KEYS, FOLDER_KEYS } from './useMediaQueries';

export const USER_KEYS = {
  all: ['users'] as const,
};

export function useUsers() {
  return useQuery<User[]>({
    queryKey: USER_KEYS.all,
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Error al cargar la lista de usuarios');
      return res.json();
    },
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation<LoginResponse, Error, LoginDto>({
    mutationFn: async (dto) => {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: USER_KEYS.all });
        queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
        queryClient.invalidateQueries({ queryKey: FOLDER_KEYS.all });
      }
    },
  });
}

export function useCreateUserMutation(currentUser: User | null) {
  const queryClient = useQueryClient();
  return useMutation<User, Error, CreateUserDto>({
    mutationFn: async (dto) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(currentUser),
        },
        body: JSON.stringify(dto),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al crear usuario');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.all });
    },
  });
}

export function useUpdateUserMutation(currentUser: User | null) {
  const queryClient = useQueryClient();
  return useMutation<User, Error, { id: string; dto: UpdateUserDto }>({
    mutationFn: async ({ id, dto }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(currentUser),
        },
        body: JSON.stringify(dto),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al actualizar usuario');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.all });
      queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
    },
  });
}

export function useDeleteUserMutation(currentUser: User | null) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(currentUser),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al eliminar usuario');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.all });
      queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
    },
  });
}
