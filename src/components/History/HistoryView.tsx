/**
 * Módulo Historial e Inventario de Acopios
 * RCD Circular - Monzón (Aragón)
 */

import React, { useState, useMemo } from 'react';
import { PileAnalysisRecord, AppSettings, UserAccount } from '../../types';
import { exportService } from '../../services/exportService';
import { userService } from '../../services/userService';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  Building2,
  Scale,
  Calendar,
  MapPin,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Layers,
  Crown,
  HardHat,
  User,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { AnalysisDetectionCanvas } from '../AnalysisDetectionCanvas';

interface HistoryViewProps {
  records: PileAnalysisRecord[];
  settings: AppSettings;
  currentUser: UserAccount;
  onUpdateRecord: (record: PileAnalysisRecord) => void;
  onDeleteRecord: (id: string) => void;
  onGenerateBudget: (record: PileAnalysisRecord) => void;
  onOpenPrintModal: (record: PileAnalysisRecord) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  records,
  settings,
  currentUser,
  onUpdateRecord,
  onDeleteRecord,
  onGenerateBudget,
  onOpenPrintModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('todos');
  const [selectedLocation, setSelectedLocation] = useState<string>('todos');
  const [selectedCleanliness, setSelectedCleanliness] = useState<string>('todos');
  const [selectedOperator, setSelectedOperator] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<'date' | 'volume' | 'weight' | 'confidence'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [detailRecord, setDetailRecord] = useState<PileAnalysisRecord | null>(null);

  // Modal para registrar pesaje real de báscula
  const [weighingModalRecord, setWeighingModalRecord] = useState<PileAnalysisRecord | null>(null);
  const [ticketInput, setTicketInput] = useState('');
  const [weightInput, setWeightInput] = useState('');

  // ── REGLA DE ROLES (RBAC):
  // El JEFE puede verlo todo. Los OPERARIOS solo ven lo que hayan subido ellos.
  const userBaseRecords = useMemo(() => {
    return userService.filterRecordsForUser(records, currentUser);
  }, [records, currentUser]);

  // Lista de operarios disponibles (para filtro del Jefe)
  const operatorsList = useMemo(() => {
    const set = new Set(records.map((r) => r.operatorUser).filter(Boolean));
    return Array.from(set);
  }, [records]);

  // Opciones únicas de filtros
  const materialsList = useMemo(() => {
    const set = new Set(userBaseRecords.map((r) => r.effectiveMaterial));
    return Array.from(set);
  }, [userBaseRecords]);

  const locationsList = useMemo(() => {
    const set = new Set(userBaseRecords.map((r) => r.location));
    return Array.from(set);
  }, [userBaseRecords]);

