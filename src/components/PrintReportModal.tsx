/**
 * Modal e informe imprimible de inspección de acopio
 * RCD Circular - Monzón (Aragón)
 */

import React from 'react';
import { PileAnalysisRecord } from '../types';
import { Printer, X, Download, ShieldCheck, Scale, MapPin } from 'lucide-react';

interface PrintReportModalProps {
  record: PileAnalysisRecord | null;
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({ record, onClose }) => {
  if (!record) return null;

  const handlePrint = () => {
    window.print();
  };

  const primaryImg = record.images[0] || '';
  const cleanliness = record.effectiveCleanliness;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl my-8 space-y-6 text-slate-100 max-h-[92vh] overflow-y-auto print:max-h-none print:m-0 print:p-4 print:border-none print:bg-white print:text-black">
        {/* Barra superior de acciones (oculta en print) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold text-white font-mono">
              Vista Previa de Informe Oficial
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENIDO DEL INFORME (Apto para impresión en papel blanco) */}
        <div className="space-y-6 print:text-black">
          {/* Cabecera institucional */}
          <div className="flex items-start justify-between border-b-2 border-emerald-500 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black font-mono tracking-tight text-emerald-400 print:text-emerald-700">
                  RCD CIRCULAR
                </span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 print:bg-emerald-100 print:text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                  AcopioVision v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                Planta de Valorización La Campaneta · Monzón (Huesca, Aragón)
              </p>
              <p className="text-[11px] text-slate-500 print:text-slate-500 font-mono">
                Informe de Cubicaje y Estimación Volumétrica por Visión Artificial
              </p>
            </div>

            <div className="text-right text-xs text-slate-400 print:text-slate-600 space-y-0.5 font-mono">
              <div>Ref: <strong className="text-white print:text-black">{record.id}</strong></div>
              <div>Fecha: {new Date(record.createdAt).toLocaleDateString('es-ES')}</div>
              <div>Hora: {new Date(record.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>

          {/* Datos del Acopio */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950/60 print:bg-slate-100 p-4 rounded-2xl border border-slate-800 print:border-slate-300">
            <div>
              <span className="text-slate-500 uppercase font-bold text-[10px] block">Nombre / ID Acopio</span>
              <strong className="text-white print:text-black text-sm block truncate">{record.pileName}</strong>
            </div>
            <div>
              <span className="text-slate-500 uppercase font-bold text-[10px] block">Ubicación</span>
              <span className="text-slate-300 print:text-slate-800 font-medium block truncate">{record.location}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase font-bold text-[10px] block">Material Identificado</span>
              <strong className="text-emerald-400 print:text-emerald-800 block truncate">{record.effectiveMaterial}</strong>
            </div>
            <div>
              <span className="text-slate-500 uppercase font-bold text-[10px] block">Granulometría</span>
              <span className="text-slate-300 print:text-slate-800 font-mono block">
                {record.effectiveGranulometry || 'Bruto (sin cribar)'}
              </span>
            </div>
          </div>

          {/* Fotografía principal */}
          {primaryImg && (
            <div className="rounded-2xl overflow-hidden border border-slate-800 print:border-slate-300 max-h-72 bg-slate-950">
              <img src={primaryImg} alt={record.pileName} className="w-full h-72 object-cover" />
            </div>
          )}

          {/* RESULTADOS DESTACADOS: VOLUMEN Y PESO */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-950/20 print:bg-emerald-50 border-2 border-emerald-500/40 rounded-2xl">
              <span className="text-xs uppercase font-bold text-emerald-400 print:text-emerald-800 block mb-1">
                Volumen Calculado Determinista
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black font-mono text-white print:text-black">
                  ≈ {record.effectiveVolumeM3.toFixed(1)}
                </span>
                <span className="text-lg font-bold text-emerald-400 font-mono">m³</span>
              </div>
              <span className="text-xs text-slate-400 print:text-slate-600 font-mono block mt-1">
                Rango probable: {record.effectiveVolumeRange[0]} – {record.effectiveVolumeRange[1]} m³
              </span>
            </div>

            <div className="p-4 bg-lime-950/20 print:bg-lime-50 border-2 border-lime-500/40 rounded-2xl">
              <span className="text-xs uppercase font-bold text-lime-400 print:text-lime-800 block mb-1">
                Peso Estimado (Masa)
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black font-mono text-white print:text-black">
                  ≈ {record.effectiveWeightTonnes.toFixed(1)}
                </span>
                <span className="text-lg font-bold text-lime-400 font-mono">t</span>
              </div>
              <span className="text-xs text-slate-400 print:text-slate-600 font-mono block mt-1">
                Densidad usada: {record.operatorAdjustments?.density_t_m3 ?? record.calculatedWeight.density_used_t_m3} t/m³
              </span>
            </div>
          </div>

          {/* Desglose de Forma y Medición */}
          <div className="p-4 bg-slate-950/60 print:bg-slate-100 rounded-2xl border border-slate-800 print:border-slate-300 text-xs space-y-2">
            <strong className="text-white print:text-black block text-sm">
              Parámetros Geométricos y Auditoría de Cálculo
            </strong>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              <div>Ancho: {record.operatorAdjustments?.width_m ?? record.aiOutput.dimensions.width_m} m</div>
              <div>Fondo: {record.operatorAdjustments?.depth_m ?? record.aiOutput.dimensions.depth_m} m</div>
              <div>Altura: {record.operatorAdjustments?.height_m ?? record.aiOutput.dimensions.height_m} m</div>
              <div>Forma: {record.operatorAdjustments?.geometric_shape ?? record.aiOutput.geometric_shape}</div>
            </div>
            <div className="text-slate-400 print:text-slate-600 font-mono text-[11px] pt-1">
              Fórmula: {record.calculatedVolume.formula_applied}
            </div>
          </div>

          {/* Calidad e Inspección de Limpieza */}
          <div className="p-4 bg-slate-950/60 print:bg-slate-100 rounded-2xl border border-slate-800 print:border-slate-300 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <strong className="text-white print:text-black text-sm">
                Inspección Visual de Limpieza / Rechazo
              </strong>
              <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-slate-800 print:bg-slate-200 text-white print:text-black">
                {cleanliness.level} ({cleanliness.rejection_percentage.toFixed(1)}% impropios)
              </span>
            </div>
            <p className="text-slate-400 print:text-slate-600">
              Impropios detectados:{' '}
              {cleanliness.detected_impurities.length > 0
                ? cleanliness.detected_impurities.join(', ')
                : 'Ninguno significativo (acopio limpio)'}
            </p>
          </div>

          {/* Contraste Báscula si existe */}
          {record.realScaleWeightTonnes && (
            <div className="p-4 bg-sky-950/20 print:bg-sky-50 rounded-2xl border border-sky-500/40 text-xs space-y-1">
              <div className="flex justify-between items-center text-sky-300 print:text-sky-900 font-bold">
                <span>Pesaje Oficial de Báscula (Contraste):</span>
                <span className="font-mono text-sm">{record.realScaleWeightTonnes} t</span>
              </div>
              <div className="flex justify-between text-slate-400 print:text-slate-600 font-mono text-[11px]">
                <span>Albarán / Ticket: {record.scaleTicketNumber || 'N/A'}</span>
                <span>Error de estimación: {record.weightErrorPercent?.toFixed(1)}%</span>
              </div>
            </div>
          )}

          {/* Firmas y Cláusula de Responsabilidad */}
          <div className="pt-6 border-t border-slate-800 print:border-slate-300 grid grid-cols-2 gap-8 text-center text-xs text-slate-500 print:text-slate-600">
            <div>
              <div className="h-14 border-b border-dashed border-slate-700 print:border-slate-400 mb-1" />
              <span>Firma Operario / Inspector RCD Circular</span>
            </div>
            <div>
              <div className="h-14 border-b border-dashed border-slate-700 print:border-slate-400 mb-1" />
              <span>Conforme Transportista / Cliente</span>
            </div>
          </div>

          <div className="text-[10px] text-center text-slate-500 print:text-slate-500 font-mono pt-2">
            Aviso: Estimación volumétrica asistida por visión artificial y fotogrametría terrestre. Complementa, no sustituye, el pesaje oficial en báscula certificada de planta La Campaneta.
          </div>
        </div>
      </div>
    </div>
  );
};
