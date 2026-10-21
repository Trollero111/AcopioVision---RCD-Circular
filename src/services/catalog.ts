/**
 * Catálogo Único Oficial de Materiales y Productos
 * RCD Circular - Monzón (Aragón)
 */

import { CleanlinessLevel } from '../types';

export interface CatalogItem {
  id: string;
  name: string;
  category: 'Residuo recibido' | 'Producto tratado';
  color: string;
  density_t_m3: number;
  density_by_cleanliness?: { [key in CleanlinessLevel]?: number };
  calibration_factor: number;
  price_per_tonne: number;
  price_per_m3: number;
  supports_cleanliness: boolean;
  supports_granulometry: boolean;
  allowed_granulometries?: string[];
  description: string;
  is_hazard?: boolean;
}

export const OFFICIAL_CATALOG: CatalogItem[] = [
  // ── RESIDUO RECIBIDO ───────────────────────────────────────────
  {
    id: 'escombro',
    name: 'Escombro',
    category: 'Residuo recibido',
    color: '#f97316', // naranja
    density_t_m3: 1.10,
    density_by_cleanliness: {
      limpio: 1.25,
      mixto: 1.10,
      sucio: 0.95,
      muy_sucio: 0.80,
    },
    calibration_factor: 1.0,
    price_per_tonne: 11.50,
    price_per_m3: 12.65,
    supports_cleanliness: true,
    supports_granulometry: false,
    description: 'Mezcla de residuos de albañilería, ladrillo, azulejo, mortero y hormigón troceado. Requiere nivel de limpieza obligatorio.',
  },
  {
    id: 'hormigon',
    name: 'Hormigón',
    category: 'Residuo recibido',
    color: '#0284c7', // azul
    density_t_m3: 1.30,
    calibration_factor: 1.0,
    price_per_tonne: 6.00,
    price_per_m3: 7.80,
    supports_cleanliness: false, // SOLO limpio. Si tiene impropios -> Hormigón no conforme
    supports_granulometry: false,
    description: 'Hormigón en masa o armado limpio procedente de demoliciones de soleras, vigas y pilares. Solo se admite limpio.',
  },
  {
    id: 'madera',
    name: 'Madera',
    category: 'Residuo recibido',
    color: '#b45309', // marrón
    density_t_m3: 0.25,
    calibration_factor: 1.0,
    price_per_tonne: 28.00,
    price_per_m3: 7.00,
    supports_cleanliness: false,
    supports_granulometry: false,
    description: 'Maderas de encofrado, tarimas, puertas, palets rotos y vigas de derribo.',
  },
  {
    id: 'yeso_pladur',
    name: 'Yesos y pladur',
    category: 'Residuo recibido',
    color: '#e2e8f0', // blanco grisáceo
    density_t_m3: 0.45,
    calibration_factor: 1.0,
    price_per_tonne: 32.00,
    price_per_m3: 14.40,
    supports_cleanliness: false,
    supports_granulometry: false,
    description: 'Placas de cartón-yeso (pladur), molduras, falsos techos y escayolas de reforma.',
  },
  {
    id: 'metales',
    name: 'Metales',
    category: 'Residuo recibido',
    color: '#64748b', // pizarra metálica
    density_t_m3: 0.60,
    calibration_factor: 1.0,
    price_per_tonne: 0.00, // suele tener valor positivo de compra/compensación
    price_per_m3: 0.00,
    supports_cleanliness: false,
    supports_granulometry: false,
    description: 'Ferralla, perfiles de acero, tuberías de plomo/cobre, chapas galvanizadas en acopio suelto.',
  },
  {
    id: 'vidrio',
    name: 'Vidrio',
    category: 'Residuo recibido',
    color: '#06b6d4', // cian
    density_t_m3: 1.30,
    calibration_factor: 1.0,
    price_per_tonne: 18.00,
    price_per_m3: 23.40,
    supports_cleanliness: false,
    supports_granulometry: false,
    description: 'Vidrio plano de ventanas, cristales laminados y restos vítreos (presencia escasa).',
  },
  {
    id: 'carton_embalajes',
    name: 'Cartón / embalajes',
    category: 'Residuo recibido',
    color: '#d97706', // ámbar
    density_t_m3: 0.10,
    calibration_factor: 1.0,
    price_per_tonne: 22.00,
    price_per_m3: 2.20,
    supports_cleanliness: false,
    supports_granulometry: false,
    description: 'Cajas de cartón, embalajes de materiales de obra y sacos de papel multicapa.',
  },
  {
    id: 'rafia',
    name: 'Rafia',
    category: 'Residuo recibido',
    color: '#a1a1aa',
    density_t_m3: 0.06,
    calibration_factor: 1.0,
    price_per_tonne: 35.00,
    price_per_m3: 2.10,
    supports_cleanliness: false,
    supports_granulometry: false,
    description: 'Sacos y telas de rafia sintética para escombros (big-bags y costales).',
  },
  {
    id: 'plastico_fino',
    name: 'Plástico fino',
    category: 'Residuo recibido',
    color: '#ec4899', // rosa
    density_t_m3: 0.08,
    calibration_factor: 1.0,
    price_per_tonne: 30.00,
    price_per_m3: 2.40,
    supports_cleanliness: false,
    supports_granulometry: false,
    description: 'Film transparente de retráctil, plásticos de paletización y láminas impermeabilizantes.',
  },
  {
    id: 'residuos_peligrosos_aerosoles',
    name: 'Residuos peligrosos: aerosoles',
    category: 'Residuo recibido',
    color: '#ef4444', // rojo alerta
    density_t_m3: 0.30,
    calibration_factor: 1.0,
    price_per_tonne: 90.00,
    price_per_m3: 27.00,
    supports_cleanliness: false,
    supports_granulometry: false,
    is_hazard: true,
    description: 'Botes presurizados, sprays de marcaje, espuma de poliuretano. NO deben entrar a planta; activan alerta de seguridad inmediata.',
  },
  {
    id: 'basura',
    name: 'Basura',
    category: 'Residuo recibido',
    color: '#71717a',
    density_t_m3: 0.35,
    calibration_factor: 1.0,
    price_per_tonne: 45.00,
    price_per_m3: 15.75,
    supports_cleanliness: false,
    supports_granulometry: false,
    description: 'Residuos banales varios, restos orgánicos, plásticos mixtos no reciclables y rechazo general.',
  },

  // ── PRODUCTO TRATADO (Áridos Reciclados) ─────────────────────────
  {
    id: 'arido_reciclado',
    name: 'Árido reciclado',
    category: 'Producto tratado',
    color: '#22c55e', // verde esmeralda RCD Circular
    density_t_m3: 1.40,
    calibration_factor: 1.0,
    price_per_tonne: 8.50,
    price_per_m3: 11.90,
    supports_cleanliness: false,
    supports_granulometry: true,
    allowed_granulometries: ['0-20 mm', '20-40 mm', '40-80 mm'],
    description: 'Árido obtenido de triturar y cribar mezcla de escombro y hormigón en 3 granulometrías estándar.',
  },
  {
    id: 'arido_reciclado_hormigon',
    name: 'Árido reciclado de hormigón',
    category: 'Producto tratado',
    color: '#16a34a',
    density_t_m3: 1.45,
    calibration_factor: 1.0,
    price_per_tonne: 9.50,
    price_per_m3: 13.80,
    supports_cleanliness: false,
    supports_granulometry: true,
    allowed_granulometries: ['0-20 mm', '20-40 mm', '40-80 mm'],
    description: 'Árido reciclado de alta resistencia procedente exclusivamente de trituración de hormigón.',
  },
  {
    id: 'arido_reciclado_mixto',
    name: 'Árido reciclado mixto',
    category: 'Producto tratado',
    color: '#84cc16', // lima
    density_t_m3: 1.35,
    calibration_factor: 1.0,
    price_per_tonne: 7.20,
    price_per_m3: 9.70,
    supports_cleanliness: false,
    supports_granulometry: true,
    allowed_granulometries: ['0-20 mm', '20-40 mm', '40-80 mm'],
    description: 'Árido mixto reciclado idóneo para zahorras, bases de caminos y rellenos de zanja.',
  },
  {
    id: 'tierra_vegetal',
    name: 'Tierra vegetal',
    category: 'Producto tratado',
    color: '#ca8a04',
    density_t_m3: 1.20,
    calibration_factor: 1.0,
    price_per_tonne: 14.00,
    price_per_m3: 16.80,
    supports_cleanliness: false,
    supports_granulometry: true,
    allowed_granulometries: ['0-20 mm'],
    description: 'Tierra vegetal cribada de excavaciones y desbroces para jardinería y restauración paisajística.',
  },
];