  // Filtrado y ordenación
  const filteredRecords = useMemo(() => {
    return userBaseRecords
      .filter((r) => {
        const matchesSearch =
          !searchTerm ||
          r.pileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.effectiveMaterial.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.operatorUser && r.operatorUser.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesMaterial =
          selectedMaterial === 'todos' || r.effectiveMaterial === selectedMaterial;

        const matchesLocation =
          selectedLocation === 'todos' || r.location === selectedLocation;

        const matchesCleanliness =
          selectedCleanliness === 'todos' || r.effectiveCleanliness.level === selectedCleanliness;

        const matchesOperator =
          selectedOperator === 'todos' || r.operatorUser === selectedOperator;

        return matchesSearch && matchesMaterial && matchesLocation && matchesCleanliness && matchesOperator;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'date') {
          diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sortBy === 'volume') {
          diff = b.effectiveVolumeM3 - a.effectiveVolumeM3;
        } else if (sortBy === 'weight') {
          diff = b.effectiveWeightTonnes - a.effectiveWeightTonnes;
        } else if (sortBy === 'confidence') {
          diff = b.aiOutput.confidence_score - a.aiOutput.confidence_score;
        }
        return sortOrder === 'desc' ? diff : -diff;
      });
  }, [userBaseRecords, searchTerm, selectedMaterial, selectedLocation, selectedCleanliness, selectedOperator, sortBy, sortOrder]);

  const handleOpenWeighingModal = (record: PileAnalysisRecord) => {
    setWeighingModalRecord(record);
    setWeightInput(record.realScaleWeightTonnes ? record.realScaleWeightTonnes.toString() : '');
    setTicketInput(record.scaleTicketNumber || '');
  };

  const handleSaveWeighing = () => {
    if (!weighingModalRecord) return;
    const realTonnes = parseFloat(weightInput);
    if (isNaN(realTonnes) || realTonnes <= 0) {
      alert('Introduce un peso real válido en toneladas.');
      return;
    }

    const estimated = weighingModalRecord.effectiveWeightTonnes;
    const errorTonnes = estimated - realTonnes;
    const errorPercent = (Math.abs(errorTonnes) / realTonnes) * 100;

    const updated: PileAnalysisRecord = {
      ...weighingModalRecord,
      realScaleWeightTonnes: realTonnes,
      weightErrorTonnes: Math.round(errorTonnes * 100) / 100,
      weightErrorPercent: Math.round(errorPercent * 100) / 100,
      scaleTicketNumber: ticketInput.trim() || undefined,
      scaleWeighingDate: new Date().toISOString(),
    };

    onUpdateRecord(updated);
    if (detailRecord && detailRecord.id === updated.id) {
      setDetailRecord(updated);
    }
    setWeighingModalRecord(null);
  };

  const isJefe = currentUser.role === 'jefe';
  const isOperario = currentUser.role === 'operario';

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Banner de Rol Activo */}
      {isOperario ? (
        <div className="p-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border border-amber-500/40 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300 text-sm">Vista de Operario: {currentUser.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  Solo mis acopios
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Mostrando únicamente los <strong>{userBaseRecords.length} acopios</strong> que has registrado tú. Los acopios del resto de la planta están reservados a la supervisión del Jefe.
              </p>
            </div>
          </div>
          <div className="shrink-0 text-[11px] font-mono text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
            {userBaseRecords.length} de {records.length} totales en planta
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/20 border border-emerald-500/30 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-300 text-sm">Vista de Jefe de Planta ({currentUser.name})</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  Visión Total
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Acceso completo: puedes ver todos los <strong>{records.length} acopios</strong> subidos por cualquier operario, filtrar por cuadrilla y consultar trazabilidad global.
              </p>
            </div>
          </div>
          <div className="shrink-0 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30 font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Acceso Total Planta</span>
          </div>
        </div>
      )}

      {/* Cabecera y acciones de exportación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white font-mono flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span>Inventario de Acopios e Historial</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isOperario
              ? `Tus ${filteredRecords.length} acopios registrados en planta La Campaneta y obras comarcales.`
              : `Total ${filteredRecords.length} acopios registrados por todos los operarios en planta y obras.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportService.exportToCsv(filteredRecords)}
            className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title="Exportar registros visibles a CSV para Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>CSV Excel</span>
          </button>
          <button
            type="button"
            onClick={() => exportService.exportToJson(filteredRecords)}
            className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title="Exportar a JSON estructurado"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isJefe ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3`}>
          {/* Búsqueda */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={isOperario ? "Buscar en mis acopios o notas..." : "Buscar por acopio, operario o ubicación..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Filtro Operario (Solo visible para el Jefe) */}
          {isJefe && (
            <div>
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-emerald-300 font-medium focus:outline-none focus:border-emerald-400"
                title="Filtrar por operario que subió el acopio"
              >
                <option value="todos">Todos los operarios ({records.length})</option>
                {operatorsList.map((op) => {
                  const opCount = records.filter((r) => r.operatorUser === op).length;
                  return (
                    <option key={op} value={op}>
                      {op} ({opCount})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Filtro Material */}
          <div>
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="todos">Todos los materiales</option>
              {materialsList.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Filtro Ubicación */}
          <div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="todos">Todas las ubicaciones</option>
              {locationsList.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Filtro Limpieza */}
          <div>
            <select
              value={selectedCleanliness}
              onChange={(e) => setSelectedCleanliness(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="todos">Todos los niveles de rechazo</option>
              <option value="limpio">Limpio (&lt;3%)</option>
              <option value="mixto">Mixto (3-10%)</option>
              <option value="sucio">Sucio (10-20%)</option>
              <option value="muy_sucio">Muy sucio (&gt;20%)</option>
            </select>
          </div>
        </div>

        {/* Ordenación */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Ordenar por:</span>
            {(['date', 'volume', 'weight', 'confidence'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (sortBy === s) {
                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                  } else {
                    setSortBy(s);
                    setSortOrder('desc');
                  }
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  sortBy === s ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'hover:text-slate-200'
                }`}
              >
                {s === 'date' ? 'Fecha' : s === 'volume' ? 'Volumen' : s === 'weight' ? 'Peso' : 'Confianza'}
                {sortBy === s && (sortOrder === 'desc' ? ' ↓' : ' ↑')}
              </button>
            ))}
          </div>

          <span className="font-mono">{filteredRecords.length} resultados</span>
        </div>
      </div>

      {/* Tabla / Lista de Acopios */}
      {filteredRecords.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400">
          <p className="text-sm font-semibold">No se encontraron acopios con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((r) => {
            const hasScale = r.realScaleWeightTonnes !== undefined && r.realScaleWeightTonnes > 0;
            const primaryImg = r.images[0] || '';
            const cleanliness = r.effectiveCleanliness;

            return (
              <div
                key={r.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-3xl overflow-hidden shadow-lg transition flex flex-col justify-between"
              >
                <div>
                  {/* Imagen y badges sobre imagen */}
                  <div className="relative h-44 bg-slate-950 overflow-hidden cursor-pointer" onClick={() => setDetailRecord(r)}>
                    {primaryImg ? (
                      <img
                        src={primaryImg}
                        alt={r.pileName}
                        className="w-full h-full object-cover transition duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                        Sin foto
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                      <span className="bg-slate-950/80 backdrop-blur-md text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-800">
                        {r.effectiveMaterial}
                      </span>
                      {r.effectiveGranulometry && (
                        <span className="bg-slate-950/80 backdrop-blur-md text-sky-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-800">
                          {r.effectiveGranulometry}
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2 right-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md border ${
                          cleanliness.level === 'limpio'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                            : cleanliness.level === 'mixto'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                            : cleanliness.level === 'sucio'
                            ? 'bg-orange-950/80 text-orange-300 border-orange-500/40'
                            : 'bg-red-950/90 text-red-300 border-red-500/60 animate-pulse'
                        }`}
                      >
                        {cleanliness.level.toUpperCase()} ({cleanliness.rejection_percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>

                  {/* Cuerpo */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3
                        onClick={() => setDetailRecord(r)}
                        className="text-base font-bold text-white hover:text-emerald-400 transition cursor-pointer truncate"
                      >
                        {r.pileName || `Acopio #${r.id.slice(-4)}`}
                      </h3>
                      <div className="flex items-center gap-2 text-slate-400 text-xs mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{r.location}</span>
                      </div>
                    </div>

                    {/* Grandes cifras: Volumen y Peso */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-950 rounded-2xl border border-slate-800/80">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Volumen</span>
                        <span className="text-lg font-black text-white font-mono">
                          {r.effectiveVolumeM3.toFixed(1)} <span className="text-xs text-emerald-400 font-normal">m³</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Peso Estimado</span>
                        <span className="text-lg font-black text-white font-mono">
                          {r.effectiveWeightTonnes.toFixed(1)} <span className="text-xs text-lime-400 font-normal">t</span>
                        </span>
                      </div>
                    </div>

                    {/* Estado de Pesaje Real */}
                    {hasScale ? (
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs flex items-center justify-between">
                        <span className="text-emerald-300 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Báscula: {r.realScaleWeightTonnes} t</span>
                        </span>
                        <span className="text-emerald-400 font-mono text-[11px] font-bold">
                          Error: {r.weightErrorPercent?.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenWeighingModal(r)}
                        className="w-full py-1.5 px-3 bg-slate-800/60 hover:bg-slate-800 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <Scale className="w-3.5 h-3.5 text-sky-400" />
                        <span>Registrar pesaje de báscula</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer de Acciones con Operario */}
                <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-800/50 mt-3 pt-3">
                  <div className="flex flex-col text-[10.5px]">
                    <span className="text-slate-500 font-mono">
                      {new Date(r.createdAt).toLocaleDateString('es-ES')}
                    </span>
                    <span
                      className="text-emerald-400/90 font-medium flex items-center gap-1 truncate max-w-[140px] mt-0.5"
                      title={`Registrado por: ${r.operatorUser || 'Operario'}`}
                    >
                      <HardHat className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{r.operatorUser || 'Operario'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onGenerateBudget(r)}
                      className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-950/40 rounded-xl transition"
                      title="Generar Presupuesto Comercial"
                    >
                      <Building2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailRecord(r)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                      title="Ver Ficha Completa"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRecord(r.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition"
                      title="Eliminar Registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL FICHA DE DETALLE */}
      {detailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-5">
            <button
              onClick={() => setDetailRecord(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                Ficha Técnica de Acopio
              </span>
              <h3 className="text-xl font-bold text-white font-mono mt-1">
                {detailRecord.pileName || `Acopio #${detailRecord.id}`}
              </h3>
              <p className="text-xs text-slate-400">
                {detailRecord.location} · {new Date(detailRecord.createdAt).toLocaleString('es-ES')}
              </p>
            </div>

            {/* Detección sobre imagen */}
            <AnalysisDetectionCanvas
              imageUrl={detailRecord.images[0] || ''}
              analysisData={detailRecord.aiOutput}
              manualMeasurement={detailRecord.manualMeasurement}
              className="w-full"
            />

            {/* Dimensiones y Volúmenes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Volumen Calculado</span>
                <span className="text-lg font-bold text-white font-mono">
                  {detailRecord.effectiveVolumeM3.toFixed(1)} m³
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {detailRecord.effectiveVolumeRange[0]} - {detailRecord.effectiveVolumeRange[1]} m³
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Peso Estimado</span>
                <span className="text-lg font-bold text-white font-mono">
                  {detailRecord.effectiveWeightTonnes.toFixed(1)} t
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  d = {detailRecord.operatorAdjustments?.density_t_m3 ?? detailRecord.calculatedWeight.density_used_t_m3} t/m³
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Material</span>
                <span className="text-sm font-bold text-white block truncate">
                  {detailRecord.effectiveMaterial}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {detailRecord.effectiveGranulometry || 'Sin cribar'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Confianza IA</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {(detailRecord.aiOutput.confidence_score * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Forma: {detailRecord.operatorAdjustments?.geometric_shape || detailRecord.aiOutput.geometric_shape}
                </span>
              </div>
            </div>

            {/* Pesaje real en modal */}
            {detailRecord.realScaleWeightTonnes ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs space-y-1">
                <div className="flex justify-between items-center text-emerald-300 font-bold">
                  <span>Pesaje oficial en báscula registrado:</span>
                  <span className="font-mono">{detailRecord.realScaleWeightTonnes} t</span>
                </div>
                <div className="text-[11px] text-emerald-400/90 flex justify-between font-mono">
                  <span>Error absoluto: {detailRecord.weightErrorTonnes} t</span>
                  <span>Error porcentual: {detailRecord.weightErrorPercent}%</span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenWeighingModal(detailRecord)}
                className="w-full py-2.5 px-4 bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Scale className="w-4 h-4 text-sky-400" />
                <span>Registrar pesaje oficial de báscula para calibrar</span>
              </button>
            )}

            {detailRecord.notes && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
                <strong className="text-white block mb-0.5">Notas del operario:</strong>
                <p>{detailRecord.notes}</p>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => onOpenPrintModal(detailRecord)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                Imprimir informe
              </button>

              <button
                type="button"
                onClick={() => onGenerateBudget(detailRecord)}
                className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                <span>Generar Presupuesto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR PESAJE BÁSCULA */}
      {weighingModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setWeighingModalRecord(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-2xl">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-mono">Registrar Pesaje de Báscula</h3>
                <p className="text-xs text-slate-400">Validación y calibración de precisión</p>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400">Acopio seleccionado:</span>
                <span className="font-bold text-white block text-sm">{weighingModalRecord.pileName}</span>
                <span className="text-emerald-400 font-mono">
                  Peso estimado por IA: {weighingModalRecord.effectiveWeightTonnes.toFixed(1)} t
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Peso Real en Báscula (toneladas): *
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  placeholder="Ej: 189.2"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Número de Ticket / Albarán (opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: BAS-2026-0940"
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setWeighingModalRecord(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveWeighing}
                className="py-2.5 px-5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-bold transition shadow-lg shadow-sky-500/25"
              >
                Guardar y Calibrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
