/**
 * Servicio de calibración y análisis estadístico frente a pesajes reales
 * RCD Circular - Monzón (Aragón)
 */

import { PileAnalysisRecord, CalibrationStats } from '../types';

export interface CalibrationReport {
  overallMape: number;
  overallRmse: number;
  overallMeanBias: number;
  totalValidatedCount: number;
  statsByMaterial: CalibrationStats[];
  scatterPoints: Array<{
    id: string;
    pileName: string;
    material: string;
    estimatedTonnes: number;
    realTonnes: number;
    errorTonnes: number;
    errorPercent: number;
    confidence: number;
    date: string;
  }>;
}

/**
 * Procesa la lista de análisis con pesaje real para generar el informe de calibración
 */
export function computeCalibrationReport(
  records: PileAnalysisRecord[],
  currentCalibrationFactors: { [material: string]: number }
): CalibrationReport {
  // Filtrar registros que tengan pesaje real válido
  const validated = records.filter(
    (r) =>
      typeof r.realScaleWeightTonnes === 'number' &&
      r.realScaleWeightTonnes > 0 &&
      r.effectiveWeightTonnes > 0
  );

  if (validated.length === 0) {
    return {
      overallMape: 0,
      overallRmse: 0,
      overallMeanBias: 0,
      totalValidatedCount: 0,
      statsByMaterial: [],
      scatterPoints: [],
    };
  }

  const scatterPoints = validated.map((r) => {
    const estimated = r.effectiveWeightTonnes;
    const real = r.realScaleWeightTonnes!;
    const errorTonnes = estimated - real;
    const errorPercent = (Math.abs(errorTonnes) / real) * 100;

    return {
      id: r.id,
      pileName: r.pileName || `Acopio #${r.id.slice(-4)}`,
      material: r.effectiveMaterial,
      estimatedTonnes: round2(estimated),
      realTonnes: round2(real),
      errorTonnes: round2(errorTonnes),
      errorPercent: round2(errorPercent),
      confidence: r.aiOutput.confidence_score,
      date: r.scaleWeighingDate || r.createdAt,
    };
  });

  // Métricas globales
  const sumAbsPercent = scatterPoints.reduce((acc, p) => acc + p.errorPercent, 0);
  const overallMape = round2(sumAbsPercent / scatterPoints.length);

  const sumSquaredErrors = scatterPoints.reduce((acc, p) => acc + Math.pow(p.errorTonnes, 2), 0);
  const overallRmse = round2(Math.sqrt(sumSquaredErrors / scatterPoints.length));

  const sumSignedErrors = scatterPoints.reduce((acc, p) => acc + p.errorTonnes, 0);
  const overallMeanBias = round2(sumSignedErrors / scatterPoints.length);

  // Agrupar por material
  const groupedByMaterial = new Map<string, typeof scatterPoints>();
  scatterPoints.forEach((p) => {
    const list = groupedByMaterial.get(p.material) || [];
    list.push(p);
    groupedByMaterial.set(p.material, list);
  });

  const statsByMaterial: CalibrationStats[] = [];

  groupedByMaterial.forEach((points, material) => {
    const matSumAbsPercent = points.reduce((acc, p) => acc + p.errorPercent, 0);
    const mape = round2(matSumAbsPercent / points.length);

    const matSumSq = points.reduce((acc, p) => acc + Math.pow(p.errorTonnes, 2), 0);
    const rmse = round2(Math.sqrt(matSumSq / points.length));

    const matBias = round2(points.reduce((acc, p) => acc + p.errorTonnes, 0) / points.length);

    // Calcular factor de calibración sugerido:
    // Factor = mediana(pesos reales / pesos brutos antes del factor actual)
    const currentFactor = currentCalibrationFactors[material] || 1.0;
    const ratios = points.map((p) => (p.realTonnes / (p.estimatedTonnes / currentFactor)));
    ratios.sort((a, b) => a - b);
    
    // Mediana robusta a valores atípicos
    const mid = Math.floor(ratios.length / 2);
    const suggestedFactor =
      ratios.length % 2 !== 0 ? ratios[mid] : (ratios[mid - 1] + ratios[mid]) / 2;

    statsByMaterial.push({
      material,
      sampleCount: points.length,
      mape,
      rmse,
      meanBias: matBias,
      currentCalibrationFactor: round2(currentFactor),
      suggestedCalibrationFactor: round2(suggestedFactor),
    });
  });

  return {
    overallMape,
    overallRmse,
    overallMeanBias,
    totalValidatedCount: validated.length,
    statsByMaterial,
    scatterPoints,
  };
}

function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
