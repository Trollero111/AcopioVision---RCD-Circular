/**
 * Servicio de almacenamiento híbrido (API REST Servidor + Caché Offline LocalStorage)
 * RCD Circular - Monzón (Aragón)
 */

import {
  AppSettings,
  PileAnalysisRecord,
  PileZone,
  CalibrationSample,
  HazardFinding,
  AuditLogEntry,
  VisualReferenceSample,
} from '../types';
import { OFFICIAL_CATALOG } from './catalog';
import { EXPANDED_DEMO_RECORDS } from './mockData';

const STORAGE_KEYS = {
  RECORDS: 'acopiovision_records_v2',
  SETTINGS: 'acopiovision_settings_v2',
  ZONES: 'acopiovision_zones_v2',
  VISUAL_GUIDE: 'acopiovision_visual_guide_v2',
  MIGRATED: 'acopiovision_migrated_v2',
};

// Generar densidades y tarifas por defecto a partir del catálogo oficial único
const initialDensities: { [key: string]: number } = {};
const initialRates: any = {};
const initialCalibrationFactors: { [key: string]: number } = {};

OFFICIAL_CATALOG.forEach((item) => {
  initialDensities[item.name] = item.density_t_m3;
  initialCalibrationFactors[item.name] = item.calibration_factor;
  initialRates[item.name] = {
    pricePerTonne: item.price_per_tonne,
    pricePerM3: item.price_per_m3,
    minimumCharge: 25.0,
  };
});

