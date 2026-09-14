import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Shield, Check, Pencil } from 'lucide-react';
import { User, UserRole } from '../types/media';
import { getAuthHeaders } from '../utils/api';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUsersChanged?: () => void;
}

const PRESET_COLORS = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

const USER_ROLE_LABELS: Record<UserRole, string> = {
  user: 'Usuario normal',
  admin: 'Administrador',
};

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUsersChanged,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<UserRole>('user');
  const [pin, setPin] = useState<string>('');
  const [avatarColor, setAvatarColor] = useState<string>(PRESET_COLORS[0]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [editingRole, setEditingRole] = useState<UserRole>('user');
  const [editingPin, setEditingPin] = useState<string>('');
  const [editingAvatarColor, setEditingAvatarColor] = useState<string>(PRESET_COLORS[0]);
  const [editingErrorMsg, setEditingErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error cargando lista de usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Introduce un nombre para el usuario.');
      return;
    }
    if (role === 'admin' && pin.trim().length !== 4) {
      setErrorMsg('El PIN del Administrador debe tener 4 dígitos.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(currentUser),
        },
        body: JSON.stringify({
          name: name.trim(),
          role,
          pin: role === 'admin' ? pin.trim() : undefined,
          avatarColor,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setName('');
        setPin('');
        setRole('user');
        fetchUsers();
        if (onUsersChanged) onUsersChanged();
      } else {
        setErrorMsg(data.message || 'No se pudo crear el usuario.');
      }
    } catch {
      setErrorMsg('Error de conexión al crear usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (userToEdit: User) => {
    setEditingUserId(userToEdit.id);
    setEditingName(userToEdit.name);
    setEditingRole(userToEdit.role);
    setEditingPin('');
    setEditingAvatarColor(userToEdit.avatarColor || PRESET_COLORS[0]);
    setEditingErrorMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingName('');
    setEditingErrorMsg(null);
  };

  const handleSaveEdit = async (userId: string) => {
    const trimmedName = editingName.trim();
    if (!trimmedName) {
      setEditingErrorMsg('El nombre no puede estar vacío.');
      return;
    }
    if (editingRole === 'admin' && editingPin.trim() !== '' && editingPin.trim().length !== 4) {
      setEditingErrorMsg('El PIN del Administrador debe tener 4 dígitos.');
      return;
    }

    setEditingErrorMsg(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(currentUser),
        },
        body: JSON.stringify({
          name: trimmedName,
          role: editingRole,
          pin: editingPin.trim() || undefined,
          avatarColor: editingAvatarColor,
        }),
      });

      if (res.ok) {
        setEditingUserId(null);
        fetchUsers();
        if (onUsersChanged) onUsersChanged();
      } else {
        const data = await res.json();
        setEditingErrorMsg(data.message || 'No se pudo actualizar el usuario.');
      }
    } catch (err) {
      console.error('Error al actualizar usuario:', err);
      setEditingErrorMsg('Error de conexión al actualizar usuario.');
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    if (!window.confirm(`¿Seguro que deseas eliminar al usuario "${userToDelete.name}"?`)) return;

    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(currentUser),
      });

      if (res.ok) {
        fetchUsers();
        if (onUsersChanged) onUsersChanged();
      } else {
        const data = await res.json();
        alert(data.message || 'No se pudo eliminar el usuario.');
      }
    } catch (err) {
      console.error('Error eliminando usuario:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <UserPlus size={24} className="text-purple-400" />
            <h2 className="text-xl font-bold text-white">Gestión de Usuarios</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Create User Form */}
          <form onSubmit={handleCreateUser} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wider">Crear Nuevo Usuario</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre de usuario"
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Rol</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-gray-800 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                >
                  {(Object.keys(USER_ROLE_LABELS) as UserRole[]).map((r) => (
                    <option key={r} value={r}>
                      {USER_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {role === 'admin' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">PIN de Administrador (4 dígitos)</label>
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 1234"
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500 font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-2">Color de Perfil</label>
              <div className="flex items-center gap-3">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                  >
                    {avatarColor === color && <Check size={16} className="text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && <p className="text-xs text-red-400 font-semibold">{errorMsg}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <UserPlus size={16} />
              {submitting ? 'Creando...' : 'Crear Usuario'}
            </button>
          </form>

          {/* User List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Usuarios Registrados</h3>
            {loading ? (
              <p className="text-sm text-gray-500">Cargando...</p>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  editingUserId === u.id ? (
                    <div
                      key={u.id}
                      className="bg-purple-950/40 border border-purple-500/40 rounded-xl p-4 space-y-4 animate-fade-in"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                          Editar Perfil de {u.name}
                        </span>
                        <button
                          onClick={handleCancelEdit}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Nombre</label>
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Rol</label>
                          <select
                            value={editingRole}
                            onChange={(e) => setEditingRole(e.target.value as UserRole)}
                            className="w-full bg-gray-800 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-purple-500"
                          >
                            {(Object.keys(USER_ROLE_LABELS) as UserRole[]).map((r) => (
                              <option key={r} value={r}>
                                {USER_ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {editingRole === 'admin' && (
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            PIN (4 dígitos){' '}
                            <span className="text-[10px] text-gray-500 font-normal">
                              (dejar en blanco para mantener el actual)
                            </span>
                          </label>
                          <input
                            type="password"
                            maxLength={4}
                            value={editingPin}
                            onChange={(e) => setEditingPin(e.target.value.replace(/\D/g, ''))}
                            placeholder={u.hasPin ? '•••• (PIN activado)' : 'Ej: 1234'}
                            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-purple-500 font-mono"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Color de Perfil</label>
                        <div className="flex items-center gap-2">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditingAvatarColor(color)}
                              className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                              style={{ backgroundColor: color }}
                            >
                              {editingAvatarColor === color && <Check size={14} className="text-white drop-shadow" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {editingErrorMsg && <p className="text-xs text-red-400 font-semibold">{editingErrorMsg}</p>}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-gray-300 rounded-lg text-xs font-medium transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(u.id)}
                          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-md"
                        >
                          <Check size={14} />
                          Guardar Cambios
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={u.id}
                      className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3.5"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                          style={{ backgroundColor: u.avatarColor || '#8B5CF6' }}
                        >
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm truncate">{u.name}</span>
                            <button
                              onClick={() => handleStartEdit(u)}
                              className="text-gray-400 hover:text-purple-300 p-1 transition-colors"
                              title="Editar usuario"
                            >
                              <Pencil size={14} />
                            </button>
                            {u.role === 'admin' && (
                              <span className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                <Shield size={10} /> Admin
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {u.hasPin ? 'PIN activo' : 'Sin PIN'}
                          </span>
                        </div>
                      </div>

                      {users.filter((item) => item.role === 'admin').length > 1 || u.role !== 'admin' ? (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={u.id === currentUser?.id}
                          className="text-gray-400 hover:text-red-400 disabled:opacity-30 p-2 transition-colors shrink-0"
                          title={u.id === currentUser?.id ? 'No puedes eliminarte a ti mismo' : 'Eliminar usuario'}
                        >
                          <Trash2 size={18} />
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-500 italic shrink-0">Único Admin</span>
                      )}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
