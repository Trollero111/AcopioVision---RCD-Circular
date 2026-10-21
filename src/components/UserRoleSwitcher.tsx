/**
 * Selector y Conmutador Rápido de Usuarios y Roles (RBAC)
 * RCD Circular - Monzón (Aragón)
 *
 * Permite cambiar de usuario con 1 clic para comprobar de inmediato
 * la regla de negocio:
 * - El JEFE puede verlo todo (todos los acopios, métricas de planta, auditoría y ajustes).
 * - Los OPERARIOS solo ven y gestionan lo que han subido ellos.
 */

import React, { useState, useEffect, useRef } from 'react';
import { UserAccount, UserRole, PileAnalysisRecord } from '../types';
import { userService, DEFAULT_USERS } from '../services/userService';
import {
  Crown,
  HardHat,
  Scale,
  ChevronDown,
  Check,
  UserCheck,
  ShieldCheck,
  Users,
  Plus,
  Info,
  X,
  Lock,
} from 'lucide-react';

interface UserRoleSwitcherProps {
  currentUser: UserAccount;
  onUserChange: (user: UserAccount) => void;
  records: PileAnalysisRecord[];
  onOpenUserManagement?: () => void;
}

export const UserRoleSwitcher: React.FC<UserRoleSwitcherProps> = ({
  currentUser,
  onUserChange,
  records,
  onOpenUserManagement,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<UserAccount[]>(DEFAULT_USERS);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    userService.getUsers().then((u) => {
      if (u && u.length > 0) setUsers(u);
    });
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (u: UserAccount) => {
    userService.setCurrentUser(u);
    onUserChange(u);
    setIsOpen(false);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'jefe':
        return <Crown className="w-3.5 h-3.5 text-emerald-400" />;
      case 'operario':
        return <HardHat className="w-3.5 h-3.5 text-amber-400" />;
      case 'tecnico_calidad':
        return <Scale className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  const roleInfo = userService.getRoleInfo(currentUser.role);

  // Contar acopios visibles para cada usuario
  const getUserRecordCount = (u: UserAccount) => {
    if (u.role === 'jefe' || u.role === 'tecnico_calidad') {
      return records.length;
    }
    return userService.filterRecordsForUser(records, u).length;
  };

  // Iniciales del nombre
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón principal del selector en la cabecera */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition shadow-sm text-left group"
        title="Cambiar usuario o rol de acceso"
      >
        {/* Avatar */}
        <div
          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-inner ${currentUser.avatarBg || 'bg-emerald-600'}`}
        >
          {getInitials(currentUser.name)}
        </div>

        {/* Nombre y Rol */}
        <div className="hidden sm:block leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
              {currentUser.name}
            </span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full border flex items-center gap-0.5 ${roleInfo.badgeBg} ${roleInfo.textColor} ${roleInfo.borderColor}`}
            >
              {getRoleIcon(currentUser.role)}
              <span>{roleInfo.label}</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[150px]">
            {currentUser.jobTitle}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ml-0.5 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Menú desplegable */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-3xl p-3.5 shadow-2xl z-50 animate-fade-in space-y-3">
          {/* Cabecera del panel */}
          <div className="flex items-start justify-between pb-2 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                Control de Acceso por Roles (RBAC)
              </span>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Usuarios de RCD Circular</span>
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Regla de negocio destacada */}
          <div className="p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Regla de visibilidad activa:</span>
            </div>
            <p className="text-[10.5px] leading-relaxed text-slate-300">
              El <strong>Jefe</strong> tiene visión total de la planta ({records.length} acopios). Los{' '}
              <strong>Operarios</strong> solo ven y gestionan los acopios que hayan registrado ellos.
            </p>
          </div>

          {/* Lista de usuarios para cambio rápido */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {users.map((u) => {
              const isSelected = u.id === currentUser.id;
              const uRoleInfo = userService.getRoleInfo(u.role);
              const visibleCount = getUserRecordCount(u);

              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelect(u)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition border ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                      : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs text-white ${u.avatarBg || 'bg-slate-700'}`}
                    >
                      {getInitials(u.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white truncate">{u.name}</span>
                        <span
                          className={`text-[9.5px] font-semibold px-1.5 py-0.2 rounded-full border flex items-center gap-0.5 ${uRoleInfo.badgeBg} ${uRoleInfo.textColor} ${uRoleInfo.borderColor}`}
                        >
                          {getRoleIcon(u.role)}
                          <span>{uRoleInfo.label}</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {u.jobTitle}
                      </span>
                      <span className="text-[9.5px] text-slate-500 font-mono block">
                        {u.role === 'jefe'
                          ? `Visión Total: todos los ${visibleCount} acopios`
                          : `Solo sus acopios: ${visibleCount} registros`}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    {isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-sm">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-medium text-slate-400 group-hover:text-white px-2 py-1 rounded-lg bg-slate-800/60">
                        Cambiar
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pie del desplegable */}
          {onOpenUserManagement && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[10.5px] text-slate-400 font-mono">
                {users.length} usuarios configurados
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenUserManagement();
                }}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 hover:underline"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Gestionar roles y altas</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
