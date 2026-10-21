/**
 * Panel de Control (Dashboard) de Stock, Trazabilidad Temporal e Inventario
 * RCD Circular - Monzón (Aragón)
 */

import React, { useMemo, useState } from 'react';
import { PileAnalysisRecord, UserAccount } from '../../types';
import { OFFICIAL_CATALOG, getCatalogItem } from '../../services/catalog';
import { userService } from '../../services/userService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Layers,
  Scale,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  Clock,
  ArrowRight,
  Sparkles,
  Calendar,
  Filter,
  CheckCircle2,
  AlertOctagon,
  Crown,
  HardHat,
  Users,
  User,
  ShieldCheck,
} from 'lucide-react';

interface DashboardViewProps {
  records: PileAnalysisRecord[];
  currentUser: UserAccount;
  onNavigateToHistory: () => void;
  onNavigateToNewAnalysis: () => void;
  onSelectRecord: (record: PileAnalysisRecord) => void;
}

type TimeRangeOption = 'all' | 'year' | '12months' | 'quarter' | 'month';

export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  currentUser,
  onNavigateToHistory,
  onNavigateToNewAnalysis,
  onSelectRecord,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'Residuo recibido' | 'Producto tratado'>('all');
  const [selectedOperator, setSelectedOperator] = useState<string>('all');

  // Base de acopios según rol (El Jefe ve todo, el Operario solo sus acopios)
  const userBaseRecords = useMemo(() => {
    return userService.filterRecordsForUser(records, currentUser);
  }, [records, currentUser]);

  // Lista de operarios para selector del Jefe
  const operatorsList = useMemo(() => {
    const set = new Set(records.map((r) => r.operatorUser).filter(Boolean));
    return Array.from(set);
  }, [records]);

  // Desglose de rendimiento por operario (solo para vista de Jefe)
  const operatorBreakdown = useMemo(() => {
    if (currentUser.role !== 'jefe') return [];
    const map = new Map<string, { operator: string; count: number; tonnes: number; verifiedTonnes: number; verifiedCount: number }>();
    records.forEach((r) => {
      const op = r.operatorUser || 'Operario Planta';
      const current = map.get(op) || { operator: op, count: 0, tonnes: 0, verifiedTonnes: 0, verifiedCount: 0 };
      current.count += 1;
      current.tonnes += r.effectiveWeightTonnes;
      if (r.realScaleWeightTonnes && r.realScaleWeightTonnes > 0) {
        current.verifiedTonnes += r.realScaleWeightTonnes;
        current.verifiedCount += 1;
      }
      map.set(op, current);
    });
    return Array.from(map.values()).sort((a, b) => b.tonnes - a.tonnes);
  }, [records, currentUser]);

  // Filtrado temporal y por operario
  const filteredRecords = useMemo(() => {
    const now = new Date();
    return userBaseRecords.filter((r) => {
      const recordDate = new Date(r.createdAt);

      // Filtro de operario (para el Jefe)
      if (currentUser.role === 'jefe' && selectedOperator !== 'all') {
        if (r.operatorUser !== selectedOperator) return false;
      }

      // Filtro de tiempo
      if (timeRange === 'month') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (recordDate < thirtyDaysAgo) return false;
      } else if (timeRange === 'quarter') {
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        if (recordDate < ninetyDaysAgo) return false;
      } else if (timeRange === '12months') {
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        if (recordDate < oneYearAgo) return false;
      } else if (timeRange === 'year') {
        const currentYear = now.getFullYear();
        if (recordDate.getFullYear() !== currentYear) return false;
      }

      // Filtro de categoría
      if (selectedCategory !== 'all') {
        const catalogItem = getCatalogItem(r.effectiveMaterial);
        const cat = catalogItem?.category || r.aiOutput.material_classification.category;
        if (cat !== selectedCategory) return false;
      }

      return true;
    });
  }, [userBaseRecords, timeRange, selectedCategory, selectedOperator, currentUser]);

  // Cálculos agregados
  const summary = useMemo(() => {
    let totalVolumeM3 = 0;
    let totalTonnes = 0;
    let totalRealTonnes = 0;
    let verifiedCount = 0;
    let totalAbsoluteError = 0;

    const materialMap = new Map<string, { volume: number; tonnes: number; count: number; category: string }>();

    filteredRecords.forEach((r) => {
      totalVolumeM3 += r.effectiveVolumeM3;
      totalTonnes += r.effectiveWeightTonnes;

      const catItem = getCatalogItem(r.effectiveMaterial);
      const category = catItem?.category || r.aiOutput.material_classification.category || 'Residuo recibido';

      const existing = materialMap.get(r.effectiveMaterial) || { volume: 0, tonnes: 0, count: 0, category };
      existing.volume += r.effectiveVolumeM3;
      existing.tonnes += r.effectiveWeightTonnes;
      existing.count += 1;
      materialMap.set(r.effectiveMaterial, existing);

      if (r.realScaleWeightTonnes && r.realScaleWeightTonnes > 0) {
        totalRealTonnes += r.realScaleWeightTonnes;
        verifiedCount += 1;
        totalAbsoluteError += Math.abs(r.effectiveWeightTonnes - r.realScaleWeightTonnes);
      }
    });

    const materialChartData = Array.from(materialMap.entries()).map(([name, data]) => {
      const catItem = getCatalogItem(name);
      return {
        name,
        tonnes: Math.round(data.tonnes),
        volume: Math.round(data.volume),
        count: data.count,
        category: data.category,
        color: catItem?.color || '#94a3b8',
      };
    });

    // Ordenar de mayor a menor toneladas
    materialChartData.sort((a, b) => b.tonnes - a.tonnes);

    // Desglose por meses para gráfico de trazabilidad anual
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyMap = new Map<string, { monthKey: string; residuoTonnes: number; tratadoTonnes: number; totalTonnes: number }>();

    filteredRecords.forEach((r) => {
      const d = new Date(r.createdAt);
      const monthKey = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      const catItem = getCatalogItem(r.effectiveMaterial);
      const isTratado = (catItem?.category || r.aiOutput.material_classification.category) === 'Producto tratado';

      const existing = monthlyMap.get(monthKey) || { monthKey, residuoTonnes: 0, tratadoTonnes: 0, totalTonnes: 0 };
      if (isTratado) {
        existing.tratadoTonnes += r.effectiveWeightTonnes;
      } else {
        existing.residuoTonnes += r.effectiveWeightTonnes;
      }
      existing.totalTonnes += r.effectiveWeightTonnes;
      monthlyMap.set(monthKey, existing);
    });

    const monthlyChartData = Array.from(monthlyMap.values()).map((m) => ({
      ...m,
      residuoTonnes: Math.round(m.residuoTonnes),
      tratadoTonnes: Math.round(m.tratadoTonnes),
      totalTonnes: Math.round(m.totalTonnes),
    }));

    // Alertas especiales
    const nonConformingConcretePiles = filteredRecords.filter(
      (r) =>
        (r.effectiveMaterial.toLowerCase().includes('hormig') || r.aiOutput.material_classification.primary_material.toLowerCase().includes('hormig')) &&
        (r.effectiveCleanliness.rejection_percentage > 0 || r.effectiveCleanliness.level !== 'limpio')
    );

    const hazardPiles = filteredRecords.filter(
      (r) =>
        r.hazardDetection?.has_hazard ||
        (r.hazardDetection?.findings && r.hazardDetection.findings.length > 0) ||
        r.effectiveMaterial.toLowerCase().includes('aerosol') ||
        (r.aiOutput.cleanliness.detected_impurities &&
          r.aiOutput.cleanliness.detected_impurities.some((i) =>
            i.toLowerCase().includes('aerosol') || i.toLowerCase().includes('amianto') || i.toLowerCase().includes('peligro')
          ))
    );

    const rejectionAlertPiles = filteredRecords.filter(
      (r) => r.effectiveCleanliness.level === 'muy_sucio' || r.effectiveCleanliness.rejection_percentage > 20
    );

    const lowConfidencePiles = filteredRecords.filter(
      (r) => r.aiOutput.confidence_score < 0.55 && !r.realScaleWeightTonnes
    );

    const averageErrorPercent =
      verifiedCount > 0 && totalRealTonnes > 0
        ? ((totalAbsoluteError / totalRealTonnes) * 100).toFixed(1)
        : null;

    return {
      totalVolumeM3: Math.round(totalVolumeM3),
      totalTonnes: Math.round(totalTonnes),
      totalRealTonnes: Math.round(totalRealTonnes),
      verifiedCount,
      averageErrorPercent,
      pileCount: filteredRecords.length,
      materialChartData,
      monthlyChartData,
      nonConformingConcretePiles,
      hazardPiles,
      rejectionAlertPiles,
      lowConfidencePiles,
    };
  }, [filteredRecords]);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Banner de Rol Activo */}
      {currentUser.role === 'operario' ? (
        <div className="p-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border border-amber-500/40 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300 text-sm">Panel de Rendimiento Personal: {currentUser.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  Operario
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Las estadísticas y métricas inferiores reflejan exclusivamente los <strong>{userBaseRecords.length} acopios</strong> que has registrado tú. La información de otras cuadrillas queda reservada a la jefatura.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToHistory}
            className="shrink-0 text-[11px] font-mono text-amber-300 hover:text-white bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-500/40 flex items-center gap-1.5 transition"
          >
            <span>Ver mis acopios ({userBaseRecords.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/20 border border-emerald-500/30 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-300 text-sm">Panel Global de Planta RCD Circular ({currentUser.name})</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  Jefe de Planta · Acceso Total
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Supervisión global de toda la planta ({records.length} acopios). Puedes filtrar por operario individual para evaluar producciones.
              </p>
            </div>
          </div>
          <div className="shrink-0 text-[11px] font-mono text-emerald-300 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/40 font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Todos los Operarios</span>
          </div>
        </div>
      )}

      {/* Título de sección y controles de trazabilidad temporal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800">
        <div>
          <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider block">
            Planta La Campaneta (Monzón) · Control Anual de Producción
          </span>
          <h2 className="text-xl font-bold text-white font-mono mt-0.5">
            Panel de Control de Stock y Trazabilidad de Pesajes
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {currentUser.role === 'operario'
              ? `Tus ${filteredRecords.length} acopios analizados y pesados.`
              : `Consulta agregada de masa gestionada a lo largo del tiempo (${filteredRecords.length} acopios), desglose por material y validación con báscula.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Operario (Solo para Jefe) */}
          {currentUser.role === 'jefe' && (
            <div className="flex items-center gap-1.5 bg-slate-950 border border-emerald-500/40 rounded-2xl p-1 text-xs">
              <HardHat className="w-4 h-4 text-emerald-400 ml-2" />
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="bg-transparent text-emerald-300 font-semibold text-xs py-1.5 pr-2 focus:outline-none cursor-pointer"
                title="Filtrar métricas por operario"
              >
                <option value="all">Todos los operarios ({records.length})</option>
                {operatorsList.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </div>
          )}

          {/* Selector de Rango Temporal */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700/80 rounded-2xl p-1 text-xs">
            <Calendar className="w-4 h-4 text-emerald-400 ml-2" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRangeOption)}
              className="bg-transparent text-white font-semibold text-xs py-1.5 pr-2 focus:outline-none cursor-pointer"
            >
              <option value="all">Todo el histórico</option>
              <option value="year">Año actual (2026)</option>
              <option value="12months">Últimos 12 meses</option>
              <option value="quarter">Último trimestre</option>
              <option value="month">Último mes</option>
            </select>
          </div>

          {/* Filtro de Categoría */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700/80 rounded-2xl p-1 text-xs">
            <Filter className="w-4 h-4 text-sky-400 ml-2" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="bg-transparent text-white font-semibold text-xs py-1.5 pr-2 focus:outline-none cursor-pointer"
            >
              <option value="all">Todas las familias</option>
              <option value="Residuo recibido">Residuo Recibido</option>
              <option value="Producto tratado">Producto Tratado</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onNavigateToNewAnalysis}
            className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Nuevo Análisis</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Toneladas */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-3xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>Stock Total Estimado</span>
            <Scale className="w-4 h-4 text-lime-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono">
              {summary.totalTonnes.toLocaleString('es-ES')}
            </span>
            <span className="text-sm font-bold text-lime-400 font-mono">t</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-2">
            Volumen: {summary.totalVolumeM3.toLocaleString('es-ES')} m³ ({summary.pileCount} acopios)
          </span>
        </div>

        {/* Trazabilidad Báscula Oficial */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-3xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>Pesaje en Báscula</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">
              {summary.totalRealTonnes.toLocaleString('es-ES')}
            </span>
            <span className="text-sm font-bold text-emerald-400 font-mono">t</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-2">
            {summary.verifiedCount} acopios contrastados {summary.averageErrorPercent ? `(Error: ±${summary.averageErrorPercent}%)` : ''}
          </span>
        </div>

        {/* Alertas de Rechazo */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-3xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>Alertas de Calidad / Rechazo</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">
              {summary.rejectionAlertPiles.length + summary.nonConformingConcretePiles.length}
            </span>
            <span className="text-xs text-slate-400">acopios</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-2">
            {summary.nonConformingConcretePiles.length > 0
              ? `${summary.nonConformingConcretePiles.length} hormigón no conforme`
              : 'Impropios > 20% pendientes de triaje'}
          </span>
        </div>

        {/* Alertas de Peligrosidad */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-3xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>Residuos Peligrosos</span>
            <AlertOctagon className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl sm:text-4xl font-black font-mono ${summary.hazardPiles.length > 0 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
              {summary.hazardPiles.length}
            </span>
            <span className="text-xs text-slate-400">detectados</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-2">
            {summary.hazardPiles.length > 0 ? '¡Alerta! Retirar inmediatamente' : 'Sin sospechas de aerosoles ni químicos'}
          </span>
        </div>
      </div>

      {/* GRÁFICO 1: EVOLUCIÓN MENSUAL / TRAZABILIDAD TEMPORAL */}
      {summary.monthlyChartData.length > 0 && (
        <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                Trazabilidad Temporal Anual
              </span>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Evolución Mensual de Toneladas Gestionadas</span>
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded-md bg-amber-500 inline-block"></span>
                Residuo Recibido
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block"></span>
                Producto Tratado
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="monthKey" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit=" t" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(val: any, name: any) => [
                    `${Number(val).toLocaleString('es-ES')} t`,
                    name === 'residuoTonnes' ? 'Residuo Recibido' : name === 'tratadoTonnes' ? 'Producto Tratado' : 'Total',
                  ]}
                />
                <Bar dataKey="residuoTonnes" fill="#f59e0b" radius={[4, 4, 0, 0]} name="residuoTonnes" stackId="a" />
                <Bar dataKey="tratadoTonnes" fill="#10b981" radius={[4, 4, 0, 0]} name="tratadoTonnes" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* GRÁFICOS: DISTRIBUCIÓN POR MATERIAL Y PORCENTAJE DE INVENTARIO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras: Toneladas por Material */}
        <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>Toneladas por Material</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Total: {summary.totalTonnes.toLocaleString('es-ES')} t
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.materialChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} unit=" t" />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${Number(value).toLocaleString('es-ES')} t`, 'Peso estimado']}
                />
                <Bar dataKey="tonnes" radius={[0, 8, 8, 0]}>
                  {summary.materialChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Circular: Reparto del Stock */}
        <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-lime-400" />
              <span>Distribución Porcentual del Stock</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {summary.materialChartData.length} familias
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.materialChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="tonnes"
                >
                  {summary.materialChartData.map((entry, index) => (
                    <Cell key={`donut-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, _name: any, item: any) => [
                    `${Number(value).toLocaleString('es-ES')} t (${(
                      (Number(value) / (summary.totalTonnes || 1)) *
                      100
                    ).toFixed(1)}%)`,
                    item.payload.name,
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-[11px] text-slate-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ALERTAS OPERATIVAS DESTACADAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Alertas de Calidad / Rechazo */}
        <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white font-mono">
                Acopios con Alerta de Calidad o Rechazo
              </h3>
            </div>
            <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              {summary.rejectionAlertPiles.length + summary.nonConformingConcretePiles.length}
            </span>
          </div>

          {summary.rejectionAlertPiles.length === 0 && summary.nonConformingConcretePiles.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">
              No hay alertas activas de rechazo ni hormigón no conforme.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {/* Hormigón no conforme primero */}
              {summary.nonConformingConcretePiles.map((r) => (
                <div
                  key={`nc-${r.id}`}
                  onClick={() => onSelectRecord(r)}
                  className="p-3 bg-red-950/40 border border-red-500/40 hover:border-red-400 rounded-2xl flex items-center justify-between cursor-pointer transition"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{r.pileName}</span>
                    <span className="text-[11px] text-red-400 font-semibold block">
                      ⚠️ Hormigón no conforme ({r.effectiveCleanliness.rejection_percentage}% impropios)
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{r.effectiveWeightTonnes.toFixed(1)} t</span>
                </div>
              ))}

              {/* Acopios muy sucios */}
              {summary.rejectionAlertPiles.map((r) => (
                <div
                  key={r.id}
                  onClick={() => onSelectRecord(r)}
                  className="p-3 bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl flex items-center justify-between cursor-pointer transition"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{r.pileName}</span>
                    <span className="text-[11px] text-amber-400 block font-mono">
                      Rechazo: {r.effectiveCleanliness.rejection_percentage}% ({r.effectiveCleanliness.level})
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{r.effectiveWeightTonnes.toFixed(1)} t</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prioridad de Contrastación con Báscula */}
        <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white font-mono">
                Pendientes de Validar en Báscula
              </h3>
            </div>
            <button
              type="button"
              onClick={onNavigateToHistory}
              className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-mono"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Acopios analizados con baja confianza (&lt;55%) o sin referencia métrica fija que requieren contrastarse con pesajes reales de báscula puente.
          </p>

          {summary.lowConfidencePiles.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">
              Todos los acopios cuentan con alta confianza o ya han sido validados con báscula.
            </p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {summary.lowConfidencePiles.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  onClick={() => onSelectRecord(r)}
                  className="p-3 bg-slate-950/80 border border-slate-800 hover:border-sky-500/40 rounded-2xl flex items-center justify-between cursor-pointer transition"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{r.pileName}</span>
                    <span className="text-[11px] text-sky-400 block font-mono">
                      Confianza IA: {(r.aiOutput.confidence_score * 100).toFixed(0)}% · {r.location}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold font-mono">
                    ~{r.effectiveWeightTonnes.toFixed(1)} t
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN EXCLUSIVA JEFE: RENDIMIENTO POR OPERARIO / CUADRILLA */}
      {currentUser.role === 'jefe' && operatorBreakdown.length > 0 && (
        <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                Supervisión de Cuadrillas y Personal
              </span>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Rendimiento y Masa Gestionada por Operario</span>
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {operatorBreakdown.length} operarios con actividad en planta
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-mono">
                  <th className="pb-3 font-semibold">Operario / Responsable</th>
                  <th className="pb-3 text-center font-semibold">Acopios Registrados</th>
                  <th className="pb-3 text-right font-semibold">Peso Estimado Foto</th>
                  <th className="pb-3 text-right font-semibold">Pesado Báscula Real</th>
                  <th className="pb-3 text-right font-semibold">% Contratación Báscula</th>
                  <th className="pb-3 text-center font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {operatorBreakdown.map((row) => {
                  const verifiedPercent = row.tonnes > 0 ? (row.verifiedTonnes / row.tonnes) * 100 : 0;
                  const isSelected = selectedOperator === row.operator;

                  return (
                    <tr
                      key={row.operator}
                      className={`hover:bg-slate-800/40 transition ${
                        isSelected ? 'bg-emerald-500/10' : ''
                      }`}
                    >
                      <td className="py-3 font-sans">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400 shrink-0">
                            <HardHat className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-white block">{row.operator}</span>
                            <span className="text-[10.5px] text-slate-400 font-mono">Operario de Planta</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-white font-bold">
                          {row.count}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold text-white">
                        {row.tonnes.toLocaleString('es-ES', { maximumFractionDigits: 1 })} t
                      </td>
                      <td className="py-3 text-right font-bold text-emerald-400">
                        {row.verifiedTonnes > 0
                          ? `${row.verifiedTonnes.toLocaleString('es-ES', { maximumFractionDigits: 1 })} t`
                          : <span className="text-slate-500 font-normal">Sin báscula</span>}
                      </td>
                      <td className="py-3 text-right">
                        {row.verifiedCount > 0 ? (
                          <span className="text-xs text-emerald-300 font-bold">
                            {verifiedPercent.toFixed(0)}% ({row.verifiedCount}/{row.count})
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">0%</span>
                        )}
                      </td>
                      <td className="py-3 text-center font-sans">
                        <button
                          type="button"
                          onClick={() => setSelectedOperator(isSelected ? 'all' : row.operator)}
                          className={`px-2.5 py-1 rounded-xl text-[10.5px] font-bold transition border ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                        >
                          {isSelected ? 'Filtrando' : 'Filtrar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
