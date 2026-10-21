/**
 * Tipos de datos para AcopioVision - RCD Circular (Monzón, Aragón)
 */

export type GeometricShape =
  | 'cono'
  | 'tronco_cono'
  | 'semielipsoide'
  | 'prisma_triangular'
  | 'forma_compuesta';

export type CleanlinessLevel = 'limpio' | 'mixto' | 'sucio' | 'muy_sucio';

export type MaterialCategory = 'Residuo recibido' | 'Producto tratado';

export type UserRole = 'jefe' | 'operario' | 'tecnico_calidad';

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  email?: string;
  jobTitle: string;
  plantLocation: string;
  shift?: string;
  avatarBg: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface PolygonPoint {
  x: number;
  y: number;
}

export interface ReferenceObjectOption {
  id: string;
  name: string;
  type: string;
  defaultDimensionM: number;
  dimensionLabel: string;
  category: 'persona' | 'maquinaria' | 'objeto_estandar' | 'manual' | 'muro' | 'palo_graduado' | 'sin_referencia';
  secondaryDimensionM?: number; // p. ej. alto de pared si defaultDimensionM es ancho
}

export interface PileZone {
  id: string;
  name: string; // ej: "Box 3 - Muro Norte", "Tolva 1", "Plataforma Trituradora Móvil"
  location: string; // ej: "Planta La Campaneta", "Obra Barbastro A-22"
  defaultMaterial: string; // ej: "Hormigón", "Escombro", "Árido reciclado"
  defaultCleanliness?: CleanlinessLevel;
  defaultGranulometry?: string;
  defaultReferenceType: string; // ej: "pared_muro", "palo_graduado"
  defaultReferenceDimensionM: number;
  defaultReferenceSecondaryM?: number;
  notes?: string;
  isActive: boolean;
}

export interface ManualMeasurement {
  pixelLength: number;
  realMeters: number;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
}

export interface Dimensions {
  width_m: number;
  depth_m: number;
  height_m: number;
  top_radius_m?: number;
}

export interface MaterialProbability {
  material: string;
  probability: number;
}

export interface GranulometryProbability {
  size: string;
  probability: number;
}

export interface CleanlinessData {
  level: CleanlinessLevel;
  rejection_percentage: number;
  detected_impurities: string[];
  excess_rejection_alert: boolean;
}

export interface ReferenceObjectDetection {
  detected: boolean;
  type: string;
  assumed_dimension_m: number;
  dimension_type?: string;
  box?: number[];
  confidence?: number;
}

export type HazardType =
  | 'amianto_uralita'
  | 'aerosoles'
  | 'envases_pictogramas_quimicos'
  | 'bombonas_baterias'
  | 'otros_peligrosos';

export interface HazardFinding {
  id: string;
  type: HazardType;
  typeLabel: string;
  suspicion_level: 'baja' | 'media' | 'alta';
  box?: number[]; // [ymin, xmin, ymax, xmax]
  visual_reason: string;
  recommendation: string;
  status: 'pendiente' | 'confirmada' | 'descartada';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
}

export interface HazardDetection {
  enabled: boolean;
  findings: HazardFinding[];
  has_hazard: boolean;
  alert_count: number;
}

export interface GeminiAnalysisRaw {
  pile_detected: boolean;
  pile_count?: number;
  bounding_box?: number[];
  polygon?: PolygonPoint[];
  reference_object?: ReferenceObjectDetection;
  estimated_scale_m_per_px?: number;
  scale_reasoning?: string;
  dimensions: Dimensions;
  geometric_shape: GeometricShape;
  shape_factor: number;
  material_classification: {
    category: string;
    primary_material: string;
    probabilities?: MaterialProbability[];
  };
  granulometry: {
    applicable: boolean;
    primary_granulometry?: string;
    probabilities?: GranulometryProbability[];
  };
  cleanliness: CleanlinessData;
  hazard_detection?: {
    has_hazard: boolean;
    findings: Array<{
      type: string;
      suspicion_level: 'baja' | 'media' | 'alta';
      box?: number[];
      visual_reason: string;
      recommendation: string;
    }>;
  };
  confidence_score: number;
  confidence_reduction_factors?: string[];
  observations: string;
}

export interface CalculatedVolume {
  nominal_m3: number;
  min_m3: number;
  max_m3: number;
  formula_applied: string;
  explanation: string;
  error_margin_percent: number;
}

export interface CalculatedWeight {
  nominal_tonnes: number;
  min_tonnes: number;
  max_tonnes: number;
  density_used_t_m3: number;
  calibration_factor_used: number;
  rejection_deduction_percent: number;
}

export interface OperatorAdjustments {
  width_m?: number;
  depth_m?: number;
  height_m?: number;
  top_radius_m?: number;
  geometric_shape?: GeometricShape;
  shape_factor?: number;
  material?: string;
  granulometry?: string;
  density_t_m3?: number;
  isAdjusted: boolean;
  timestamp?: string;
  operator_user?: string;
  adjustment_reason?: string;
}

