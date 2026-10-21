/**
 * Navegación principal responsive (barra lateral en escritorio / barra inferior en móvil)
 * RCD Circular - Monzón (Aragón)
 */

import React from 'react';
import {
  Sparkles,
  Layers,
  LayoutDashboard,
  Scale,
  Building2,
  BookOpen,
  Settings,
} from 'lucide-react';

export type NavTab =
  | 'nuevo'
  | 'historial'
  | 'dashboard'
  | 'calibracion'
  | 'presupuesto'
  | 'guia'
  | 'ajustes';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  recordCount: number;
  alertCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  recordCount,
  alertCount,
}) => {
  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
  }> = [
    { id: 'nuevo', label: 'Nuevo Análisis', icon: Sparkles },
    { id: 'historial', label: 'Inventario', icon: Layers, badge: recordCount },
    { id: 'dashboard', label: 'Panel Control', icon: LayoutDashboard, badge: alertCount > 0 ? alertCount : undefined, badgeColor: 'bg-red-500' },
    { id: 'calibracion', label: 'Calibración', icon: Scale },
    { id: 'presupuesto', label: 'Presupuestos', icon: Building2 },
    { id: 'guia', label: 'Guía Visual', icon: BookOpen },
    { id: 'ajustes', label: 'Ajustes', icon: Settings },
  ];

  return (
    <>
      {/* BARRA LATERAL ESCRITORIO (md y superior) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-4 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Logo y Empresa */}
          <div className="px-2 pt-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-lime-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/25">
                AV
              </div>
              <div>
                <span className="text-base font-black tracking-tight text-white font-mono block">
                  AcopioVision
                </span>
                <span className="text-[11px] font-bold text-emerald-400 block tracking-wider">
                  RCD CIRCULAR
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-2">
              Planta La Campaneta · Monzón
            </span>
          </div>

          {/* Menú de navegación */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/20 to-lime-500/10 text-emerald-300 border border-emerald-500/30 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full text-slate-950 font-bold ${
                        item.badgeColor || 'bg-emerald-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer lateral */}
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl text-[11px] text-slate-500 space-y-1">
          <div className="text-slate-400 font-semibold">RCD Circular Monzón</div>
          <div>Visión artificial & fotogrametría terrestre para áridos reciclados.</div>
        </div>
      </aside>

      {/* BARRA INFERIOR MÓVIL (táctil para campo y obra) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-2 flex items-center justify-around">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition ${
                isActive ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center font-mono">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 truncate max-w-[65px]">{item.label}</span>
            </button>
          );
        })}

        {/* Botón extra 'Más' para acceder a Guía y Ajustes en móvil */}
        <button
          type="button"
          onClick={() => onTabChange(activeTab === 'ajustes' ? 'guia' : 'ajustes')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition ${
            activeTab === 'guia' || activeTab === 'ajustes'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-1">Más</span>
        </button>
      </nav>
    </>
  );
};
