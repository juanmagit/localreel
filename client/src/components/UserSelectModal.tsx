import React, { useState } from 'react';
import { Shield, KeyRound, ArrowRight, X } from 'lucide-react';
import { User } from '../types/media';
import { useUsers, useLoginMutation } from '../hooks/useUsersQuery';

interface UserSelectModalProps {
  isOpen: boolean;
  onSelectUser: (user: User) => void;
}

export const UserSelectModal: React.FC<UserSelectModalProps> = ({
  isOpen,
  onSelectUser,
}) => {
  const { data: users = [], isLoading: loading } = useUsers();
  const loginMutation = useLoginMutation();

  const [selectedUserForPin, setSelectedUserForPin] = useState<User | null>(null);
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCardClick = (user: User) => {
    setErrorMsg(null);
    if (user.role === 'admin' && user.hasPin) {
      setSelectedUserForPin(user);
      setPin('');
    } else {
      onSelectUser(user);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPin) return;

    if (pin.trim().length !== 4) {
      setErrorMsg('El PIN debe tener 4 dígitos.');
      return;
    }

    setErrorMsg(null);
    loginMutation.mutate(
      { userId: selectedUserForPin.id, pin: pin.trim() },
      {
        onSuccess: (data) => {
          if (data.success && data.user) {
            setSelectedUserForPin(null);
            setPin('');
            onSelectUser(data.user);
          } else {
            setErrorMsg(data.message || 'PIN incorrecto.');
          }
        },
        onError: (err) => {
          setErrorMsg(err.message || 'Error de conexión al verificar PIN.');
        },
      },
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-gray-900/90 border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden">
        {selectedUserForPin ? (
          <div className="flex flex-col items-center justify-center py-6 animate-scale-up">
            <button
              onClick={() => setSelectedUserForPin(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg mb-4"
              style={{ backgroundColor: selectedUserForPin.avatarColor || '#8B5CF6' }}
            >
              {getInitials(selectedUserForPin.name)}
            </div>

            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              {selectedUserForPin.name}
              <Shield size={18} className="text-amber-400" />
            </h3>
            <p className="text-sm text-gray-400 mb-6">Introduce tu PIN de Administrador</p>

            <form onSubmit={handlePinSubmit} className="w-full max-w-xs flex flex-col items-center">
              <div className="relative w-full mb-4">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={20} />
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  autoFocus
                  className="w-full bg-white/5 border border-white/20 focus:border-purple-500 rounded-xl px-10 py-3 text-center text-2xl tracking-[0.5em] text-white outline-none transition-all placeholder:tracking-normal placeholder:text-gray-600"
                />
              </div>

              {errorMsg && <p className="text-xs text-red-400 font-semibold mb-4 text-center">{errorMsg}</p>}

              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPin(null)}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loginMutation.isPending || pin.length !== 4}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-medium transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
                >
                  {loginMutation.isPending ? 'Verificando...' : 'Acceder'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-extrabold text-white mb-2">¿Quién está viendo hoy?</h2>
              <p className="text-sm text-gray-400">Selecciona tu perfil de usuario para continuar</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 py-4">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleCardClick(user)}
                    className="group flex flex-col items-center p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div
                      className="relative w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-md group-hover:scale-105 transition-transform duration-300 mb-3"
                      style={{ backgroundColor: user.avatarColor || '#8B5CF6' }}
                    >
                      {getInitials(user.name)}
                      {user.role === 'admin' && (
                        <div className="absolute -top-2 -right-2 bg-amber-500 text-gray-950 p-1.5 rounded-full shadow-lg" title="Administrador">
                          <Shield size={14} className="fill-current" />
                        </div>
                      )}
                    </div>
                    <span className="font-semibold text-white group-hover:text-purple-300 transition-colors text-base truncate max-w-[120px]">
                      {user.name}
                    </span>
                    <span className="text-xs text-gray-400 capitalize mt-0.5">
                      {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
