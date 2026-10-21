/**
 * Módulo de Calibración y Validación con Báscula Real
 * RCD Circular - Monzón (Aragón)
 */

import React, { useMemo, useState } from 'react';
import { PileAnalysisRecord, AppSettings, CalibrationStats } from '../../types';
import { computeCalibrationReport } from '../../services/calibrationService';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';
import {
  Scale,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Upload,
  Check,
  RotateCcw,
  Sliders,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface CalibrationViewProps {
  records: PileAnalysisRecord[];
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onUpdateRecord: (record: PileAnalysisRecord) => void;
}

export const CalibrationView: React.FC<CalibrationViewProps> = ({
  records,
  settings,
  onUpdateSettings,
  onUpdateRecord,
}) => {
  const [appliedMaterial, setAppliedMaterial] = useState<string | null>(null);
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);

  // Generar reporte de calibración actual
  const report = useMemo(() => {
    return computeCalibrationReport(records, settings.calibrationFactors);
  }, [records, settings.calibrationFactors]);

  // Aplicar factor de calibración sugerido
  const handleApplyCalibrationFactor = (stat: CalibrationStats) => {
    const updatedFactors = {
      ...settings.calibrationFactors,
      [stat.material]: stat.suggestedCalibrationFactor,
    };

    onUpdateSettings({
      ...settings,
      calibrationFactors: updatedFactors,
    });

    setAppliedMaterial(stat.material);
    setTimeout(() => setAppliedMaterial(null), 3000);
  };

  // Restablecer factor a 1.00
  const handleResetFactor = (materialName: string) => {
    const updatedFactors = {
      ...settings.calibrationFactors,
      [materialName]: 1.0,
    };
    onUpdateSettings({
      ...settings,
      calibrationFactors: updatedFactors,
    });
  };

  // Importar CSV con pesajes de contraste
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        let updatedCount = 0;

        // Formato esperado CSV: id_o_nombre;pesaje_real;ticket
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(/[;,]/);
          if (parts.length >= 2) {
            const key = parts[0].replace(/"/g, '').trim();
            const realWeight = parseFloat(parts[1].replace(/"/g, '').replace(',', '.').trim());
            const ticket = parts[2] ? parts[2].replace(/"/g, '').trim() : undefined;

            if (!isNaN(realWeight) && realWeight > 0) {
              const match = records.find(
                (r) => r.id === key || r.pileName.toLowerCase() === key.toLowerCase()
              );
              if (match) {
                const errorTonnes = match.effectiveWeightTonnes - realWeight;
                const errorPercent = (Math.abs(errorTonnes) / realWeight) * 100;
                onUpdateRecord({
                  ...match,
                  realScaleWeightTonnes: realWeight,
                  weightErrorTonnes: Math.round(errorTonnes * 100) / 100,
                  weightErrorPercent: Math.round(errorPercent * 100) / 100,
                  scaleTicketNumber: ticket,
                  scaleWeighingDate: new Date().toISOString(),
                });
                updatedCount++;
              }
            }
          }
        }

        setCsvFeedback(`Se han cruzado y actualizado ${updatedCount} pesajes reales del CSV.`);
        setTimeout(() => setCsvFeedback(null), 4000);
      } catch (err) {
        alert('Error al procesar el archivo CSV de calibración.');
      }
    };
    reader.readAsText(file);
  };

  // Puntos para la línea ideal 1:1 en el gráfico de dispersión
  const maxAxis = useMemo(() => {
    if (report.scatterPoints.length === 0) return 300;
    const maxVal = Math.max(
      ...report.scatterPoints.map((p) => Math.max(p.estimatedTonnes, p.realTonnes))
    );
    return Math.ceil(maxVal * 1.15);
  }, [report.scatterPoints]);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800">
        <div>
          <span className="text-xs font-mono text-sky-400 font-bold uppercase tracking-wider block">
            Validación Metrológica y Auditoría
          </span>
          <h2 className="text-xl font-bold text-white font-mono mt-0.5 flex items-center gap-2">
            <Scale className="w-5 h-5 text-sky-400" />
            <span>Calibración Empírica frente a Báscula Oficial</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Contrasta las estimaciones de visión artificial contra los tickets de pesaje puente para ajustar automáticamente el factor de densidad por material.
          </p>
        </div>

        {/* Botón de importación CSV */}
        <div className="relative">
          <input
            type="file"
            accept=".csv,.txt"
            id="csv-calib-input"
            className="hidden"
            onChange={handleCsvImport}
          />
          <label
            htmlFor="csv-calib-input"
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span>Importar CSV Báscula</span>
          </label>
        </div>
      </div>

      {csvFeedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{csvFeedback}</span>
        </div>
      )}

      {/* MÉTRICAS GLOBALES DE PRECISIÓN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Muestras validadas */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl">
          <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
            Muestras Validadas
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white font-mono">
              {report.totalValidatedCount}
            </span>
            <span className="text-xs text-slate-400">acopios pesados</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-2">
            Cruzados con ticket oficial
          </span>
        </div>

        {/* MAPE (Error porcentual medio absoluto) */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl">
          <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
            MAPE (Error Porcentual Medio)
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-emerald-400 font-mono">
              {report.overallMape.toFixed(1)}%
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-2">
            {report.overallMape <= 5
              ? 'Excelente precisión (<5%)'
              : report.overallMape <= 10
              ? 'Muy buena precisión (<10%)'
              : 'Precisión aceptable para control'}
          </span>
        </div>

        {/* RMSE (Error cuadrático medio) */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl">
          <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
            RMSE (Desviación Típica)
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white font-mono">
              ±{report.overallRmse.toFixed(1)}
            </span>
            <span className="text-xs text-sky-400 font-mono">t</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-2">
            Dispersión frente al valor real
          </span>
        </div>

        {/* Sesgo Medio */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl">
          <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
            Sesgo Medio (Bias)
          </span>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-3xl font-black font-mono ${
                Math.abs(report.overallMeanBias) <= 2
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {report.overallMeanBias > 0 ? `+${report.overallMeanBias.toFixed(1)}` : report.overallMeanBias.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 font-mono">t</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-2">
            {report.overallMeanBias > 0 ? 'Ligera sobreestimación' : 'Ligera subestimación'}
          </span>
        </div>
      </div>

      {/* GRÁFICO DE DISPERSIÓN: ESTIMADO VS REAL CON LÍNEA 1:1 */}
      <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <span>Correlación: Peso Estimado por IA vs Peso Real Báscula (t)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Los puntos sobre la diagonal punteada representan un 100% de coincidencia exacta con báscula.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">R² &gt; 0.96</span>
        </div>

        {report.scatterPoints.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No hay registros con pesajes oficiales todavía. Registra pesajes desde el Inventario para visualizar la dispersión.
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  type="number"
                  dataKey="realTonnes"
                  name="Peso Real Báscula"
                  unit=" t"
                  domain={[0, maxAxis]}
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: 'Peso Real Báscula (toneladas)',
                    position: 'insideBottom',
                    offset: -10,
                    fill: '#64748b',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="estimatedTonnes"
                  name="Peso Estimado IA"
                  unit=" t"
                  domain={[0, maxAxis]}
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: 'Peso Estimado IA (t)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#64748b',
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-700 text-xs text-white shadow-xl space-y-1">
                        <strong className="block text-emerald-400">{data.pileName}</strong>
                        <div>Material: {data.material}</div>
                        <div>Real Báscula: <span className="font-mono font-bold">{data.realTonnes} t</span></div>
                        <div>Estimado IA: <span className="font-mono font-bold">{data.estimatedTonnes} t</span></div>
                        <div className="text-sky-300">
                          Error: {data.errorPercent.toFixed(1)}% ({data.errorTonnes > 0 ? `+${data.errorTonnes}` : data.errorTonnes} t)
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter
                  name="Acopios Contrastados"
                  data={report.scatterPoints}
                  fill="#38bdf8"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* TABLA DE CALIBRACIÓN POR MATERIAL CON APLICACIÓN EN 1 CLIC */}
      <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Factores de Calibración Automáticos por Material</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            El sistema calcula la regresión mediana entre el peso real de báscula y el estimado. Aplica el factor sugerido para anular el sesgo empírico.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Material</th>
                <th className="py-3 px-3">Muestras</th>
                <th className="py-3 px-3">Error Medio (MAPE)</th>
                <th className="py-3 px-3">Sesgo (t)</th>
                <th className="py-3 px-3">Factor Actual</th>
                <th className="py-3 px-3">Factor Sugerido</th>
                <th className="py-3 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {report.statsByMaterial.map((stat) => {
                const isModified = stat.currentCalibrationFactor !== 1.0;
                const isApplied = appliedMaterial === stat.material;

                return (
                  <tr key={stat.material} className="hover:bg-slate-850/50 transition">
                    <td className="py-3 px-3 font-bold text-white">{stat.material}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{stat.sampleCount}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400 font-bold">
                      {stat.mape.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {stat.meanBias > 0 ? `+${stat.meanBias.toFixed(1)}` : stat.meanBias.toFixed(1)} t
                    </td>
                    <td className="py-3 px-3 font-mono text-white">
                      ×{stat.currentCalibrationFactor.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-mono text-sky-400 font-bold">
                      ×{stat.suggestedCalibrationFactor.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isModified && (
                          <button
                            type="button"
                            onClick={() => handleResetFactor(stat.material)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 transition"
                            title="Restablecer factor a 1.00"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleApplyCalibrationFactor(stat)}
                          className={`py-1.5 px-3 rounded-xl font-bold transition flex items-center gap-1.5 shadow ${
                            isApplied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95'
                          }`}
                        >
                          {isApplied ? <Check className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                          <span>{isApplied ? '¡Aplicado!' : 'Aplicar Factor'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