export const DEFAULT_SETTINGS: AppSettings = {
  densities: initialDensities,
  granulometries: ['0-20 mm', '20-40 mm', '40-80 mm'],
  referenceObjects: [
    {
      id: 'palo_graduado',
      name: 'Palo / jalón graduado de altura conocida (marcas 0,5m)',
      type: 'palo_graduado',
      defaultDimensionM: 2.0,
      dimensionLabel: 'Altura del jalón (m)',
      category: 'palo_graduado',
    },
    {
      id: 'pared_muro',
      name: 'Pared / muro de dimensiones medidas (Box)',
      type: 'pared_muro',
      defaultDimensionM: 4.0,
      secondaryDimensionM: 2.5,
      dimensionLabel: 'Anchura del muro (m)',
      category: 'muro',
    },
    {
      id: 'pala_cargadora',
      name: 'Cazo de pala cargadora frontal',
      type: 'pala_cargadora',
      defaultDimensionM: 2.6,
      dimensionLabel: 'Anchura cazo (m)',
      category: 'maquinaria',
    },
    {
      id: 'persona',
      name: 'Persona (operario en pie con EPI)',
      type: 'persona',
      defaultDimensionM: 1.75,
      dimensionLabel: 'Altura media (m)',
      category: 'persona',
    },
    {
      id: 'palet_europeo',
      name: 'Palet europeo estándar (1,20 × 0,80 m)',
      type: 'palet_europeo',
      defaultDimensionM: 1.2,
      dimensionLabel: 'Lado largo (1,20 m)',
      category: 'objeto_estandar',
    },
    {
      id: 'cono_trafico',
      name: 'Cono de tráfico / señalización vial',
      type: 'cono_trafico',
      defaultDimensionM: 0.75,
      dimensionLabel: 'Altura del cono (m)',
      category: 'objeto_estandar',
    },
    {
      id: 'contenedor_obra',
      name: 'Contenedor de obra estándar 5 m³',
      type: 'contenedor_obra',
      defaultDimensionM: 3.8,
      dimensionLabel: 'Longitud del contenedor (m)',
      category: 'objeto_estandar',
    },
    {
      id: 'camion_volquete',
      name: 'Camión volquete / bañera de áridos',
      type: 'camion_volquete',
      defaultDimensionM: 2.5,
      dimensionLabel: 'Anchura de caja (m)',
      category: 'maquinaria',
    },
    {
      id: 'manual',
      name: 'Medida manual conocida (trazar sobre foto)',
      type: 'manual',
      defaultDimensionM: 1.0,
      dimensionLabel: 'Distancia trazada (m)',
      category: 'manual',
    },
    {
      id: 'sin_referencia',
      name: 'Sin referencia visual (confianza limitada a máx 0,45)',
      type: 'sin_referencia',
      defaultDimensionM: 0,
      dimensionLabel: 'Sin escala conocida',
      category: 'sin_referencia',
    },
  ],
  zones: [
    {
      id: 'zone-box-1',
      name: 'Box 1 - Entrada Escombro Sucio',
      location: 'Planta La Campaneta',
      defaultMaterial: 'Escombro',
      defaultCleanliness: 'sucio',
      defaultReferenceType: 'pared_muro',
      defaultReferenceDimensionM: 4.0,
      defaultReferenceSecondaryM: 2.5,
      notes: 'Muro de contención de hormigón armado de 4,00m de ancho × 2,50m de alto.',
      isActive: true,
    },
    {
      id: 'zone-box-2',
      name: 'Box 2 - Escombro Limpio y Mixto',
      location: 'Planta La Campaneta',
      defaultMaterial: 'Escombro',
      defaultCleanliness: 'mixto',
      defaultReferenceType: 'pared_muro',
      defaultReferenceDimensionM: 4.0,
      defaultReferenceSecondaryM: 2.5,
      notes: 'Muro divisorio lateral de 4,00m × 2,50m.',
      isActive: true,
    },
    {
      id: 'zone-box-3',
      name: 'Box 3 - Acopio Hormigón Limpio',
      location: 'Planta La Campaneta',
      defaultMaterial: 'Hormigón',
      defaultReferenceType: 'palo_graduado',
      defaultReferenceDimensionM: 2.0,
      notes: 'Alimentación molino de impacto. Jalón graduado de 2,00m permanente.',
      isActive: true,
    },
    {
      id: 'zone-aridos-1',
      name: 'Cúpula 1 - Árido Reciclado 0-20 mm',
      location: 'Planta La Campaneta (Calle 3)',
      defaultMaterial: 'Árido reciclado',
      defaultGranulometry: '0-20 mm',
      defaultReferenceType: 'pala_cargadora',
      defaultReferenceDimensionM: 2.6,
      notes: 'Salida de trommel cribador. Cazo de pala CAT (2,60m).',
      isActive: true,
    },
    {
      id: 'zone-aridos-2',
      name: 'Cúpula 2 - Árido Reciclado 20-40 mm',
      location: 'Planta La Campaneta (Calle 2)',
      defaultMaterial: 'Árido reciclado',
      defaultGranulometry: '20-40 mm',
      defaultReferenceType: 'cono_trafico',
      defaultReferenceDimensionM: 0.75,
      notes: 'Fracción media limpia para drenaje y hormigón no estructural.',
      isActive: true,
    },
    {
      id: 'zone-aridos-3',
      name: 'Cúpula 3 - Árido Reciclado 40-80 mm',
      location: 'Planta La Campaneta (Calle 1)',
      defaultMaterial: 'Árido reciclado',
      defaultGranulometry: '40-80 mm',
      defaultReferenceType: 'palet_europeo',
      defaultReferenceDimensionM: 1.2,
      notes: 'Fracción gruesa balasto para estabilización de suelos.',
      isActive: true,
    },
    {
      id: 'zone-obra-movil',
      name: 'Obra Externa - Trituradora Móvil',
      location: 'Obra Externa (Comarca Cinca Medio)',
      defaultMaterial: 'Árido reciclado',
      defaultGranulometry: '0-20 mm',
      defaultReferenceType: 'palo_graduado',
      defaultReferenceDimensionM: 2.0,
      notes: 'Trituración in-situ en obra con equipo sobre orugas.',
      isActive: true,
    },
    {
      id: 'zone-triaje',
      name: 'Parque de Maderas y Plásticos',
      location: 'Planta La Campaneta (Nave)',
      defaultMaterial: 'Madera',
      defaultReferenceType: 'contenedor_obra',
      defaultReferenceDimensionM: 3.8,
      notes: 'Contenedor metálico de 5m³ de referencia (3,80m).',
      isActive: true,
    },
  ],
  rejectionThresholds: {
    limpioMax: 3.0,
    mixtoMax: 10.0,
    sucioMax: 20.0,
    surchargePercentMuySucio: 35.0,
  },
  calibrationFactors: initialCalibrationFactors,
  rates: initialRates,
  highPrecisionMode: false,
  reduceDensityOnRejection: true,
  hazardDetectionEnabled: true,
  hazardSensitivity: 'media',
  hazardProtocolText:
    '1. Detener de inmediato la maquinaria y acordonar el acopio.\n2. La IA es una ayuda preventiva; NO certifica amianto sin análisis de laboratorio acreditado.\n3. Si hay sospecha de amianto, no tocar ni fragmentar; notificar al responsable de Medio Ambiente y empresa RERA autorizada.\n4. En caso de aerosoles o productos químicos, retirar manualmente con guantes y depositar en el contenedor de residuos peligrosos.',
  operatorName: 'Carlos M. (Operario)',
  theme: 'dark',
  language: 'es',
};

