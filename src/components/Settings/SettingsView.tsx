/**
 * Módulo de Ajustes y Configuración Técnica
 * RCD Circular - Monzón (Aragón)
 */

import React, { useState } from 'react';
import { AppSettings, ReferenceObjectOption, UserAccount } from '../../types';
import { storageService, DEFAULT_SETTINGS } from '../../services/storageService';
import { userService } from '../../services/userService';
import {
  Settings,
  Scale,
  Ruler,
  Layers,
  AlertTriangle,
  RotateCcw,
  Check,
  Download,
  Upload,
  Database,
  Trash2,
  Sparkles,
  DollarSign,
  Sun,
  Moon,
  Users,
  Crown,
  HardHat,
  Lock,
  UserCheck,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  currentUser: UserAccount;
  onUpdateSettings: (settings: AppSettings) => void;
  onLoadDemoData: () => void;
  onClearDemoData: () => void;
  onClearAllData: () => void;
  hasDemoData: boolean;
  onOpenUserManagement?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  currentUser,
  onUpdateSettings,
  onLoadDemoData,
  onClearDemoData,
  onClearAllData,
  hasDemoData,
  onOpenUserManagement,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newGranulometry, setNewGranulometry] = useState('');

  const handleSave = () => {
    onUpdateSettings(localSettings);
    storageService.saveSettings(localSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleResetDefaults = () => {
    if (confirm('¿Restablecer todos los parámetros y densidades a los valores de fábrica de RCD Circular?')) {
      setLocalSettings(DEFAULT_SETTINGS);
      onUpdateSettings(DEFAULT_SETTINGS);
      storageService.saveSettings(DEFAULT_SETTINGS);
    }
  };

  const handleDensityChange = (material: string, val: number) => {
    setLocalSettings({
      ...localSettings,
      densities: {
        ...localSettings.densities,
        [material]: val,
      },
    });
  };

  const handleAddGranulometry = () => {
    if (!newGranulometry.trim()) return;
    const clean = newGranulometry.trim();
    if (!localSettings.granulometries.includes(clean)) {
      setLocalSettings({
        ...localSettings,
        granulometries: [...localSettings.granulometries, clean],
      });
      setNewGranulometry('');
    }
  };

  const handleRemoveGranulometry = (gran: string) => {
    setLocalSettings({
      ...localSettings,
      granulometries: localSettings.granulometries.filter((g) => g !== gran),
    });
  };

  const handleExportBackup = () => {
    const jsonStr = storageService.exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_acopiovision_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const ok = storageService.restoreBackupJson(content);
      if (ok) {
        alert('Copia de seguridad restaurada correctamente. La página se recargará.');
        window.location.reload();
      } else {
        alert('Archivo de copia de seguridad no válido o dañado.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Cabecera y guardado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800">
        <div>
          <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider block">
            Parámetros y Tablas Maestras
          </span>
          <h2 className="text-xl font-bold text-white font-mono mt-0.5 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <span>Ajustes de Planta y Modelado</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configuración de densidades aparentes, granulometrías normalizadas y objetos métricos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Valores de fábrica</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`py-2.5 px-5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 active:scale-95'
            }`}
          >
            {saveSuccess ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
            <span>{saveSuccess ? '¡Guardado!' : 'Guardar Ajustes'}</span>
          </button>
        </div>
      </div>

      {/* 1. DENSIDADES APARENTES */}
      <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span>Densidades Aparentes de Partida (t/m³)</span>
          </h3>
          <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-medium">
            Valores orientativos pendientes de calibrar con báscula
          </span>
        </div>

        <p className="text-xs text-slate-400">
          La masa estimada se calcula multiplicando el volumen geométrico (m³) por esta densidad aparente.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {Object.entries(localSettings.densities).map(([mat, dens]) => (
            <div
              key={mat}
              className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3"
            >
              <div className="truncate">
                <span className="text-xs font-semibold text-white block truncate">{mat}</span>
                <span className="text-[10px] text-slate-500 block font-mono">
                  Calibración: ×{(localSettings.calibrationFactors[mat] || 1).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  step="0.05"
                  min="0.4"
                  max="2.5"
                  value={dens}
                  onChange={(e) => handleDensityChange(mat, parseFloat(e.target.value) || 1.0)}
                  className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[11px] text-slate-500 font-mono">t/m³</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. GRANULOMETRÍAS NORMALIZADAS */}
      <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Granulometrías de Producto Tratado (Árido Reciclado)</span>
          </h3>
          <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-medium">
            Valores iniciales: 0-20, 20-40, 40-80 mm (pendientes de confirmar con RCD Circular)
          </span>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {localSettings.granulometries.map((gran) => (
            <span
              key={gran}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white"
            >
              <span>{gran}</span>
              <button
                type="button"
                onClick={() => handleRemoveGranulometry(gran)}
                className="text-slate-500 hover:text-red-400 transition"
                title="Eliminar"
              >
                ×
              </button>
            </span>
          ))}

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Ej: 0-6 mm"
              value={newGranulometry}
              onChange={(e) => setNewGranulometry(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono w-28 focus:outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={handleAddGranulometry}
              className="py-1.5 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-bold transition"
            >
              + Añadir
            </button>
          </div>
        </div>
      </div>

      {/* 3. UMBRALES DE RECHAZO Y TARIFAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Umbrales de rechazo */}
        <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Umbrales de Rechazo e Impropios</span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2 bg-slate-950 rounded-xl">
              <span className="text-slate-300">Limpio (máx % impropios):</span>
              <span className="font-mono font-bold text-emerald-400">&lt; 3.0 %</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950 rounded-xl">
              <span className="text-slate-300">Mixto (rango):</span>
              <span className="font-mono font-bold text-amber-400">3.0 % - 10.0 %</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950 rounded-xl">
              <span className="text-slate-300">Sucio (rango):</span>
              <span className="font-mono font-bold text-orange-400">10.0 % - 20.0 %</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950 rounded-xl">
              <span className="text-slate-300">Muy Sucio (Alerta):</span>
              <span className="font-mono font-bold text-red-400">&gt; 20.0 %</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950 rounded-xl">
              <span className="text-slate-300">Recargo tarifa por Muy Sucio:</span>
              <span className="font-mono font-bold text-red-400">
                +{localSettings.rejectionThresholds.surchargePercentMuySucio}%
              </span>
            </div>
          </div>
        </div>

        {/* Opciones avanzadas del motor */}
        <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-lime-400" />
            <span>Opciones de Modelado y Densidad</span>
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl cursor-pointer">
              <div>
                <span className="font-bold text-white block">Reducción de densidad por rechazo</span>
                <span className="text-slate-400 text-[11px]">
                  Deduce densidad si abundan plásticos o maderas voluminosas de bajo peso específico
                </span>
              </div>
              <input
                type="checkbox"
                checked={localSettings.reduceDensityOnRejection}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, reduceDensityOnRejection: e.target.checked })
                }
                className="w-5 h-5 accent-emerald-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl cursor-pointer">
              <div>
                <span className="font-bold text-white block">Modo Alta Precisión por defecto</span>
                <span className="text-slate-400 text-[11px]">
                  Activa muestreo fotogramétrico refinado en todos los nuevos análisis
                </span>
              </div>
              <input
                type="checkbox"
                checked={localSettings.highPrecisionMode}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, highPrecisionMode: e.target.checked })
                }
                className="w-5 h-5 accent-emerald-500 rounded"
              />
            </label>
          </div>
        </div>
      </div>

      {/* 4. GESTIÓN DE USUARIOS Y CONTROL DE ACCESO (RBAC) */}
      <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider block">
              Control de Accesos y Permisos (RBAC)
            </span>
            <h3 className="text-sm font-bold text-white font-mono mt-0.5 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Usuarios de Planta y Roles de Seguridad</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              El <strong>Jefe de Planta</strong> puede verlo todo (todos los acopios, dashboard global y ajustes). Los <strong>Operarios</strong> solo tienen acceso a los acopios que hayan subido ellos.
            </p>
          </div>

          {onOpenUserManagement && (
            <button
              type="button"
              onClick={onOpenUserManagement}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 shrink-0"
            >
              <Users className="w-4 h-4" />
              <span>Administrar Usuarios y Roles</span>
            </button>
          )}
        </div>

        {/* Tarjeta de Sesión Activa */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm text-white ${currentUser.avatarBg || 'bg-emerald-600'}`}>
              {currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{currentUser.name}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  currentUser.role === 'jefe'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  {currentUser.role === 'jefe' ? <Crown className="w-3 h-3 text-emerald-400" /> : <HardHat className="w-3 h-3 text-amber-400" />}
                  <span>{currentUser.role === 'jefe' ? 'Jefe de Planta (Acceso Total)' : 'Operario (Solo sus acopios)'}</span>
                </span>
              </div>
              <span className="text-xs text-slate-400">{currentUser.jobTitle} · {currentUser.plantLocation}</span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            {currentUser.role === 'jefe' ? 'Permisos: Ver todo + Editar Ajustes' : 'Permisos: Subir acopios + Ver los propios'}
          </div>
        </div>
      </div>

      {/* 5. GESTIÓN DE DATOS: DEMO, BACKUP Y BORRADO */}
      <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Gestión de Datos y Copias de Seguridad</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Cargar / Borrar demo */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Datos de Demostración</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Rellena el historial con acopios distribuidos entre el Jefe y Operarios.
              </span>
            </div>
            {hasDemoData ? (
              <button
                type="button"
                onClick={onClearDemoData}
                className="w-full py-2 px-3 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar Datos Demo</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onLoadDemoData}
                className="w-full py-2 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cargar Datos Ejemplo</span>
              </button>
            )}
          </div>

          {/* Exportar Backup JSON */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Copia de Seguridad JSON</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Exporta el inventario completo, usuarios, factores de calibración y fotos.
              </span>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Descargar Copia JSON</span>
            </button>
          </div>

          {/* Restaurar Backup JSON */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Restaurar Copia</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Carga un archivo de respaldo previo en formato JSON.
              </span>
            </div>
            {currentUser.role === 'jefe' ? (
              <label className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Subir Archivo JSON</span>
                <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
              </label>
            ) : (
              <div className="w-full py-2 px-3 bg-slate-900 text-slate-500 border border-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed" title="Solo el Jefe de Planta puede restaurar bases de datos">
                <Lock className="w-3.5 h-3.5" />
                <span>Restaurar (Solo Jefe)</span>
              </div>
            )}
          </div>

          {/* Vaciar todo el historial */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Vaciar Historial Completo</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Pone a cero la base de datos de acopios e informes.
              </span>
            </div>
            {currentUser.role === 'jefe' ? (
              <button
                type="button"
                onClick={onClearAllData}
                className="w-full py-2 px-3 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar Todo a Cero</span>
              </button>
            ) : (
              <div className="w-full py-2 px-3 bg-slate-900 text-slate-500 border border-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed" title="Solo el Jefe de Planta puede vaciar la base de datos">
                <Lock className="w-3.5 h-3.5" />
                <span>Vaciar (Solo Jefe)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
