/**
 * Módulo de Gestión Anual, Balance Entrada/Salida e Informes
 * RCD Circular - Monzón (Aragón)
 */

import React, { useState, useMemo } from 'react';
import { PileAnalysisRecord, AppSettings } from '../../types';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Calendar,
  Download,
  Printer,
  TrendingUp,
  Scale,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
} from 'lucide-react';
import { exportService } from '../../services/exportService';

interface AnnualReportsViewProps {
  records: PileAnalysisRecord[];
  settings: AppSettings;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MATERIAL_COLORS: { [key: string]: string } = {
  'Escombro': '#f97316',
  'Hormigón': '#0284c7',
  'Madera': '#b45309',
  'Yesos y pladur': '#e2e8f0',
  'Metales': '#64748b',
  'Vidrio': '#06b6d4',
  'Cartón / embalajes': '#d97706',
  'Rafia': '#a1a1aa',
  'Plástico fino': '#ec4899',
  'Residuos peligrosos: aerosoles': '#ef4444',
  'Basura': '#71717a',
  'Árido reciclado': '#22c55e',
  'Árido reciclado de hormigón': '#16a34a',
  'Árido reciclado mixto': '#84cc16',
  'Tierra vegetal': '#ca8a04',
};

export const AnnualReportsView: React.FC<AnnualReportsViewProps> = ({
  records,
  settings,
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedPeriod, setSelectedPeriod] = useState<'todo' | 'T1' | 'T2' | 'T3' | 'T4'>('todo');
  const [selectedFilterType, setSelectedFilterType] = useState<'todos' | 'verificados' | 'estimados'>('todos');

  // Filtrar registros por año y periodo seleccionado
  const periodRecords = useMemo(() => {
    return records.filter((r) => {
      const d = new Date(r.createdAt);
      if (d.getFullYear() !== selectedYear) return false;

      const m = d.getMonth(); // 0-11
      if (selectedPeriod === 'T1' && (m < 0 || m > 2)) return false;
      if (selectedPeriod === 'T2' && (m < 3 || m > 5)) return false;
      if (selectedPeriod === 'T3' && (m < 6 || m > 8)) return false;
      if (selectedPeriod === 'T4' && (m < 9 || m > 11)) return false;

      if (selectedFilterType === 'verificados' && !r.scaleVerified) return false;
      if (selectedFilterType === 'estimados' && r.scaleVerified) return false;

      return true;
    });
  }, [records, selectedYear, selectedPeriod, selectedFilterType]);

  // Cálculos estadísticos y métricas del periodo
  const stats = useMemo(() => {
    let totalTonnes = 0;
    let totalVolume = 0;
    let verifiedTonnes = 0;
    let receivedResiduosTonnes = 0;
    let producedTratadosTonnes = 0;

    const byMaterialMap = new Map<string, { tonnes: number; volume: number; verifiedTonnes: number; count: number }>();
    const monthlyDataMap = new Map<number, { monthName: string; recibido: number; producido: number; total: number; verificado: number }>();

    for (let i = 0; i < 12; i++) {
      monthlyDataMap.set(i, {
        monthName: MONTH_NAMES[i].slice(0, 3),
        recibido: 0,
        producido: 0,
        total: 0,
        verificado: 0,
      });
    }

    periodRecords.forEach((r) => {
      const t = r.effectiveWeightTonnes;
      const v = r.effectiveVolumeM3;
      const isVerified = Boolean(r.scaleVerified);

      totalTonnes += t;
      totalVolume += v;
      if (isVerified) verifiedTonnes += t;

      const isReceived = r.aiOutput.material_classification.category === 'Residuo recibido';
      if (isReceived) {
        receivedResiduosTonnes += t;
      } else {
        producedTratadosTonnes += t;
      }

      // Por material
      const mat = r.effectiveMaterial;
      const mData = byMaterialMap.get(mat) || { tonnes: 0, volume: 0, verifiedTonnes: 0, count: 0 };
      mData.tonnes += t;
      mData.volume += v;
      if (isVerified) mData.verifiedTonnes += t;
      mData.count += 1;
      byMaterialMap.set(mat, mData);

      // Por mes
      const monthIdx = new Date(r.createdAt).getMonth();
      const mObj = monthlyDataMap.get(monthIdx);
      if (mObj) {
        if (isReceived) mObj.recibido += t;
        else mObj.producido += t;
        mObj.total += t;
        if (isVerified) mObj.verificado += t;
      }
    });

    // Serie de acumulación mensual
    let runningAccumulated = 0;
    const monthlySeries = Array.from(monthlyDataMap.entries()).map(([mIdx, val]) => {
      runningAccumulated += val.total;
      return {
        monthName: val.monthName,
        recibido: Math.round(val.recibido),
        producido: Math.round(val.producido),
        total: Math.round(val.total),
        verificado: Math.round(val.verificado),
        acumulado: Math.round(runningAccumulated),
      };
    });

    const materialList = Array.from(byMaterialMap.entries()).map(([name, data]) => ({
      name,
      tonnes: Math.round(data.tonnes),
      volume: Math.round(data.volume),
      verifiedTonnes: Math.round(data.verifiedTonnes),
      count: data.count,
      color: MATERIAL_COLORS[name] || '#94a3b8',
    }));

    // Balance de aprovechamiento
    const totalCirculado = receivedResiduosTonnes + producedTratadosTonnes;
    const recoveryRate = receivedResiduosTonnes > 0
      ? Math.min(100, Math.round((producedTratadosTonnes / receivedResiduosTonnes) * 100))
      : 82; // Referencia media RCD Circular
    const rejectionRate = Math.max(0, 100 - recoveryRate);

    const verifiedPercent = totalTonnes > 0
      ? Math.round((verifiedTonnes / totalTonnes) * 100)
      : 0;

    return {
      totalTonnes: Math.round(totalTonnes),
      totalVolume: Math.round(totalVolume),
      verifiedTonnes: Math.round(verifiedTonnes),
      verifiedPercent,
      receivedResiduosTonnes: Math.round(receivedResiduosTonnes),
      producedTratadosTonnes: Math.round(producedTratadosTonnes),
      recoveryRate,
      rejectionRate,
      monthlySeries,
      materialList,
      recordsCount: periodRecords.length,
    };
  }, [periodRecords]);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Cabecera y controles de periodo */}
      <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider block">
            RCD Circular · Auditoría Anual
          </span>
          <h2 className="text-xl font-bold text-white font-mono mt-0.5 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <span>Gestión Anual y Balance de Masa ({selectedYear})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Resumen de entradas de residuo, producción de áridos reciclados y contraste entre peso estimado por foto y báscula.
          </p>
        </div>