/**
 * Obtiene un elemento del catálogo por ID o por nombre (case-insensitive)
 */
export function getCatalogItem(identifier: string): CatalogItem | undefined {
  if (!identifier) return undefined;
  const clean = identifier.trim().toLowerCase();

  // Mapeo retrocompatible para migración
  if (clean === 'escombro mixto') {
    return OFFICIAL_CATALOG.find((i) => i.id === 'escombro');
  }
  if (clean === 'escombro sucio') {
    return OFFICIAL_CATALOG.find((i) => i.id === 'escombro');
  }
  if (clean === 'otros residuos de construcción') {
    return OFFICIAL_CATALOG.find((i) => i.id === 'basura');
  }

  return OFFICIAL_CATALOG.find(
    (i) => i.id === clean || i.name.toLowerCase() === clean
  );
}

/**
 * Normaliza nombres de materiales hacia el catálogo cerrado
 */
export function normalizeMaterialName(rawName: string): {
  canonicalName: string;
  catalogId: string;
  derivedCleanliness?: CleanlinessLevel;
  wasMigrated: boolean;
} {
  if (!rawName) {
    return { canonicalName: 'Escombro', catalogId: 'escombro', wasMigrated: false };
  }
  const clean = rawName.trim();

  // Casos de migración del catálogo antiguo
  if (clean.toLowerCase() === 'escombro mixto') {
    return {
      canonicalName: 'Escombro',
      catalogId: 'escombro',
      derivedCleanliness: 'mixto',
      wasMigrated: true,
    };
  }
  if (clean.toLowerCase() === 'escombro sucio') {
    return {
      canonicalName: 'Escombro',
      catalogId: 'escombro',
      derivedCleanliness: 'sucio',
      wasMigrated: true,
    };
  }
  if (clean.toLowerCase() === 'otros residuos de construcción') {
    return {
      canonicalName: 'Basura',
      catalogId: 'basura',
      wasMigrated: true,
    };
  }

  const found = getCatalogItem(clean);
  if (found) {
    return {
      canonicalName: found.name,
      catalogId: found.id,
      wasMigrated: false,
    };
  }

  // Búsqueda por coincidencia parcial
  const lower = clean.toLowerCase();
  if (lower.includes('hormig')) return { canonicalName: 'Hormigón', catalogId: 'hormigon', wasMigrated: false };
  if (lower.includes('escombr')) return { canonicalName: 'Escombro', catalogId: 'escombro', wasMigrated: false };
  if (lower.includes('mader')) return { canonicalName: 'Madera', catalogId: 'madera', wasMigrated: false };
  if (lower.includes('yeso') || lower.includes('pladur')) return { canonicalName: 'Yesos y pladur', catalogId: 'yeso_pladur', wasMigrated: false };
  if (lower.includes('metal') || lower.includes('hierro')) return { canonicalName: 'Metales', catalogId: 'metales', wasMigrated: false };
  if (lower.includes('vidrio') || lower.includes('cristal')) return { canonicalName: 'Vidrio', catalogId: 'vidrio', wasMigrated: false };
  if (lower.includes('carton') || lower.includes('embalaj')) return { canonicalName: 'Cartón / embalajes', catalogId: 'carton_embalajes', wasMigrated: false };
  if (lower.includes('rafia') || lower.includes('saco')) return { canonicalName: 'Rafia', catalogId: 'rafia', wasMigrated: false };
  if (lower.includes('plastic') || lower.includes('film')) return { canonicalName: 'Plástico fino', catalogId: 'plastico_fino', wasMigrated: false };
  if (lower.includes('aerosol') || lower.includes('spray')) return { canonicalName: 'Residuos peligrosos: aerosoles', catalogId: 'residuos_peligrosos_aerosoles', wasMigrated: false };
  if (lower.includes('tierra')) return { canonicalName: 'Tierra vegetal', catalogId: 'tierra_vegetal', wasMigrated: false };
  if (lower.includes('árido') || lower.includes('arido')) return { canonicalName: 'Árido reciclado', catalogId: 'arido_reciclado', wasMigrated: false };

  // Fallback seguro a Basura
  return { canonicalName: 'Basura', catalogId: 'basura', wasMigrated: true };
}

/**
 * Calcula la densidad aparente nominal aplicable
 */
export function getDensityForMaterial(
  materialName: string,
  cleanlinessLevel?: CleanlinessLevel,
  customDensities?: { [material: string]: number }
): number {
  if (customDensities && customDensities[materialName] !== undefined) {
    return customDensities[materialName];
  }

  const item = getCatalogItem(materialName);
  if (!item) return 1.10;

  if (item.supports_cleanliness && cleanlinessLevel && item.density_by_cleanliness) {
    const val = item.density_by_cleanliness[cleanlinessLevel];
    if (val !== undefined) return val;
  }

  return item.density_t_m3;
}
