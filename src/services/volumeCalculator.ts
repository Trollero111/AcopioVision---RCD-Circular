/**
 * Motor determinista de cálculo volumétrico y de peso para AcopioVision
 * RCD Circular - Monzón (Aragón)
 *
 * Todas las fórmulas geométricas son auditables y reproducibles,
 * evitando que la IA "invente" números de volumen o peso sin base física.
 */

import {
  CalculatedVolume,
  CalculatedWeight,
  Dimensions,
  GeometricShape,
  CleanlinessLevel,
} from '../types';

export interface VolumeCalculationParams {
  dimensions: Dimensions;
  geometricShape: GeometricShape;
  shapeFactor?: number;
  confidenceScore: number;
  hasReferenceObject: boolean;
  photoCount: number;
}

export interface WeightCalculationParams {
  volumeM3: number;
  minVolumeM3: number;
  maxVolumeM3: number;
  materialName: string;
  densitySettings: { [material: string]: number };
  calibrationFactor?: number;
  cleanlinessLevel?: CleanlinessLevel;
  rejectionPercentage?: number;
  reduceDensityOnRejection?: boolean;
}

/**
 * Calcula el volumen geométrico puro según la forma del acopio y sus dimensiones en metros.
 */
export function calculateGeometricVolume(params: VolumeCalculationParams): CalculatedVolume {
  const {
    dimensions,
    geometricShape,
    shapeFactor = 0.90,
    confidenceScore,
    hasReferenceObject,
    photoCount,
  } = params;

  const w = Math.max(0.1, dimensions.width_m || 1);
  const d = Math.max(0.1, dimensions.depth_m || 1);
  const h = Math.max(0.1, dimensions.height_m || 0.5);
  const topR = Math.max(0, dimensions.top_radius_m || 0);

  const rw = w / 2;
  const rd = d / 2;

  let rawVolume = 0;
  let formulaApplied = '';
  let explanation = '';

  switch (geometricShape) {
    case 'cono': {
      // Cono con base elíptica o circular
      rawVolume = (Math.PI * rw * rd * h) / 3;
      formulaApplied = 'V = (π · (ancho/2) · (fondo/2) · altura) / 3';
      explanation = `Cono regular de talud natural (~37°). Base elíptica de ${w.toFixed(2)} m × ${d.toFixed(2)} m y altura ${h.toFixed(2)} m.`;
      break;
    }

    case 'tronco_cono': {
      // Tronco de cono con cúspide aplanada
      const R_equiv = Math.sqrt(rw * rd);
      const r_top = topR > 0 ? topR : Math.min(R_equiv * 0.4, 0.5);
      rawVolume = (Math.PI * h / 3) * (Math.pow(R_equiv, 2) + (R_equiv * r_top) + Math.pow(r_top, 2));
      formulaApplied = 'V = (π · h / 3) · (R² + R·r + r²)';
      explanation = `Tronco de cono con meseta superior aplanada de radio ${r_top.toFixed(2)} m y base equivalente R = ${R_equiv.toFixed(2)} m.`;
      break;
    }

    case 'semielipsoide': {
      // Semielipsoide (montículo suave y tendido)
      rawVolume = (2 / 3) * Math.PI * rw * rd * h;
      formulaApplied = 'V = (2/3) · π · (ancho/2) · (fondo/2) · altura';
      explanation = `Semielipsoide tendido con base de ${w.toFixed(2)} m × ${d.toFixed(2)} m y cúspide redondeada a ${h.toFixed(2)} m.`;
      break;
    }

    case 'prisma_triangular': {
      // Acopio longitudinal en forma de "tejado" (típico de cordón de descarga con pala o camión)
      const length = Math.max(w, d);
      const baseWidth = Math.min(w, d);
      rawVolume = 0.5 * baseWidth * h * length;
      formulaApplied = 'V = 0.5 · base · altura · longitud';
      explanation = `Prisma triangular ("tejado") de cordón de descarga: sección transversal triangular de ${baseWidth.toFixed(2)} m × ${h.toFixed(2)} m y longitud de ${length.toFixed(2)} m.`;
      break;
    }

    case 'forma_compuesta':
    default: {
      // Acopio compuesto: prisma longitudinal central + dos semiconos en los extremos
      const length = Math.max(w, d);
      const width = Math.min(w, d);
      if (length > width * 1.15) {
        const prismLength = length - width;
        const prismVol = 0.5 * width * h * prismLength;
        const conesVol = (Math.PI * Math.pow(width / 2, 2) * h) / 3;
        rawVolume = prismVol + conesVol;
        formulaApplied = 'V = (0.5 · ancho · h · (largo - ancho)) + (π · (ancho/2)² · h / 3)';
        explanation = `Forma compuesta: cuerpo prismático central (${prismVol.toFixed(1)} m³) rematado por dos semicírculos cónicos en los extremos (${conesVol.toFixed(1)} m³).`;
      } else {
        // Casi simétrico, promedio ponderado cono y elipsoide
        rawVolume = ((Math.PI * rw * rd * h) / 3 * 0.6) + ((2 / 3) * Math.PI * rw * rd * h * 0.4);
        formulaApplied = 'V = 0.6 · V_cono + 0.4 · V_elipsoide';
        explanation = `Acopio irregular compuesto: aproximación bicónica compensada con base de ${w.toFixed(2)} m × ${d.toFixed(2)} m.`;
      }
      break;
    }
  }

  // Aplicar factor de forma (0.75 a 1.0) para compensar talud real, huecos y rugosidad perimetral
  const clampedShapeFactor = Math.max(0.70, Math.min(1.0, shapeFactor));
  const nominalVolume = rawVolume * clampedShapeFactor;

  // Propagación de incertidumbre:
  // - Con referencia métrica válida: base 10%
  // - Sin referencia: base 30%
  // - Con 1 foto: +6%
  // - Con 2 fotos: -2%
  // - Con 3 fotos: -4%
  // - Inverso de la confianza del modelo
  let uncertaintyFraction = hasReferenceObject ? 0.12 : 0.32;

  if (photoCount === 1) {
    uncertaintyFraction += 0.05;
  } else if (photoCount >= 3) {
    uncertaintyFraction -= 0.03;
  }

  const confidencePenalty = (1 - Math.max(0.1, Math.min(1.0, confidenceScore))) * 0.18;
  uncertaintyFraction += confidencePenalty;

  // Clampear la incertidumbre entre 8% y 40%
  uncertaintyFraction = Math.max(0.08, Math.min(0.40, uncertaintyFraction));

  const minVolume = nominalVolume * (1 - uncertaintyFraction);
  const maxVolume = nominalVolume * (1 + uncertaintyFraction);

  return {
    nominal_m3: round2(nominalVolume),
    min_m3: round2(minVolume),
    max_m3: round2(maxVolume),
    formula_applied: formulaApplied,
    explanation: `${explanation} Factor de forma aplicado: ${(clampedShapeFactor * 100).toFixed(0)}%. Margen de incertidumbre: ±${(uncertaintyFraction * 100).toFixed(0)}%.`,
    error_margin_percent: round2(uncertaintyFraction * 100),
  };
}

