import { USER_ID_HEADER, User } from '../types/media';

export const getAuthHeaders = (user?: User | null): Record<string, string> => {
  if (!user?.id) return {};
  return { [USER_ID_HEADER]: user.id };
};
