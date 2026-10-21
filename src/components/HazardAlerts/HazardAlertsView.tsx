/**
 * Módulo de Alertas de Residuos Peligrosos y Control de Calidad
 * RCD Circular - Monzón (Aragón)
 */

import React, { useState, useEffect } from 'react';
import { storageService } from '../../services/storageService';
import { AppSettings, HazardFinding } from '../../types';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  FileText,
  Clock,
  UserCheck,
  Building2,
  Sparkles,
} from 'lucide-react';

interface HazardAlertsViewProps {
  settings: AppSettings;
  onSelectRecord?: (recordId: string) => void;
}

export const HazardAlertsView: React.FC<HazardAlertsViewProps> = ({
  settings,
  onSelectRecord,
}) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendiente' | 'confirmada' | 'descartada'>('todos');
  const [reviewingAlert, setReviewingAlert] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'confirmada' | 'descartada'>('confirmada');
  const [inspectorName, setInspectorName] = useState(settings.operatorName || 'Manuel P. (Inspector MA)');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProtocol, setShowProtocol] = useState(false);

  const loadAlerts = async () => {
    const list = await storageService.getHazardAlerts();
    setAlerts(list);
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const filteredAlerts = alerts.filter((a) => {
    if (filterStatus === 'todos') return true;
    return a.status === filterStatus;
  });

  const pendingCount = alerts.filter((a) => a.status === 'pendiente').length;

  const handleSaveReview = async () => {
    if (!reviewingAlert) return;
    setIsSubmitting(true);
    try {
      await storageService.updateHazardAlertStatus(
        reviewingAlert.id,
        reviewStatus,
        inspectorName,
        reviewNotes
      );
      await loadAlerts();
      setReviewingAlert(null);
      setReviewNotes('');
    } catch (e: any) {
      alert(e.message || 'Error al actualizar el estado de la alerta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Cabecera y aviso preventivo */}
      <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-red-400 font-bold uppercase tracking-wider block">
              Seguridad Ambiental y Protocolo RCD
            </span>
            {pendingCount > 0 && (
              <span className="bg-red-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full font-mono animate-pulse">
                {pendingCount} PENDIENTES
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-white font-mono mt-0.5 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <span>Alertas de Residuos Peligrosos y No Conformidades</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cribado visual asistido para detección preventiva de fibrocemento con amianto, aerosoles, botes presurizados y envases con pictogramas químicos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowProtocol(!showProtocol)}
          className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
        >
          <FileText className="w-4 h-4 text-amber-400" />
          <span>{showProtocol ? 'Ocultar Protocolo' : 'Ver Protocolo de Actuación'}</span>
        </button>
      </div>

      {/* Protocolo de actuación desplegable */}
      {showProtocol && (
        <div className="p-5 bg-slate-900 border border-amber-500/40 rounded-3xl space-y-3 animate-fade-in text-xs text-slate-300">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Protocolo de Actuación Interno RCD Circular (Monzón)</span>
          </div>
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 whitespace-pre-line font-mono text-[11px] text-amber-200/90 leading-relaxed">
            {settings.hazardProtocolText}
          </div>
        </div>
      )}

      {/* Disclaimer legal obligatorio */}
      <div className="p-4 bg-red-950/20 border border-red-500/40 rounded-2xl text-xs text-red-200/90 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="block text-white">Cláusula de Cribado Preventivo:</strong>
          <span>
            Posible residuo peligroso: requiere revisión por un trabajador. La IA NO confirma la presencia de amianto; solo un análisis especializado de laboratorio acreditado puede certificarlo. La herramienta actúa exclusivamente como alerta preventiva para evitar accidentes en machacadoras y contaminación cruzada de áridos.
          </span>
        </div>
      </div>

      {/* Filtros de estado */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Filtrar por estado:</span>
          {(['todos', 'pendiente', 'confirmada', 'descartada'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl font-bold transition capitalize ${
                filterStatus === st
                  ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <span className="text-slate-500 font-mono">{filteredAlerts.length} alertas</span>
      </div>

      {/* Lista de Alertas */}
      {filteredAlerts.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400 text-sm">
          No hay alertas de residuos peligrosos registradas con este filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAlerts.map((alert) => {
            const isPending = alert.status === 'pendiente';
            const isConfirmed = alert.status === 'confirmada';

            return (
              <div
                key={alert.id}
                className={`bg-slate-900/80 border rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between transition ${
                  isPending
                    ? 'border-red-500/60 shadow-red-950/20'
                    : isConfirmed
                    ? 'border-amber-500/40'
                    : 'border-slate-800'
                }`}
              >
                <div>
                  {/* Foto de la alerta con marcador */}
                  <div className="relative h-44 bg-slate-950 overflow-hidden">
                    {alert.imageUrl ? (
                      <img src={alert.imageUrl} alt={alert.typeLabel} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                        Sin imagen
                      </div>
                    )}

                    <div className="absolute top-2 left-2 flex gap-1.5">
                      <span className="bg-red-950/90 text-red-300 border border-red-500/50 text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-md">
                        {alert.typeLabel || alert.type}
                      </span>
                    </div>

                    <div className="absolute top-2 right-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-md ${
                          isPending
                            ? 'bg-red-500 text-slate-950 border-red-400 font-black animate-pulse'
                            : isConfirmed
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {alert.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="absolute bottom-2 left-2">
                      <span className="bg-slate-950/80 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
                        Sospecha: {alert.suspicion_level?.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Cuerpo */}
                  <div className="p-4 space-y-2.5">
                    <div>
                      <h3 className="text-sm font-bold text-white font-mono truncate">{alert.pileName}</h3>
                      <span className="text-[11px] text-slate-400 block">{alert.location}</span>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Motivo Visual:</span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{alert.visual_reason}</p>
                    </div>

                    <div className="p-2.5 bg-amber-950/20 rounded-xl border border-amber-500/30 text-xs text-amber-200 space-y-0.5">
                      <span className="text-[10px] text-amber-400 uppercase font-bold block">Recomendación:</span>
                      <p className="text-[11px] leading-relaxed">{alert.recommendation}</p>
                    </div>

                    {/* Si ya fue revisada */}
                    {alert.reviewed_by && (
                      <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-0.5 font-mono">
                        <div>Revisado por: <strong className="text-white">{alert.reviewed_by}</strong></div>
                        <div>Fecha: {new Date(alert.reviewed_at).toLocaleString('es-ES')}</div>
                        {alert.review_notes && <div className="text-slate-300 italic">"{alert.review_notes}"</div>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewingAlert(alert);
                      setReviewStatus(alert.status === 'descartada' ? 'descartada' : 'confirmada');
                      setReviewNotes(alert.review_notes || '');
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                      isPending
                        ? 'bg-red-500 hover:bg-red-400 text-slate-950 shadow-lg shadow-red-500/20 active:scale-98'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{isPending ? 'Realizar Revisión de Seguridad' : 'Modificar Revisión'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE REVISIÓN DE ALERTA */}
      {reviewingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-2xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono">
                  Revisión e Inspección de Seguridad
                </h3>
                <span className="text-slate-400 font-mono text-[11px]">
                  {reviewingAlert.typeLabel} en {reviewingAlert.pileName}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1.5">
                  Dictamen de la Inspección Presencial:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus('confirmada')}
                    className={`py-3 px-3 rounded-xl font-bold transition border flex items-center justify-center gap-2 ${
                      reviewStatus === 'confirmada'
                        ? 'bg-red-500/20 text-red-300 border-red-500/60 ring-2 ring-red-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-red-400" />
                    <span>Residuo Peligroso Confirmado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus('descartada')}
                    className={`py-3 px-3 rounded-xl font-bold transition border flex items-center justify-center gap-2 ${
                      reviewStatus === 'descartada'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 ring-2 ring-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-emerald-400" />
                    <span>Falsa Alarma (Descartada)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Nombre del Trabajador / Inspector:
                </label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Acción Adoptada y Notas de Trazabilidad:
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej: Acordonado y retirado por empresa gestora autorizada / Descartado tras comprobar que era plástico pintado..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReviewingAlert(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveReview}
                className="py-2.5 px-5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-600/30 transition"
              >
                {isSubmitting ? 'Guardando...' : 'Registrar Inspección'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
