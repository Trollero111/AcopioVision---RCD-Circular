/**
 * Paso 3: Pantalla de carga y procesamiento por fases con IA y cálculo determinista
 * RCD Circular - Monzón (Aragón)
 */

import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface ProcessingStepProps {
  currentStageText: string;
  error?: string | null;
  onRetry?: () => void;
  onCancel?: () => void;
}

const STAGES = [
  'Optimizando imágenes para análisis fotogramétrico...',
  'Visión artificial: detectando silueta del acopio y plano de apoyo...',
  'Resolviendo escala métrica con objeto de referencia...',
  'Clasificando material (Hormigón / Mixto) y nivel de limpieza...',
  'Ejecutando cálculo determinista de volumen geométrico...',
  'Calculando peso con densidad aparente y margen de incertidumbre...',
];

export const ProcessingStep: React.FC<ProcessingStepProps> = ({
  currentStageText,
  error,
  onRetry,
  onCancel,
}) => {
  const [completedStages, setCompletedStages] = useState<number>(0);

  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      setCompletedStages((prev) => {
        if (prev < STAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto py-12 px-4 animate-fade-in text-center space-y-8">
      {error ? (
        /* Estado de Error */
        <div className="bg-red-950/40 border border-red-500/50 p-6 rounded-3xl space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Error en el Análisis</h3>
            <p className="text-sm text-red-300/90 mt-1">{error}</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Volver atrás
              </button>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="py-2.5 px-6 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-red-600/30"
              >
                Reintentar análisis
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Estado de Procesamiento Activo */
        <div className="space-y-6">
          {/* Radar / Animación visual */}
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping opacity-30" />
            <div className="absolute inset-2 rounded-full border-2 border-emerald-500/40 animate-pulse" />
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-lime-500 flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-500/30">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2 font-mono">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>Procesando Visión Artificial</span>
            </h3>
            <p className="text-sm text-emerald-400 font-medium mt-1">
              {currentStageText || STAGES[completedStages]}
            </p>
          </div>

          {/* Fases secuenciales */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 text-left space-y-3">
            {STAGES.map((stage, idx) => {
              const isDone = idx < completedStages;
              const isCurrent = idx === completedStages;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 text-xs transition-colors ${
                    isDone
                      ? 'text-emerald-400 font-medium'
                      : isCurrent
                      ? 'text-white font-bold'
                      : 'text-slate-600'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                  )}
                  <span>{stage}</span>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-400 text-xs flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Fórmulas matemáticas deterministas auditables. Sin números al azar.</span>
          </div>
        </div>
      )}
    </div>
  );
};