export const DEFAULT_VISUAL_SAMPLES: VisualReferenceSample[] = [
  {
    id: 'ref-escombro-limpio',
    title: 'Escombro Limpio (<3% impropios)',
    category: 'limpieza',
    typeTag: 'limpio',
    description: 'Hormigón, cerámico y ladrillo limpios sin maderas ni plásticos. Apto para trituración directa.',
    imageThumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
    isCompanyPhoto: false,
  },
  {
    id: 'ref-escombro-mixto',
    title: 'Escombro Mixto (3-10% impropios)',
    category: 'limpieza',
    typeTag: 'mixto',
    description: 'Ladrillos, mortero y restos minerales con pequeñas cantidades aisladas de madera o film.',
    imageThumbnail: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=400&q=80',
    isCompanyPhoto: false,
  },
  {
    id: 'ref-escombro-sucio',
    title: 'Escombro Sucio (10-20% impropios)',
    category: 'limpieza',
    typeTag: 'sucio',
    description: 'Escombro con restos notables de carpinterías, tuberías de PVC, plásticos y sacos de papel.',
    imageThumbnail: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=400&q=80',
    isCompanyPhoto: false,
  },
  {
    id: 'ref-escombro-muy-sucio',
    title: 'Escombro Muy Sucio (>20% - ALERTA)',
    category: 'limpieza',
    typeTag: 'muy_sucio',
    description: 'Gran abundancia de materiales banales: maderas largas, yesos, cartones y basuras. Recargo obligatorio.',
    imageThumbnail: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=400&q=80',
    isCompanyPhoto: false,
  },
  {
    id: 'ref-arido-0-20',
    title: 'Árido Reciclado 0-20 mm (Zahorra)',
    category: 'granulometria',
    typeTag: '0-20 mm',
    description: 'Fracción fina para compactación de subbases de viales y soleras.',
    imageThumbnail: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=400&q=80',
    isCompanyPhoto: false,
  },
  {
    id: 'ref-arido-20-40',
    title: 'Árido Reciclado 20-40 mm (Gravilla Media)',
    category: 'granulometria',
    typeTag: '20-40 mm',
    description: 'Fracción media limpia sin finos, para lechos de drenaje y hormigones no estructurales.',
    imageThumbnail: 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=400&q=80',
    isCompanyPhoto: false,
  },
  {
    id: 'ref-arido-40-80',
    title: 'Árido Reciclado 40-80 mm (Balasto)',
    category: 'granulometria',
    typeTag: '40-80 mm',
    description: 'Fracción gruesa limpia para estabilización de terraplenes y pedraplenes.',
    imageThumbnail: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80',
    isCompanyPhoto: false,
  },
  {
    id: 'ref-peligroso-amianto',
    title: 'Sospecha de Amianto / Fibrocemento',
    category: 'peligroso',
    typeTag: 'amianto_uralita',
    description: 'Placas onduladas o planas grisáceas con estructura fibrosa de rotura. Paralizar manipulación de inmediato.',
    imageThumbnail: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=400&q=80',
    isCompanyPhoto: false,
  },
  {
    id: 'ref-peligroso-aerosoles',
    title: 'Residuo Peligroso: Aerosoles y Sprays',
    category: 'peligroso',
    typeTag: 'aerosoles',
    description: 'Botes presurizados que presentan riesgo grave de explosión e incendio en machacadoras.',
    imageThumbnail: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=400&q=80',
    isCompanyPhoto: false,
  },
];