        {/* Selectores de año y periodo */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
          >
            <option value={currentYear}>{currentYear}</option>
            <option value={currentYear - 1}>{currentYear - 1}</option>
          </select>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            {(['todo', 'T1', 'T2', 'T3', 'T4'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1 rounded-lg transition ${
                  selectedPeriod === p
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'todo' ? 'Año Completo' : p}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => exportService.exportToCsv(periodRecords, `informe_gestion_rcd_${selectedYear}.csv`)}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* TARJETAS DE TOTALES Y DISTINCIÓN BÁSCULA VS FOTO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total gestionado */}
        <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">
            Total Gestionado en Periodo
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono">
              {stats.totalTonnes.toLocaleString('es-ES')}
            </span>
            <span className="text-sm font-bold text-emerald-400 font-mono">t</span>
          </div>
          <span className="text-[11px] text-slate-400 block font-mono">
            {stats.totalVolume.toLocaleString('es-ES')} m³ cubicados
          </span>
        </div>

        {/* Distinción Báscula vs Foto */}
        <div className="bg-slate-900/80 p-5 rounded-3xl border border-sky-500/30 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-sky-400 uppercase font-bold">
              Verificado en Báscula
            </span>
            <Scale className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black text-sky-400 font-mono">
              {stats.verifiedPercent}%
            </span>
            <span className="text-xs text-slate-400">del tonelaje</span>
          </div>
          <span className="text-[11px] text-slate-400 block font-mono">
            {stats.verifiedTonnes.toLocaleString('es-ES')} t contrastadas
          </span>
        </div>

        {/* Residuo Recibido */}
        <div className="bg-slate-900/80 p-5 rounded-3xl border border-orange-500/30 space-y-1">
          <span className="text-[10px] text-orange-400 uppercase font-bold block">
            Residuos Recibidos (Entradas)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono">
              {stats.receivedResiduosTonnes.toLocaleString('es-ES')}
            </span>
            <span className="text-sm font-bold text-orange-400 font-mono">t</span>
          </div>
          <span className="text-[11px] text-slate-400 block font-mono">
            Escombro, hormigón, madera, etc.
          </span>
        </div>

        {/* Producto Tratado Producido */}
        <div className="bg-slate-900/80 p-5 rounded-3xl border border-lime-500/30 space-y-1">
          <span className="text-[10px] text-lime-400 uppercase font-bold block">
            Áridos Tratados (Salidas)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono">
              {stats.producedTratadosTonnes.toLocaleString('es-ES')}
            </span>
            <span className="text-sm font-bold text-lime-400 font-mono">t</span>
          </div>
          <span className="text-[11px] text-slate-400 block font-mono">
            Tasa aprovechamiento: {stats.recoveryRate}%
          </span>
        </div>
      </div>

      {/* BALANCE ENTRADA VS SALIDA (% APROVECHAMIENTO Y RECHAZO) */}
      <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-mono">
            Balance Circular: Aprovechamiento vs Rechazo
          </h3>
          <span className="text-xs text-emerald-400 font-mono font-bold">
            Economía Circular RCD: {stats.recoveryRate}% Valorizado
          </span>
        </div>

        {/* Barra de progreso visual */}
        <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
          <div
            className="bg-emerald-500 transition-all flex items-center justify-center text-[10px] text-slate-950 font-bold"
            style={{ width: `${stats.recoveryRate}%` }}
            title={`Árido valorizado: ${stats.recoveryRate}%`}
          >
            {stats.recoveryRate > 15 ? `${stats.recoveryRate}% Árido` : ''}
          </div>
          <div
            className="bg-red-500 transition-all flex items-center justify-center text-[10px] text-white font-bold"
            style={{ width: `${stats.rejectionRate}%` }}
            title={`Rechazo a vertedero: ${stats.rejectionRate}%`}
          >
            {stats.rejectionRate > 10 ? `${stats.rejectionRate}% Rechazo` : ''}
          </div>
        </div>

        <div className="flex justify-between text-xs text-slate-400 pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span>Árido reciclado para segunda vida ({stats.producedTratadosTonnes} t)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            <span>Rechazo banal / no valorizable ({stats.receivedResiduosTonnes > stats.producedTratadosTonnes ? stats.receivedResiduosTonnes - stats.producedTratadosTonnes : 0} t)</span>
          </span>
        </div>
      </div>

      {/* GRÁFICOS: BARRAS APILADAS Y ACUMULADO ANUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Barras Apiladas por Mes */}
        <div className="lg:col-span-2 bg-slate-900/80 p-5 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Evolución Mensual: Entradas de Residuo vs Producción de Árido (t)</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{selectedYear}</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlySeries} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="monthName" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="recibido" name="Residuo Recibido (t)" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="producido" name="Árido Producido (t)" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut de Reparto por Material */}
        <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono">Reparto por Material</h3>
            <span className="text-xs text-slate-400 font-mono">Total {stats.totalTonnes} t</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.materialList}
                  dataKey="tonnes"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {stats.materialList.map((entry, index) => (
                    <Cell key={`donut-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val} t`, 'Peso']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-slate-300 pr-1">
            {stats.materialList.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 truncate max-w-[170px]">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="truncate">{entry.name}</span>
                </span>
                <span className="font-mono text-slate-400">{entry.tonnes} t</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TABLA DETALLADA POR MATERIAL CON AUDITORÍA DE PESAJE */}
      <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-mono">
            Desglose Anual por Material y Nivel de Verificación
          </h3>
          <span className="text-xs text-slate-400 font-mono">{stats.recordsCount} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Material</th>
                <th className="py-3 px-3">Total Toneladas</th>
                <th className="py-3 px-3">Volumen (m³)</th>
                <th className="py-3 px-3">Verificado Báscula</th>
                <th className="py-3 px-3">% Verificado</th>
                <th className="py-3 px-3 text-right">Acopios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {stats.materialList.map((m) => {
                const pct = m.tonnes > 0 ? Math.round((m.verifiedTonnes / m.tonnes) * 100) : 0;
                return (
                  <tr key={m.name} className="hover:bg-slate-850/50 transition">
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                      <span>{m.name}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-white">{m.tonnes.toLocaleString('es-ES')} t</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{m.volume.toLocaleString('es-ES')} m³</td>
                    <td className="py-3 px-3 font-mono text-sky-400">{m.verifiedTonnes.toLocaleString('es-ES')} t</td>
                    <td className="py-3 px-3">
                      <span className={`font-mono text-xs font-bold ${pct >= 50 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {pct}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">{m.count}</td>
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
