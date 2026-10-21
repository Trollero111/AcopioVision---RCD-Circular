/**
 * Servicio de exportación a CSV, JSON y portapapeles para AcopioVision
 * RCD Circular - Monzón (Aragón)
 */

import { PileAnalysisRecord } from '../types';

export const exportService = {
  /**
   * Exporta la lista de acopios a CSV (con BOM UTF-8 y separador punto y coma para Excel en español)
   */
  exportToCsv(records: PileAnalysisRecord[], filename = 'acopios_rcd_circular.csv'): void {
    const headers = [
      'ID',
      'Nombre Acopio',
      'Ubicación',
      'Fecha',
      'Material',
      'Granulometría',
      'Nivel Limpieza',
      'Rechazo (%)',
      'Forma Geométrica',
      'Ancho Base (m)',
      'Fondo Base (m)',
      'Altura Máx (m)',
      'Volumen Nominal (m³)',
      'Volumen Mín (m³)',
      'Volumen Máx (m³)',
      'Peso Estimado (t)',
      'Peso Mín (t)',
      'Peso Máx (t)',
      'Densidad Usada (t/m³)',
      'Confianza IA (%)',
      'Pesaje Real Báscula (t)',
      'Error Pesaje (t)',
      'Error Pesaje (%)',
      'Notas',
    ];

    const rows = records.map((r) => [
      r.id,
      escapeCsv(r.pileName),
      escapeCsv(r.location),
      new Date(r.createdAt).toLocaleString('es-ES'),
      escapeCsv(r.effectiveMaterial),
      escapeCsv(r.effectiveGranulometry || 'N/A'),
      r.effectiveCleanliness.level,
      r.effectiveCleanliness.rejection_percentage.toFixed(1),
      r.operatorAdjustments?.geometric_shape || r.aiOutput.geometric_shape,
      (r.operatorAdjustments?.width_m ?? r.aiOutput.dimensions.width_m).toFixed(2),
      (r.operatorAdjustments?.depth_m ?? r.aiOutput.dimensions.depth_m).toFixed(2),
      (r.operatorAdjustments?.height_m ?? r.aiOutput.dimensions.height_m).toFixed(2),
      r.effectiveVolumeM3.toFixed(2),
      r.effectiveVolumeRange[0].toFixed(2),
      r.effectiveVolumeRange[1].toFixed(2),
      r.effectiveWeightTonnes.toFixed(2),
      r.effectiveWeightRange[0].toFixed(2),
      r.effectiveWeightRange[1].toFixed(2),
      (r.operatorAdjustments?.density_t_m3 ?? r.calculatedWeight.density_used_t_m3).toFixed(2),
      (r.aiOutput.confidence_score * 100).toFixed(0),
      r.realScaleWeightTonnes !== undefined ? r.realScaleWeightTonnes.toFixed(2) : '',
      r.weightErrorTonnes !== undefined ? r.weightErrorTonnes.toFixed(2) : '',
      r.weightErrorPercent !== undefined ? r.weightErrorPercent.toFixed(2) : '',
      escapeCsv(r.notes || ''),
    ]);

    const csvContent =
      '\uFEFF' + // UTF-8 BOM para Excel en Windows
      [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Exporta a JSON estructurado
   */
  exportToJson(records: PileAnalysisRecord[], filename = 'acopios_rcd_circular.json'): void {
    const jsonStr = JSON.stringify(records, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Genera y copia al portapapeles un resumen conciso en texto
   */
  async copySummaryToClipboard(record: PileAnalysisRecord): Promise<boolean> {
    const text = `📋 INFORME DE ESTIMACIÓN DE ACOPIO - RCD CIRCULAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Acopio: ${record.pileName || 'Sin nombre'} (${record.location})
📅 Fecha: ${new Date(record.createdAt).toLocaleString('es-ES')}
🧱 Material: ${record.effectiveMaterial}${record.effectiveGranulometry ? ` [${record.effectiveGranulometry}]` : ''}
🔍 Limpieza: ${record.effectiveCleanliness.level.toUpperCase()} (${record.effectiveCleanliness.rejection_percentage}% impropios)

📐 VOLUMEN ESTIMADO: ≈ ${record.effectiveVolumeM3} m³ (Rango: ${record.effectiveVolumeRange[0]} - ${record.effectiveVolumeRange[1]} m³)
⚖️ PESO ESTIMADO: ≈ ${record.effectiveWeightTonnes} t (Rango: ${record.effectiveWeightRange[0]} - ${record.effectiveWeightRange[1]} t)
📊 Confianza IA: ${(record.aiOutput.confidence_score * 100).toFixed(0)}%
📏 Dimensiones: ${record.operatorAdjustments?.width_m ?? record.aiOutput.dimensions.width_m}m × ${record.operatorAdjustments?.depth_m ?? record.aiOutput.dimensions.depth_m}m · Altura ${record.operatorAdjustments?.height_m ?? record.aiOutput.dimensions.height_m}m

ℹ️ Estimación asistida por visión artificial. Complementa, no sustituye, el pesaje oficial.
RCD Circular · Monzón (Huesca)`;

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('Clipboard write error:', e);
      return false;
    }
  },
};

function escapeCsv(str: string): string {
  if (!str) return '""';
  const clean = String(str).replace(/"/g, '""');
  return `"${clean}"`;
}
