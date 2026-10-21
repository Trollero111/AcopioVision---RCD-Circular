/**
 * Paso 2 del flujo de análisis: Parámetros de contexto, objeto de referencia y calibración manual
 * RCD Circular - Monzón (Aragón)
 */

import React, { useState } from 'react';
import {
  ReferenceObjectOption,
  ManualMeasurement,
  AppSettings,
  PileZone,
} from '../../types';
import { PhotoSlot } from './CaptureStep';
import { AnalysisDetectionCanvas } from '../AnalysisDetectionCanvas';
import {
  Ruler,
  MapPin,
  Tag,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Scale,
  Zap,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface ContextStepProps {
  photos: PhotoSlot[];
  category: string;
  onCategoryChange: (cat: string) => void;
  selectedRefObject: ReferenceObjectOption;
  onSelectedRefObjectChange: (ref: ReferenceObjectOption) => void;
  customDimensionM: number;
  onCustomDimensionMChange: (dim: number) => void;
  wallHeightM: number;
  onWallHeightMChange: (h: number) => void;
  manualMeasurement?: ManualMeasurement;
  onManualMeasurementChange: (measurement: ManualMeasurement | undefined) => void;
  location: string;
  onLocationChange: (loc: string) => void;
  zoneId: string;
  onZoneIdChange: (zid: string) => void;
  pileName: string;
  onPileNameChange: (name: string) => void;
  operatorUser: string;
  onOperatorUserChange: (user: string) => void;
  cameraDistanceM: string;
  onCameraDistanceMChange: (dist: string) => void;
  knownRealWeightTonnes: string;
  onKnownRealWeightTonnesChange: (w: string) => void;
  notes: string;
  onNotesChange: (n: string) => void;
  highPrecisionMode: boolean;
  onHighPrecisionModeChange: (hp: boolean) => void;
  settings: AppSettings;
  onBack: () => void;
  onStartAnalysis: () => void;
}

export const ContextStep: React.FC<ContextStepProps> = ({
  photos,
  category,
  onCategoryChange,
  selectedRefObject,
  onSelectedRefObjectChange,
  customDimensionM,
  onCustomDimensionMChange,
  wallHeightM,
  onWallHeightMChange,
  manualMeasurement,
  onManualMeasurementChange,
  location,
  onLocationChange,
  zoneId,
  onZoneIdChange,
  pileName,
  onPileNameChange,
  operatorUser,
  onOperatorUserChange,
  cameraDistanceM,
  onCameraDistanceMChange,
  knownRealWeightTonnes,
  onKnownRealWeightTonnesChange,
  notes,
  onNotesChange,
  highPrecisionMode,
  onHighPrecisionModeChange,
  settings,
  onBack,
  onStartAnalysis,
}) => {
  const [isManualDrawing, setIsManualDrawing] = useState(false);
  const primaryPhoto = photos.find((p) => p.processed)?.processed?.fullDataUrl || '';

  // Al elegir una zona de acopio preconfigurada, autorrellenar contexto
  const handleZoneSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const zid = e.target.value;
    onZoneIdChange(zid);
    if (!zid) return;

    const zone = settings.zones.find((z) => z.id === zid);
    if (zone) {
      onLocationChange(zone.location);
      if (!pileName) onPileNameChange(zone.name);

      // Autoseleccionar referencia según la zona
      const refMatch = settings.referenceObjects.find((r) => r.id === zone.defaultReferenceType);
      if (refMatch) {
        onSelectedRefObjectChange(refMatch);
        onCustomDimensionMChange(zone.defaultReferenceDimensionM);
        if (zone.defaultReferenceSecondaryM) {
          onWallHeightMChange(zone.defaultReferenceSecondaryM);
        }
      }
    }
  };

  const handleRefSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = settings.referenceObjects.find((r) => r.id === e.target.value);
    if (found) {
      onSelectedRefObjectChange(found);
      onCustomDimensionMChange(found.defaultDimensionM);
      if (found.secondaryDimensionM) {
        onWallHeightMChange(found.secondaryDimensionM);
      }
      if (found.id === 'manual') {
        setIsManualDrawing(true);
      } else {
        setIsManualDrawing(false);
      }
    }
  };

  const isSinReferencia = selectedRefObject.id === 'sin_referencia';
  const isManual = selectedRefObject.id === 'manual';
  const isParedMuro = selectedRefObject.id === 'pared_muro';
  const isPaloGraduado = selectedRefObject.id === 'palo_graduado';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Título de sección */}
      <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>Paso 2: Parámetros de Escala, Zona y Trazabilidad</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Coloca un palo de altura conocida junto al acopio o encuadra la pared medida del box para anclar la escala métrica real.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda: Formulario de Parámetros */}
        <div className="space-y-4">
          {/* Selector Rápido de Zona de Acopio */}
          <div className="bg-gradient-to-r from-emerald-950/30 to-slate-900/80 p-4 rounded-2xl border border-emerald-500/30 space-y-2">
            <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zona de Acopio Habitual (Preconfigurada)</span>
            </label>
            <select
              value={zoneId}
              onChange={handleZoneSelect}
              className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
            >
              <option value="">Seleccionar zona de acopio (autorellena medidas y box)...</option>
              {settings.zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.location})
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-400 block">
              Al seleccionar una zona, las dimensiones del muro o jalón fijo se rellenan automáticamente.
            </span>
          </div>

          {/* Categoría de material */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Categoría del acopio
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Detectar automáticamente', label: 'Detectar (IA)' },
                { id: 'Residuo recibido', label: 'Residuo Recibido' },
                { id: 'Producto tratado', label: 'Producto Tratado' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onCategoryChange(c.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition border ${
                    category === c.id
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Objeto de referencia de escala */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-emerald-400" />
              <span>Objeto o Pared de Referencia de Escala</span>
            </label>

            <select
              value={selectedRefObject.id}
              onChange={handleRefSelect}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {settings.referenceObjects.map((ref) => (
                <option key={ref.id} value={ref.id}>
                  {ref.name} {ref.defaultDimensionM > 0 ? `(${ref.defaultDimensionM.toFixed(2)} m)` : ''}
                </option>
              ))}
            </select>

            {/* Ajuste de dimensión del objeto si aplica */}
            {!isSinReferencia && !isManual && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 shrink-0">
                    {selectedRefObject.dimensionLabel}:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="30"
                      value={customDimensionM}
                      onChange={(e) => onCustomDimensionMChange(parseFloat(e.target.value) || 0)}
                      className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-xs text-slate-400 font-mono">metros</span>
                  </div>
                </div>

                {/* Si es pared o muro, mostrar segundo campo para altura */}
                {isParedMuro && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 shrink-0">
                      Altura del muro:
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="15"
                        value={wallHeightM}
                        onChange={(e) => onWallHeightMChange(parseFloat(e.target.value) || 2.5)}
                        className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-xs text-slate-400 font-mono">metros</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Alerta sin referencia */}
            {isSinReferencia && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Aviso de Escala:</strong> Sin referencia visual, la confianza máxima queda topada al 45% y el rango de incertidumbre aumentará a ±30-35%.
                </span>
              </div>
            )}

            {/* Calibración manual trazada */}
            {isManual && (
              <div className="p-3 bg-pink-950/30 border border-pink-500/40 rounded-xl text-xs space-y-2">
                <div className="text-pink-300 font-semibold flex items-center justify-between">
                  <span>Traza una línea sobre la foto de la derecha:</span>
                  <button
                    type="button"
                    onClick={() => setIsManualDrawing(!isManualDrawing)}
                    className={`px-2 py-1 rounded text-[11px] font-bold ${
                      isManualDrawing ? 'bg-pink-500 text-white' : 'bg-slate-800 text-pink-300'
                    }`}
                  >
                    {isManualDrawing ? 'Modo activo' : 'Activar lápiz'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-300">Longitud real de la línea:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50"
                    value={manualMeasurement?.realMeters || customDimensionM}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 1.0;
                      onCustomDimensionMChange(val);
                      if (manualMeasurement) {
                        onManualMeasurementChange({
                          ...manualMeasurement,
                          realMeters: val,
                        });
                      }
                    }}
                    className="w-20 bg-slate-950 border border-pink-500/50 rounded px-2 py-1 text-sm font-mono text-white text-center"
                  />
                  <span className="text-slate-400 font-mono">metros</span>
                </div>
              </div>
            )}
          </div>

          {/* Ubicación, nombre de acopio y Operario */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ubicación</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => onLocationChange(e.target.value)}
                  placeholder="Ej: Planta La Campaneta / Obra Cinca"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nombre / ID Acopio</span>
                </label>
                <input
                  type="text"
                  value={pileName}
                  onChange={(e) => onPileNameChange(e.target.value)}
                  placeholder="Ej: Box 1 - Escombro Sucio"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Operario y pesaje real */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1 mb-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Operario / Inspector:</span>
                </label>
                <input
                  type="text"
                  value={operatorUser}
                  onChange={(e) => onOperatorUserChange(e.target.value)}
                  placeholder="Ej: Carlos M. (Palista)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1 mb-1">
                  <Scale className="w-3.5 h-3.5 text-sky-400" />
                  <span>Pesaje real báscula (opcional):</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={knownRealWeightTonnes}
                    onChange={(e) => onKnownRealWeightTonnesChange(e.target.value)}
                    placeholder="Ej: 184.5"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">t</span>
                </div>
              </div>
            </div>

            {/* Modo alta precisión */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-xs font-semibold text-white block">Modo Alta Precisión (3 Muestreos)</span>
                  <span className="text-[11px] text-slate-400">
                    Ejecuta 3 análisis independientes y toma la mediana de dimensiones
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={highPrecisionMode}
                onChange={(e) => onHighPrecisionModeChange(e.target.checked)}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Columna Derecha: Vista previa interactiva de la foto */}
        <div className="flex flex-col space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Vista previa para análisis</span>
            <span className="text-[11px] text-slate-400 font-mono">Foto 1 (Principal)</span>
          </div>

          <div className="flex-1 min-h-[340px]">
            {primaryPhoto ? (
              <AnalysisDetectionCanvas
                imageUrl={primaryPhoto}
                manualMeasurement={manualMeasurement}
                onManualMeasurementChange={onManualMeasurementChange}
                isManualDrawingEnabled={isManualDrawing}
                onToggleManualDrawing={setIsManualDrawing}
                className="w-full h-full min-h-[340px]"
              />
            ) : (
              <div className="w-full h-full min-h-[340px] bg-slate-900/50 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
                Sin fotografía principal cargada
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botones de navegación */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="py-3 px-5 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Atrás: Fotos</span>
        </button>

        <button
          type="button"
          onClick={onStartAnalysis}
          className="py-3.5 px-8 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-slate-950 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-98"
        >
          <Sparkles className="w-4 h-4" />
          <span>Estimar Peso y Volumen con IA</span>
        </button>
      </div>
    </div>
  );
};
