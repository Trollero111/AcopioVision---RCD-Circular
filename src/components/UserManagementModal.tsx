/**
 * Modal de Administración de Usuarios y Roles de Planta (RBAC)
 * RCD Circular - Monzón (Aragón)
 */

import React, { useState, useEffect } from 'react';
import { UserAccount, UserRole } from '../types';
import { userService, DEFAULT_USERS } from '../services/userService';
import {
  Users,
  UserPlus,
  Crown,
  HardHat,
  Scale,
  X,
  Check,
  Trash2,
  Edit2,
  ShieldAlert,
  ShieldCheck,
  Building2,
  MapPin,
  Clock,
  Info,
} from 'lucide-react';

interface UserManagementModalProps {
  currentUser: UserAccount;
  onClose: () => void;
  onUserSelected: (u: UserAccount) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  currentUser,
  onClose,
  onUserSelected,
}) => {
  const [users, setUsers] = useState<UserAccount[]>(DEFAULT_USERS);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Formulario
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('operario');
  const [formJobTitle, setFormJobTitle] = useState('');
  const [formShift, setFormShift] = useState('Turno Mañana (07:00 - 15:00)');
  const [formPlantLocation, setFormPlantLocation] = useState('Planta La Campaneta (Monzón)');
  const [formEmail, setFormEmail] = useState('');
  const [formAvatarBg, setFormAvatarBg] = useState('bg-amber-600');
  const [errorMessage, setErrorMessage] = useState('');

  const loadUsers = async () => {
    const list = await userService.getUsers();
    setUsers(list);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingUser(null);
    setFormName('');
    setFormRole('operario');
    setFormJobTitle('Operario Planta / Maquinaria');
    setFormShift('Turno Mañana (07:00 - 15:00)');
    setFormPlantLocation('Planta La Campaneta (Monzón)');
    setFormEmail('');
    setFormAvatarBg('bg-amber-600');
    setErrorMessage('');
  };

  const handleStartEdit = (u: UserAccount) => {
    setEditingUser(u);
    setIsCreating(false);
    setFormName(u.name);
    setFormRole(u.role);
    setFormJobTitle(u.jobTitle);
    setFormShift(u.shift || 'Turno Mañana');
    setFormPlantLocation(u.plantLocation);
    setFormEmail(u.email || '');
    setFormAvatarBg(u.avatarBg);
    setErrorMessage('');
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMessage('El nombre del usuario u operario es obligatorio.');
      return;
    }

    const payload: UserAccount = {
      id: editingUser ? editingUser.id : `usr-${Date.now()}`,
      name: formName.trim(),
      username: formName.trim().toLowerCase().replace(/\s+/g, '.'),
      role: formRole,
      jobTitle: formJobTitle.trim() || 'Operario RCD Circular',
      plantLocation: formPlantLocation.trim() || 'Planta La Campaneta',
      shift: formShift,
      email: formEmail.trim() || undefined,
      avatarBg: formAvatarBg,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
    };

    await userService.saveUser(payload);
    await loadUsers();
    setIsCreating(false);
    setEditingUser(null);
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar el usuario "${name}"?`)) {
      await userService.deleteUser(id);
      await loadUsers();
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'jefe':
        return <Crown className="w-4 h-4 text-emerald-400" />;
      case 'operario':
        return <HardHat className="w-4 h-4 text-amber-400" />;
      case 'tecnico_calidad':
        return <Scale className="w-4 h-4 text-purple-400" />;
    }
  };

  const avatarColors = [
    { bg: 'bg-emerald-600', label: 'Verde Esmeralda' },
    { bg: 'bg-amber-600', label: 'Ámbar / Naranja' },
    { bg: 'bg-blue-600', label: 'Azul Industrial' },
    { bg: 'bg-purple-600', label: 'Púrpura' },
    { bg: 'bg-rose-600', label: 'Rojo Carmesí' },
    { bg: 'bg-cyan-600', label: 'Cian' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-8">
        {/* Cabecera */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                RCD Circular · Control de Acceso
              </span>
            </div>
            <h3 className="text-xl font-bold text-white font-mono mt-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>Gestión de Roles y Usuarios de Planta</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configura permisos: El <strong>Jefe</strong> puede verlo todo, mientras que los{' '}
              <strong>Operarios</strong> solo tienen visibilidad de los acopios que suban ellos.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario de creación / edición */}
        {(isCreating || editingUser) ? (
          <form onSubmit={handleSaveForm} className="bg-slate-950/80 p-5 rounded-2xl border border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>{editingUser ? `Editar Usuario: ${editingUser.name}` : 'Añadir Nuevo Operario / Usuario'}</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingUser(null);
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-red-300 text-xs">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre y Apellidos *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Antonio Ruiz"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Rol de Acceso *</label>
                <select
                  value={formRole}
                  onChange={(e) => {
                    const r = e.target.value as UserRole;
                    setFormRole(r);
                    if (r === 'jefe') setFormAvatarBg('bg-emerald-600');
                    else if (r === 'tecnico_calidad') setFormAvatarBg('bg-purple-600');
                    else setFormAvatarBg('bg-amber-600');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="operario">👷 Operario (Solo ve sus acopios subidos)</option>
                  <option value="jefe">👑 Jefe de Planta (Puede verlo todo)</option>
                  <option value="tecnico_calidad">⚖️ Control Calidad y Báscula (Validación)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Puesto / Maquinaria</label>
                <input
                  type="text"
                  value={formJobTitle}
                  onChange={(e) => setFormJobTitle(e.target.value)}
                  placeholder="Ej: Operario Pala Cargadora / Retroexcavadora"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Turno de Trabajo</label>
                <select
                  value={formShift}
                  onChange={(e) => setFormShift(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Turno Mañana (07:00 - 15:00)">Turno Mañana (07:00 - 15:00)</option>
                  <option value="Turno Tarde (15:00 - 23:00)">Turno Tarde (15:00 - 23:00)</option>
                  <option value="Jornada Partida">Jornada Partida</option>
                  <option value="Jornada Completa">Jornada Completa</option>
                  <option value="Turno Continuo">Turno Continuo</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ubicación / Planta</label>
                <input
                  type="text"
                  value={formPlantLocation}
                  onChange={(e) => setFormPlantLocation(e.target.value)}
                  placeholder="Planta La Campaneta (Monzón)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email / Identificador</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="nombre@rcdcircular.es"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Selector de color de avatar */}
            <div className="pt-2">
              <label className="block text-slate-300 text-xs font-semibold mb-2">Color Distintivo del Avatar</label>
              <div className="flex items-center gap-3">
                {avatarColors.map((c) => (
                  <button
                    key={c.bg}
                    type="button"
                    onClick={() => setFormAvatarBg(c.bg)}
                    className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center transition border-2 ${
                      formAvatarBg === c.bg ? 'border-white ring-2 ring-emerald-500 scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    title={c.label}
                  >
                    {formAvatarBg === c.bg && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Usuario</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">
                Plantilla configurada ({users.length} usuarios)
              </span>
            </div>
            <button
              type="button"
              onClick={handleStartCreate}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Añadir Operario / Usuario</span>
            </button>
          </div>
        )}

        {/* Tabla / Lista de usuarios */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {users.map((u) => {
              const isActive = u.id === currentUser.id;
              const roleDetails = userService.getRoleInfo(u.role);

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-2xl border transition relative space-y-3 ${
                    isActive
                      ? 'bg-slate-800/90 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-md ${u.avatarBg || 'bg-slate-700'}`}
                      >
                        {u.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{u.name}</h4>
                          {isActive && (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40 font-bold">
                              Activo
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 block">{u.jobTitle}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(u)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                        title="Editar usuario"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!u.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Insignia de rol y descripción */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${roleDetails.badgeBg} ${roleDetails.textColor} ${roleDetails.borderColor}`}
                      >
                        {getRoleIcon(u.role)}
                        <span>{roleDetails.label}</span>
                      </span>
                      <span className="text-[10.5px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{u.shift || 'Mañana'}</span>
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {roleDetails.description}
                    </p>
                  </div>

                  {/* Botón de conectar como este usuario */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{u.plantLocation}</span>
                    </span>

                    {!isActive ? (
                      <button
                        type="button"
                        onClick={() => {
                          userService.setCurrentUser(u);
                          onUserSelected(u);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-300 text-[11px] font-bold transition flex items-center gap-1 border border-slate-700 hover:border-emerald-500"
                      >
                        <span>Conectar como este usuario</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Sesión en curso</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie con recordatorio */}
        <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Los roles se aplican en tiempo real en Inventario, Dashboard, Trazabilidad y Ajustes sin necesidad de reiniciar el servidor.
          </span>
        </div>
      </div>
    </div>
  );
};
