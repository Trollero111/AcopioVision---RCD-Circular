/**
 * Modal de Trazabilidad e Historial Inmutable de Auditoría
 * RCD Circular - Monzón (Aragón)
 */

import React, { useState, useEffect } from 'react';
import { storageService } from '../../services/storageService';
import { AuditLogEntry } from '../../types';
import { ShieldCheck, X, Clock, User, Filter, FileText } from 'lucide-react';

interface AuditLogModalProps {
  entityId?: string;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ entityId, onClose }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storageService.getAuditLogs(entityId).then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, [entityId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                Registro Inmutable de Trazabilidad (Audit Log)
              </h3>
              <p className="text-xs text-slate-400">
                {entityId ? `Histórico de cambios para: ${entityId}` : 'Histórico general de operaciones'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Cargando registros de auditoría...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No hay entradas de auditoría registradas todavía.
            </div>
          ) : (
            logs.map((log) => {
              const isCreation = log.action === 'CREACION';
              const isAdjust = log.action === 'AJUSTE_OPERARIO';
              const isWeighing = log.action === 'PESAJE_REAL';
              const isDelete = log.action === 'BORRADO_LOGICO';

              const badgeColor = isCreation
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : isAdjust
                ? 'bg-lime-500/20 text-lime-300 border-lime-500/40'
                : isWeighing
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : isDelete
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700';

              return (
                <div
                  key={log.id}
                  className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                      {log.action}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-600" />
                      <span>{new Date(log.timestamp).toLocaleString('es-ES')}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <strong className="text-white truncate max-w-[320px]">
                      {log.entityName || `${log.entityType} #${log.entityId}`}
                    </strong>
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      <span>{log.operatorUser}</span>
                    </span>
                  </div>

                  {log.notes && (
                    <p className="text-[11px] text-slate-400 italic bg-slate-900/60 p-1.5 rounded-lg">
                      "{log.notes}"
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 text-right shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