/**
 * Calcula el peso estimado en toneladas multiplicando volumen por densidad aparente
 * y aplicando el factor de calibración del material y ajuste por impropios.
 */
import { getDensityForMaterial } from './catalog';

export function calculateWeightFromVolume(params: WeightCalculationParams): CalculatedWeight {
  const {
    volumeM3,
    minVolumeM3,
    maxVolumeM3,
    materialName,
    densitySettings,
    calibrationFactor = 1.0,
    cleanlinessLevel = 'limpio',
    reduceDensityOnRejection = true,
  } = params;

  // Obtener densidad aparente considerando el nuevo catálogo y nivel de limpieza
  let baseDensity = densitySettings[materialName];
  if (baseDensity === undefined) {
    baseDensity = getDensityForMaterial(materialName, cleanlinessLevel, densitySettings);
  } else if (materialName.toLowerCase() === 'escombro' && cleanlinessLevel) {
    // Si es escombro sin override manual específico, aplicar densidad por nivel de limpieza
    baseDensity = getDensityForMaterial(materialName, cleanlinessLevel, densitySettings);
  }

  // Si hay exceso de impropios banales (plásticos, madera, cartón), la densidad aparente del montón
  // se reduce ligeramente porque estos materiales ocupan volumen con menor densidad que el árido
  let rejectionDeduction = 0;
  if (reduceDensityOnRejection) {
    if (cleanlinessLevel === 'muy_sucio') {
      rejectionDeduction = 0.06; // -6% densidad efectiva
    } else if (cleanlinessLevel === 'sucio') {
      rejectionDeduction = 0.03; // -3% densidad efectiva
    } else if (cleanlinessLevel === 'mixto') {
      rejectionDeduction = 0.01;
    }
  }

  const effectiveDensity = baseDensity * (1 - rejectionDeduction) * calibrationFactor;

  const nominalTonnes = volumeM3 * effectiveDensity;
  const minTonnes = minVolumeM3 * effectiveDensity;
  const maxTonnes = maxVolumeM3 * effectiveDensity;

  return {
    nominal_tonnes: round2(nominalTonnes),
    min_tonnes: round2(minTonnes),
    max_tonnes: round2(maxTonnes),
    density_used_t_m3: round2(baseDensity),
    calibration_factor_used: round2(calibrationFactor),
    rejection_deduction_percent: round2(rejectionDeduction * 100),
  };
}

/**
 * Redondeo a 2 decimales para precisión de ingeniería
 */
function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