export interface PileAnalysisRecord {
  id: string;
  pileName: string;
  location: string;
  zoneId?: string;
  operatorUser: string;
  operatorUserId?: string;
  operatorRole?: UserRole;
  createdAt: string;
  updatedAt?: string;
  images: string[]; // Base64 o URLs
  referenceObjectType: string;
  manualMeasurement?: ManualMeasurement;
  
  // Salida estructurada de la IA
  aiOutput: GeminiAnalysisRaw;
  
  // Valores calculados deterministas
  calculatedVolume: CalculatedVolume;
  calculatedWeight: CalculatedWeight;
  
  // Ajustes del operario
  operatorAdjustments?: OperatorAdjustments;
  
  // Valores efectivos finales
  effectiveVolumeM3: number;
  effectiveVolumeRange: [number, number];
  effectiveWeightTonnes: number;
  effectiveWeightRange: [number, number];
  effectiveMaterial: string;
  effectiveGranulometry?: string;
  effectiveCleanliness: CleanlinessData;
  
  // Detección de residuos peligrosos y alertas
  hazardDetection?: HazardDetection;
  hazardFinding?: HazardFinding;
  requiresHazardReview?: boolean;
  
  // Validación de báscula
  realScaleWeightTonnes?: number;
  weightErrorTonnes?: number;
  weightErrorPercent?: number;
  scaleWeighingDate?: string;
  scaleTicketNumber?: string;
  scaleVerified: boolean;
  
  // Trazabilidad y versión
  modelVersion?: string;
  notes?: string;
  isDemo?: boolean;
  isDeleted?: boolean; // Borrado lógico
  fewShotSampleIds?: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  operatorUser: string;
  action:
    | 'CREACION'
    | 'EDICION'
    | 'AJUSTE_OPERARIO'
    | 'PESAJE_REAL'
    | 'BORRADO_LOGICO'
    | 'CAMBIO_AJUSTES'
    | 'REVISION_ALERTA'
    | 'IMPORTACION_CSV';
  entityType: 'record' | 'zone' | 'settings' | 'hazard_alert' | 'calibration_sample';
  entityId: string;
  entityName?: string;
  previousValue?: any;
  newValue?: any;
  notes?: string;
}

export interface CalibrationSample {
  id: string;
  createdAt: string;
  photoThumbnail: string; // base64 o URL
  material: string;
  cleanlinessLevel?: CleanlinessLevel;
  granulometry?: string;
  realWeightTonnes: number;
  estimatedWeightTonnes?: number;
  estimatedVolumeM3?: number;
  zoneId?: string;
  zoneName?: string;
  referenceType?: string;
  referenceDimensionM?: number;
  ticketNumber?: string;
  notes?: string;
  isRcdCompanyPhoto: boolean;
  wasUsedInFewShot?: boolean;
}

export interface DensitySettings {
  [materialName: string]: number; // t/m³
}

export interface PricingRates {
  [materialName: string]: {
    pricePerTonne: number;
    pricePerM3: number;
    minimumCharge: number;
  };
}

export interface RejectionThresholds {
  limpioMax: number;     // e.g. 3
  mixtoMax: number;       // e.g. 10
  sucioMax: number;       // e.g. 20
  surchargePercentMuySucio: number; // e.g. 35%
}

export interface AppSettings {
  densities: DensitySettings;
  granulometries: string[];
  referenceObjects: ReferenceObjectOption[];
  zones: PileZone[];
  rejectionThresholds: RejectionThresholds;
  calibrationFactors: { [materialName: string]: number };
  rates: PricingRates;
  highPrecisionMode: boolean;
  reduceDensityOnRejection: boolean;
  hazardDetectionEnabled: boolean;
  hazardSensitivity: 'baja' | 'media' | 'alta';
  hazardProtocolText: string;
  operatorName: string;
  theme: 'dark' | 'light' | 'system';
  language: 'es';
}

export interface VisualReferenceSample {
  id: string;
  title: string;
  category: 'limpieza' | 'granulometria' | 'material' | 'peligroso';
  typeTag: string; // ej: 'limpio', 'muy_sucio', '0-20', 'amianto', 'madera'
  description: string;
  imageThumbnail: string;
  isCompanyPhoto: boolean;
  isDefault?: boolean;
}

export interface CalibrationStats {
  material: string;
  granulometry?: string;
  sampleCount: number;
  mape: number; // Mean Absolute Percentage Error (%)
  rmse: number; // Root Mean Square Error (t)
  meanBias: number; // Average error (+/- t)
  currentCalibrationFactor: number;
  suggestedCalibrationFactor: number;
  empiricalDensity?: number;
  crossValidationMape?: number;
}
