import { createContext, useContext } from 'react';
import { MediaFile, LibraryFolder, User } from '../types/media';

export interface AppContextType {
  currentUser: User | null;
  mediaList: MediaFile[];
  isLoading: boolean;
  folders: LibraryFolder[];
  onOpenFolderModal: () => void;
  onSaveProgress: (mediaId: string, stoppedAt: number, duration: number) => void;
  onSelectUser: (user: User) => void;
  onSwitchUser: () => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export function useAppOutletContext(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppOutletContext debe usarse dentro de AppContext.Provider');
  }
  return ctx;
}