export const storageService = {
  // ── MIGRACIÓN Y SINCRONIZACIÓN INICIAL ───────────────────────────
  async checkAndRunInitialMigration(): Promise<void> {
    try {
      const alreadyMigrated = localStorage.getItem(STORAGE_KEYS.MIGRATED);
      if (alreadyMigrated) return;

      const localRecords = this.getLocalRecords();
      const localZones = this.getLocalZones();

      await fetch('/api/migrate-from-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: localRecords.length > 0 ? localRecords : EXPANDED_DEMO_RECORDS,
          zones: localZones.length > 0 ? localZones : DEFAULT_SETTINGS.zones,
          operatorUser: 'Migración Inicial',
        }),
      });

      localStorage.setItem(STORAGE_KEYS.MIGRATED, 'true');
    } catch (e) {
      console.warn('Initial migration to server DB deferred:', e);
    }
  },

  // ── AJUSTES ─────────────────────────────────────────────────────
  getSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!stored) {
        return DEFAULT_SETTINGS;
      }
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      // Sincronizar en segundo plano con el servidor
      fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, operatorUser: settings.operatorName }),
      }).catch((e) => console.warn('Sync settings failed:', e));
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  },

  // ── REGISTROS DE ACOPIOS ────────────────────────────────────────
  getLocalRecords(): PileAnalysisRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECORDS);
      if (!stored) {
        this.saveLocalRecords(EXPANDED_DEMO_RECORDS);
        return EXPANDED_DEMO_RECORDS;
      }
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  },

  saveLocalRecords(records: PileAnalysisRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error('Error saving records to localStorage:', e);
    }
  },

  async getRecords(): Promise<PileAnalysisRecord[]> {
    try {
      const res = await fetch('/api/records');
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          this.saveLocalRecords(json.data);
          return json.data;
        }
      }
    } catch (e) {
      console.warn('Network offline, returning local cache:', e);
    }
    return this.getLocalRecords();
  },

  async addRecord(record: PileAnalysisRecord, operatorUser = 'Operario Planta'): Promise<void> {
    // Actualizar caché local inmediatamente
    const current = this.getLocalRecords();
    const updated = [record, ...current.filter((r) => r.id !== record.id)];
    this.saveLocalRecords(updated);

    // Guardar en servidor
    try {
      await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...record, operatorUser }),
      });
    } catch (e) {
      console.warn('Add record to server offline, stored locally:', e);
    }
  },

  async updateRecord(record: PileAnalysisRecord, operatorUser = 'Operario Planta'): Promise<void> {
    const current = this.getLocalRecords();
    const idx = current.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      current[idx] = record;
      this.saveLocalRecords(current);
    }

    try {
      await fetch(`/api/records/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...record, operatorUser }),
      });
    } catch (e) {
      console.warn('Update record to server offline:', e);
    }
  },

  async deleteRecord(id: string, operatorUser = 'Operario Planta'): Promise<void> {
    const current = this.getLocalRecords().filter((r) => r.id !== id);
    this.saveLocalRecords(current);

    try {
      await fetch(`/api/records/${id}?operatorUser=${encodeURIComponent(operatorUser)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Delete record from server offline:', e);
    }
  },

  // ── ZONAS DE ACOPIO ─────────────────────────────────────────────
  getLocalZones(): PileZone[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ZONES);
      if (!stored) {
        this.saveLocalZones(DEFAULT_SETTINGS.zones);
        return DEFAULT_SETTINGS.zones;
      }
      return JSON.parse(stored);
    } catch (e) {
      return DEFAULT_SETTINGS.zones;
    }
  },

  saveLocalZones(zones: PileZone[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ZONES, JSON.stringify(zones));
    } catch (e) {
      console.error('Error saving zones to localStorage:', e);
    }
  },

  async getZones(): Promise<PileZone[]> {
    try {
      const res = await fetch('/api/zones');
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          this.saveLocalZones(json.data);
          return json.data;
        }
      }
    } catch (e) {
      console.warn('Zones from server offline, using local:', e);
    }
    return this.getLocalZones();
  },

  async saveZone(zone: PileZone, operatorUser = 'Operario Planta'): Promise<void> {
    const zones = this.getLocalZones();
    const idx = zones.findIndex((z) => z.id === zone.id);
    if (idx >= 0) zones[idx] = zone;
    else zones.push(zone);
    this.saveLocalZones(zones);

    try {
      await fetch(zone.id ? `/api/zones/${zone.id}` : '/api/zones', {
        method: zone.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...zone, operatorUser }),
      });
    } catch (e) {
      console.warn('Save zone server offline:', e);
    }
  },

  async deleteZone(id: string, operatorUser = 'Operario Planta'): Promise<void> {
    const zones = this.getLocalZones().filter((z) => z.id !== id);
    this.saveLocalZones(zones);
    try {
      await fetch(`/api/zones/${id}?operatorUser=${encodeURIComponent(operatorUser)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Delete zone server offline:', e);
    }
  },

  // ── BIBLIOTECA DE CALIBRACIÓN Y MUESTRAS FEW-SHOT ───────────────
  async getCalibrationSamples(): Promise<CalibrationSample[]> {
    try {
      const res = await fetch('/api/calibration-samples');
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch (e) {
      console.warn('Calibration samples offline:', e);
    }
    return [];
  },

  async saveCalibrationSample(sample: CalibrationSample, operatorUser = 'Operario Planta'): Promise<void> {
    try {
      await fetch('/api/calibration-samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sample, operatorUser }),
      });
    } catch (e) {
      console.warn('Save calibration sample offline:', e);
    }
  },

  async deleteCalibrationSample(id: string, operatorUser = 'Operario Planta'): Promise<void> {
    try {
      await fetch(`/api/calibration-samples/${id}?operatorUser=${encodeURIComponent(operatorUser)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Delete calibration sample offline:', e);
    }
  },

  async batchImportCalibrationCsv(samples: CalibrationSample[], operatorUser = 'Operario Planta'): Promise<number> {
    try {
      const res = await fetch('/api/calibration-samples/batch-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples, operatorUser }),
      });
      const json = await res.json();
      return json.importedCount || samples.length;
    } catch (e) {
      console.warn('Batch import offline:', e);
      return 0;
    }
  },

  // ── ALERTAS DE RESIDUOS PELIGROSOS ──────────────────────────────
  async getHazardAlerts(): Promise<any[]> {
    try {
      const res = await fetch('/api/hazard-alerts');
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch (e) {
      console.warn('Hazard alerts offline:', e);
    }
    return [];
  },

  async updateHazardAlertStatus(
    alertId: string,
    status: 'confirmada' | 'descartada' | 'pendiente',
    reviewedBy: string,
    reviewNotes: string
  ): Promise<void> {
    try {
      await fetch(`/api/hazard-alerts/${alertId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewedBy, reviewNotes }),
      });
    } catch (e) {
      console.warn('Update hazard alert offline:', e);
    }
  },

  // ── AUDITORÍA ───────────────────────────────────────────────────
  async getAuditLogs(entityId?: string): Promise<AuditLogEntry[]> {
    try {
      const url = entityId ? `/api/audit-log?entityId=${encodeURIComponent(entityId)}` : '/api/audit-log';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch (e) {
      console.warn('Audit logs offline:', e);
    }
    return [];
  },

  // ── GUÍA VISUAL CORPORATIVA ─────────────────────────────────────
  getVisualSamples(): VisualReferenceSample[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VISUAL_GUIDE);
      if (!stored) return DEFAULT_VISUAL_SAMPLES;
      return JSON.parse(stored);
    } catch (e) {
      return DEFAULT_VISUAL_SAMPLES;
    }
  },

  saveVisualSamples(samples: VisualReferenceSample[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.VISUAL_GUIDE, JSON.stringify(samples));
    } catch (e) {
      console.error('Error saving visual samples:', e);
    }
  },

  // ── DATOS DEMO Y RESET ──────────────────────────────────────────
  loadDemoData(): void {
    this.saveLocalRecords(EXPANDED_DEMO_RECORDS);
    // Sincronizar en bloque con el backend
    fetch('/api/migrate-from-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: EXPANDED_DEMO_RECORDS,
        zones: DEFAULT_SETTINGS.zones,
        operatorUser: 'Carga Demo 12 Meses',
      }),
    }).catch((e) => console.warn('Demo sync to server deferred:', e));
  },

  clearDemoData(): void {
    const nonDemo = this.getLocalRecords().filter((r) => !r.isDemo);
    this.saveLocalRecords(nonDemo);
  },

  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.RECORDS);
    this.saveLocalRecords([]);
  },

  // ── COPIA DE SEGURIDAD Y RESTAURACIÓN ───────────────────────────
  exportBackupJson(): string {
    const backup = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      records: this.getLocalRecords(),
      settings: this.getSettings(),
      visualSamples: this.getVisualSamples(),
      zones: this.getSettings().zones || [],
    };
    return JSON.stringify(backup, null, 2);
  },

  restoreBackupJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (!data || (!data.records && !data.settings)) {
        return false;
      }
      if (Array.isArray(data.records)) {
        this.saveLocalRecords(data.records);
      }
      if (data.settings && typeof data.settings === 'object') {
        this.saveSettings(data.settings);
      }
      if (Array.isArray(data.visualSamples)) {
        this.saveVisualSamples(data.visualSamples);
      }
      return true;
    } catch (e) {
      console.error('Error parsing backup JSON:', e);
      return false;
    }
  },
};
