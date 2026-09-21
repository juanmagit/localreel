import React, { useState } from 'react';
import { X, Folder, Plus, Trash2, Eraser, Info } from 'lucide-react';
import { LibraryFolder } from '../types/media';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: LibraryFolder[];
  onAddFolder: (path: string) => Promise<void>;
  onRemoveFolder: (id: string) => Promise<void>;
  onCleanLibrary: () => Promise<void>;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  folders,
  onAddFolder,
  onRemoveFolder,
  onCleanLibrary,
}) => {
  const [newFolderPath, setNewFolderPath] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cleanedMsg, setCleanedMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderPath.trim()) return;
    try {
      setErrorMsg('');
      setCleanedMsg('');
      await onAddFolder(newFolderPath.trim());
      setNewFolderPath('');
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo agregar la carpeta.');
    }
  };

  const handleClean = async () => {
    try {
      setErrorMsg('');
      await onCleanLibrary();
      setCleanedMsg('Limpieza completada. Se han purgado los archivos huérfanos o inexistentes.');
    } catch (err) {
      setErrorMsg('Error durante la limpieza de la biblioteca.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl flex flex-col gap-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Folder className="text-pink-500" size={24} />
            <h3 className="font-display text-xl font-bold text-gray-100">Carpetas del Disco Duro</h3>
          </div>
          <button className="text-gray-400 hover:text-white transition-colors" onClick={onClose} id="btn-close-folder-modal">
            <X size={22} />
          </button>
        </div>

        {/* Informative Scanning Rules Guide */}
        <div className="bg-purple-950/40 border border-purple-500/25 rounded-xl p-3.5 flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-purple-300">
            <Info size={16} className="text-pink-400 flex-shrink-0" />
            <span>Reglas de Escaneo e Importación</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-gray-300/90 pl-1 leading-relaxed">
            <li>
              <strong className="text-purple-200">Archivos de vídeo:</strong> Se escanean automáticamente formatos como <code className="bg-white/10 px-1 py-0.5 rounded text-purple-300">.mp4</code>, <code className="bg-white/10 px-1 py-0.5 rounded text-purple-300">.mkv</code>, <code className="bg-white/10 px-1 py-0.5 rounded text-purple-300">.avi</code> y <code className="bg-white/10 px-1 py-0.5 rounded text-purple-300">.mov</code> (incluyendo subcarpetas).
            </li>
            <li>
              <strong className="text-purple-200">Subtítulos compatibles:</strong> Detecta pistas <code className="bg-white/10 px-1 py-0.5 rounded text-purple-300">.srt</code>, <code className="bg-white/10 px-1 py-0.5 rounded text-purple-300">.vtt</code>, <code className="bg-white/10 px-1 py-0.5 rounded text-purple-300">.ass</code> y <code className="bg-white/10 px-1 py-0.5 rounded text-purple-300">.sub</code>.
            </li>
            <li>
              <strong className="text-purple-200">Ubicación de subtítulos:</strong> Se buscan en la carpeta del vídeo o dentro de subcarpetas dedicadas (ej: <code className="bg-white/10 px-1 py-0.5 rounded text-purple-300">Subs/</code>, <code className="bg-white/10 px-1 py-0.5 rounded text-purple-300">Subtitles/</code>). Si la carpeta contiene una sola película, se asociarán todos los subtítulos encontrados.
            </li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="/ruta/a/mis/peliculas"
            value={newFolderPath}
            onChange={(e) => setNewFolderPath(e.target.value)}
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-100 placeholder-gray-400 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            id="input-new-folder-path"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md hover:shadow-purple-500/30 transition-all"
            id="btn-add-folder-submit"
          >
            <Plus size={18} />
            <span>Añadir</span>
          </button>
        </form>

        {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}
        {cleanedMsg && <p className="text-emerald-400 text-xs">{cleanedMsg}</p>}

        <div className="flex flex-col gap-3 max-h-60 overflow-y-auto">
          <p className="text-xs text-gray-400 font-medium">Carpetas actualmente escaneadas:</p>
          {folders.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No hay carpetas añadidas aún. Añade la ruta de tu disco duro para comenzar.
            </p>
          ) : (
            folders.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Folder size={16} className="text-purple-400 flex-shrink-0" />
                  <span className="truncate">{f.path}</span>
                </div>
                <button
                  className="text-gray-500 hover:text-red-400 transition-colors ml-2"
                  onClick={() => onRemoveFolder(f.id)}
                  title="Eliminar carpeta"
                  id={`btn-remove-folder-${f.id}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-white/10 pt-4 flex justify-end">
          <button
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10 transition-all"
            onClick={handleClean}
            id="btn-clean-library"
          >
            <Eraser size={16} />
            <span>Purga y Limpiar Catálogo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
