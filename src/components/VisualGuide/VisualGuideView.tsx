/**
 * Guía Visual Corporativa de Clasificación y Referencias Fotográficas
 * RCD Circular - Monzón (Aragón)
 */

import React, { useState } from 'react';
import { VisualReferenceSample, AppSettings } from '../../types';
import { storageService } from '../../services/storageService';
import { processAndCompressImage } from '../../services/imageUtils';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Check,
} from 'lucide-react';

interface VisualGuideViewProps {
  settings: AppSettings;
}

export const VisualGuideView: React.FC<VisualGuideViewProps> = ({ settings }) => {
  const [samples, setSamples] = useState<VisualReferenceSample[]>(() =>
    storageService.getVisualSamples()
  );
  const [activeTab, setActiveTab] = useState<'limpieza' | 'granulometria'>('limpieza');
  const [uploadingSampleId, setUploadingSampleId] = useState<string | null>(null);

  const filteredSamples = samples.filter((s) => s.category === activeTab);

  const handleUploadCustomPhoto = async (sampleId: string, file: File) => {
    try {
      const processed = await processAndCompressImage(file, 800, 0.80);
      const updated = samples.map((s) => {
        if (s.id === sampleId) {
          return {
            ...s,
            imageThumbnail: processed.fullDataUrl,
            isDefault: false,
          };
        }
        return s;
      });
      setSamples(updated);
      storageService.saveVisualSamples(updated);
      setUploadingSampleId(null);
    } catch (e: any) {
      alert(e.message || 'Error cargando la fotografía de referencia.');
    }
  };

  const handleResetToDefault = () => {
    storageService.saveVisualSamples(storageService.getVisualSamples());
    setSamples(storageService.getVisualSamples());
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800">
        <div>
          <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider block">
            Criterios Corporativos de Inspección
          </span>
          <h2 className="text-xl font-bold text-white font-mono mt-0.5 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-400" />
            <span>Guía Visual de Calidad y Granulometrías</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Fotos de referencia de RCD Circular (Monzón). Sube imágenes de la planta para anclar los criterios visuales de limpieza y tamaños de árido.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetToDefault}
          className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 shadow-sm"
        >
          <RotateCcw className="w-4 h-4 text-slate-400" />
          <span>Restaurar Guía Estándar</span>
        </button>
      </div>

      {/* Selector de pestañas: Limpieza vs Granulometría */}
      <div className="flex gap-2 p-1.5 bg-slate-900 rounded-2xl border border-slate-800 max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('limpieza')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'limpieza'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Nivel de Limpieza / Rechazo</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('granulometria')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'granulometria'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Granulometrías de Árido</span>
        </button>
      </div>

      {/* Explicación de umbrales si estamos en limpieza */}
      {activeTab === 'limpieza' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Limpio</span>
            <span className="text-lg font-black text-white font-mono">&lt; 3%</span>
            <p className="text-[11px] text-emerald-300/80">Trituración directa sin parada de tolva.</p>
          </div>
          <div className="p-3 rounded-2xl border border-amber-500/40 bg-amber-950/20 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">Mixto</span>
            <span className="text-lg font-black text-white font-mono">3% - 10%</span>
            <p className="text-[11px] text-amber-300/80">Impropios menores dispersos.</p>
          </div>
          <div className="p-3 rounded-2xl border border-orange-500/40 bg-orange-950/20 space-y-1">
            <span className="text-[10px] uppercase font-bold text-orange-400 block">Sucio</span>
            <span className="text-lg font-black text-white font-mono">10% - 20%</span>
            <p className="text-[11px] text-orange-300/80">Requiere triaje manual (+15% tarifa).</p>
          </div>
          <div className="p-3 rounded-2xl border border-red-500/60 bg-red-950/30 space-y-1">
            <span className="text-[10px] uppercase font-bold text-red-400 block">Muy Sucio (Alerta)</span>
            <span className="text-lg font-black text-white font-mono">&gt; 20%</span>
            <p className="text-[11px] text-red-300/80">Exceso banal (+35% recargo especial).</p>
          </div>
        </div>
      )}

      {/* Muestras Visuales con Posibilidad de Subir Foto Corporativa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredSamples.map((sample) => (
          <div
            key={sample.id}
            className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between"
          >
            <div>
              {/* Imagen de referencia */}
              <div className="relative h-48 bg-slate-950 overflow-hidden group">
                <img
                  src={sample.imageThumbnail}
                  alt={sample.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                {!sample.isDefault && (
                  <span className="absolute top-2 right-2 bg-emerald-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                    Foto RCD Planta
                  </span>
                )}

                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-4">
                  <label
                    htmlFor={`upload-${sample.id}`}
                    className="py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Cambiar por foto real</span>
                  </label>
                  <input
                    id={`upload-${sample.id}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleUploadCustomPhoto(sample.id, e.target.files[0]);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Textos */}
              <div className="p-4 space-y-2">
                <h3 className="text-sm font-bold text-white font-mono">{sample.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{sample.description}</p>
              </div>
            </div>

            {/* Footer con botón de sustitución rápida */}
            <div className="p-4 pt-0">
              <label
                htmlFor={`upload-btn-${sample.id}`}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Actualizar Foto de Referencia</span>
              </label>
              <input
                id={`upload-btn-${sample.id}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleUploadCustomPhoto(sample.id, e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
