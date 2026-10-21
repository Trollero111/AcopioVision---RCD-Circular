/**
 * Cabecera superior institucional con aviso permanente de metrología
 * y Conmutador de Roles / Usuario Activo
 * RCD Circular - Monzón (Aragón)
 */

import React from 'react';
import { Sparkles, Trash2, Sun, Moon, ShieldCheck, MapPin } from 'lucide-react';
import { AppSettings, UserAccount, PileAnalysisRecord } from '../types';
import { UserRoleSwitcher } from './UserRoleSwitcher';

interface HeaderProps {
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  hasDemoData: boolean;
  onLoadDemoData: () => void;
  onClearDemoData: () => void;
  currentUser: UserAccount;
  onUserChange: (user: UserAccount) => void;
  records: PileAnalysisRecord[];
  onOpenUserManagement?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  hasDemoData,
  onLoadDemoData,
  onClearDemoData,
  currentUser,
  onUserChange,
  records,
  onOpenUserManagement,
}) => {
  const toggleTheme = () => {
    const next = settings.theme === 'light' ? 'dark' : 'light';
    onUpdateSettings({ ...settings, theme: next });
    if (next === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-md border-b border-slate-800 px-4 py-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Título móvil / Identificación */}
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold font-mono text-emerald-400 tracking-wider uppercase">
              RCD Circular
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>Planta La Campaneta (Monzón)</span>
            </span>
          </div>

          {/* Botones de acción rápida en móvil */}
          <div className="flex items-center gap-1.5 sm:hidden">
            <UserRoleSwitcher
              currentUser={currentUser}
              onUserChange={onUserChange}
              records={records}
              onOpenUserManagement={onOpenUserManagement}
            />
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
              title="Cambiar tema"
            >
              {settings.theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Aviso metrológico, selector de usuario y controles de demostración */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
          {/* Aviso obligatorio discreto */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Estimación asistida por IA. Metrología legal en báscula.</span>
          </div>

          {/* Selector de Usuario / Rol en escritorio */}
          <div className="hidden sm:block">
            <UserRoleSwitcher
              currentUser={currentUser}
              onUserChange={onUserChange}
              records={records}
              onOpenUserManagement={onOpenUserManagement}
            />
          </div>

          {/* Botón rápido datos de ejemplo */}
          <div className="flex items-center gap-2">
            {hasDemoData ? (
              <button
                type="button"
                onClick={onClearDemoData}
                className="py-1 px-2.5 bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-500/30 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition"
                title="Quitar los datos de demostración"
              >
                <Trash2 className="w-3 h-3" />
                <span>Borrar Demo</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onLoadDemoData}
                className="py-1 px-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition"
                title="Cargar acopios realistas con pesajes de báscula"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Cargar Demo</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="hidden sm:inline-flex p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
              title="Cambiar tema claro / oscuro"
            >
              {settings.theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
