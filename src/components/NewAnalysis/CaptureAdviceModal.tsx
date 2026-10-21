/**
 * Consejos para una captura fotogramétrica óptima de acopios
 * RCD Circular - Monzón (Aragón)
 */

import React from 'react';
import { Camera, CheckCircle2, AlertTriangle, ArrowRight, X } from 'lucide-react';

interface CaptureAdviceProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CaptureAdviceModal: React.FC<CaptureAdviceProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white font-mono">Guía de Captura en Planta y Obra</h3>
            <p className="text-xs text-slate-400">Cómo lograr la máxima precisión volumétrica</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-300">
          <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-2xl space-y-2">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">1. Toma la foto desde el suelo a cuerpo entero</strong>
                <span className="text-xs text-slate-400">
                  Encuadra el acopio completo. Es vital que se vea nítidamente la línea donde el material contacta con el suelo y la cima o cresta superior.
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-2xl space-y-2">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">2. Incluye un objeto de referencia métrica</strong>
                <span className="text-xs text-slate-400">
                  Una persona de pie (~1,75 m), el cazo de la pala (~2,6 m), un palet europeo (1,20 m) o un cono de tráfico (0,75 m) a la misma distancia del acopio anclan la escala real.
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-2xl space-y-2">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">3. Toma 2 o 3 fotos desde ángulos distintos</strong>
                <span className="text-xs text-slate-400">
                  Una vista frontal y otra lateral (a 90°) permiten resolver la profundidad y longitud real del acopio, reduciendo la incertidumbre a menos del ±10%.
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-200/90 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong>Evita recortes:</strong> Si la base queda tapada por un murete o la cúspide queda fuera de foco, la estimación geométrica perderá certidumbre.
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <span>Entendido, continuar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
