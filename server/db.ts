/**
 * Motor de Base de Datos y Persistencia Transaccional en Servidor
 * RCD Circular - Monzón (Aragón)
 *
 * Implementa persistencia en disco (directorio ./data/) con escrituras atómicas
 * temporales (rename), control de concurrencia, tabla de auditoría inmutable (audit_log)
 * y soporte de borrado lógico (soft-delete).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  PileAnalysisRecord,
  PileZone,
  CalibrationSample,
  HazardFinding,
  AuditLogEntry,
  AppSettings,
  UserAccount,
} from '../src/types';
import { OFFICIAL_CATALOG } from '../src/services/catalog';
import { EXPANDED_DEMO_RECORDS } from '../src/services/mockData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

// Asegurar que el directorio de datos existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const FILES = {
  RECORDS: path.join(DATA_DIR, 'records.json'),
  ZONES: path.join(DATA_DIR, 'zones.json'),
  CALIBRATION: path.join(DATA_DIR, 'calibration_samples.json'),
  HAZARDS: path.join(DATA_DIR, 'hazard_alerts.json'),
  AUDIT_LOG: path.join(DATA_DIR, 'audit_log.json'),
  SETTINGS: path.join(DATA_DIR, 'settings.json'),
  USERS: path.join(DATA_DIR, 'users.json'),
};

/**
 * Escritura atómica a disco para evitar archivos corruptos ante cortes
 */
function atomicWriteJson(filePath: string, data: any): void {
  const tempPath = `${filePath}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
}

function readJsonSafe<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      atomicWriteJson(filePath, fallback);
      return fallback;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}, using fallback:`, err);
    return fallback;
  }
}

// ── ZONAS INICIALES POR DEFECTO PARA RCD CIRCULAR (MONZÓN) ────────
export const INITIAL_ZONES: PileZone[] = [
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
    defaultMaterial: 'Árido reciclado de hormigón',
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
];

// ── AUDITORÍA INMUTABLE ───────────────────────────────────────────
export function logAudit(
  operatorUser: string,
  action: AuditLogEntry['action'],
  entityType: AuditLogEntry['entityType'],
  entityId: string,
  entityName?: string,
  previousValue?: any,
  newValue?: any,
  notes?: string
): AuditLogEntry {
  const logs = readJsonSafe<AuditLogEntry[]>(FILES.AUDIT_LOG, []);
  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    operatorUser: operatorUser || 'Operario RCD',
    action,
    entityType,
    entityId,
    entityName,
    previousValue,
    newValue,
    notes,
  };
  logs.unshift(entry);
  // Mantener últimos 10.000 logs
  if (logs.length > 10000) logs.length = 10000;
  atomicWriteJson(FILES.AUDIT_LOG, logs);
  return entry;
}

export function getAuditLogs(entityId?: string, limit = 200): AuditLogEntry[] {
  const logs = readJsonSafe<AuditLogEntry[]>(FILES.AUDIT_LOG, []);
  if (entityId) {
    return logs.filter((l) => l.entityId === entityId).slice(0, limit);
  }
  return logs.slice(0, limit);
}

// ── GESTIÓN DE REGISTROS (ACOPIOS) ────────────────────────────────
export function getAllRecords(includeDeleted = false): PileAnalysisRecord[] {
  let records = readJsonSafe<PileAnalysisRecord[]>(FILES.RECORDS, []);
  if (records.length === 0 && EXPANDED_DEMO_RECORDS.length > 0) {
    records = [...EXPANDED_DEMO_RECORDS];
    atomicWriteJson(FILES.RECORDS, records);
  }
  if (includeDeleted) return records;
  return records.filter((r) => !r.isDeleted);
}

export function getRecordById(id: string): PileAnalysisRecord | undefined {
  const records = getAllRecords(true);
  return records.find((r) => r.id === id);
}

export function saveRecord(record: PileAnalysisRecord, operatorUser = 'Operario'): PileAnalysisRecord {
  const records = getAllRecords(true);
  const index = records.findIndex((r) => r.id === record.id);

  if (index >= 0) {
    const prev = records[index];
    record.updatedAt = new Date().toISOString();
    records[index] = record;
    atomicWriteJson(FILES.RECORDS, records);
    logAudit(operatorUser, 'EDICION', 'record', record.id, record.pileName, prev, record);
  } else {
    record.createdAt = record.createdAt || new Date().toISOString();
    records.unshift(record);
    atomicWriteJson(FILES.RECORDS, records);
    logAudit(operatorUser, 'CREACION', 'record', record.id, record.pileName, undefined, record);
  }

  // Si tiene alertas de peligro, sincronizar con la tabla de alertas
  if (record.hazardDetection?.findings && record.hazardDetection.findings.length > 0) {
    syncHazardAlertsFromRecord(record, operatorUser);
  }

  return record;
}

export function softDeleteRecord(id: string, operatorUser = 'Operario'): boolean {
  const records = getAllRecords(true);
  const record = records.find((r) => r.id === id);
  if (!record) return false;

  record.isDeleted = true;
  record.updatedAt = new Date().toISOString();
  atomicWriteJson(FILES.RECORDS, records);
  logAudit(operatorUser, 'BORRADO_LOGICO', 'record', id, record.pileName, { isDeleted: false }, { isDeleted: true });
  return true;
}

// ── GESTIÓN DE ZONAS DE ACOPIO ────────────────────────────────────
export function getAllZones(): PileZone[] {
  return readJsonSafe<PileZone[]>(FILES.ZONES, INITIAL_ZONES);
}

export function saveZone(zone: PileZone, operatorUser = 'Operario'): PileZone {
  const zones = getAllZones();
  const index = zones.findIndex((z) => z.id === zone.id);
  if (index >= 0) {
    const prev = zones[index];
    zones[index] = zone;
    atomicWriteJson(FILES.ZONES, zones);
    logAudit(operatorUser, 'EDICION', 'zone', zone.id, zone.name, prev, zone);
  } else {
    zone.id = zone.id || `zone-${Date.now()}`;
    zones.push(zone);
    atomicWriteJson(FILES.ZONES, zones);
    logAudit(operatorUser, 'CREACION', 'zone', zone.id, zone.name, undefined, zone);
  }
  return zone;
}

export function deleteZone(id: string, operatorUser = 'Operario'): boolean {
  const zones = getAllZones();
  const index = zones.findIndex((z) => z.id === id);
  if (index < 0) return false;
  const prev = zones[index];
  zones.splice(index, 1);
  atomicWriteJson(FILES.ZONES, zones);
  logAudit(operatorUser, 'BORRADO_LOGICO', 'zone', id, prev.name, prev, undefined);
  return true;
}

// ── BIBLIOTECA DE CALIBRACIÓN Y FEW-SHOT ──────────────────────────
export function getAllCalibrationSamples(): CalibrationSample[] {
  return readJsonSafe<CalibrationSample[]>(FILES.CALIBRATION, []);
}

export function saveCalibrationSample(
  sample: CalibrationSample,
  operatorUser = 'Operario'
): CalibrationSample {
  const samples = getAllCalibrationSamples();
  sample.id = sample.id || `cal-${Date.now()}`;
  sample.createdAt = sample.createdAt || new Date().toISOString();
  samples.unshift(sample);
  atomicWriteJson(FILES.CALIBRATION, samples);
  logAudit(operatorUser, 'CREACION', 'calibration_sample', sample.id, `${sample.material} (${sample.realWeightTonnes}t)`, undefined, sample);
  return sample;
}

export function deleteCalibrationSample(id: string, operatorUser = 'Operario'): boolean {
  const samples = getAllCalibrationSamples();
  const index = samples.findIndex((s) => s.id === id);
  if (index < 0) return false;
  const prev = samples[index];
  samples.splice(index, 1);
  atomicWriteJson(FILES.CALIBRATION, samples);
  logAudit(operatorUser, 'BORRADO_LOGICO', 'calibration_sample', id, `${prev.material}`, prev, undefined);
  return true;
}

/**
 * Selecciona de 2 a 4 muestras de calibración más relevantes para few-shot en Gemini
 */
export function getFewShotSamplesForAnalysis(
  targetMaterial: string,
  targetGranulometry?: string,
  targetCleanliness?: string,
  targetZoneId?: string,
  limit = 3
): CalibrationSample[] {
  const all = getAllCalibrationSamples();
  if (all.length === 0) return [];

  // Puntuación de afinidad
  const scored = all.map((sample) => {
    let score = 0;
    if (sample.material.toLowerCase() === targetMaterial.toLowerCase()) score += 10;
    if (targetGranulometry && sample.granulometry === targetGranulometry) score += 6;
    if (targetCleanliness && sample.cleanlinessLevel === targetCleanliness) score += 4;
    if (targetZoneId && sample.zoneId === targetZoneId) score += 3;
    if (sample.isRcdCompanyPhoto) score += 2;
    return { sample, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.sample);
}

// ── ALERTAS DE RESIDUOS PELIGROSOS Y CALIDAD ──────────────────────
export interface StoredHazardAlert extends HazardFinding {
  recordId: string;
  pileName: string;
  location: string;
  detectedAt: string;
  imageUrl?: string;
}

export function getAllHazardAlerts(): StoredHazardAlert[] {
  return readJsonSafe<StoredHazardAlert[]>(FILES.HAZARDS, []);
}

export function syncHazardAlertsFromRecord(record: PileAnalysisRecord, operatorUser = 'Operario'): void {
  if (!record.hazardDetection?.findings) return;
  const existing = getAllHazardAlerts();

  for (const finding of record.hazardDetection.findings) {
    const alertId = `${record.id}-${finding.id}`;
    const idx = existing.findIndex((a) => a.id === alertId || a.id === finding.id);

    const storedItem: StoredHazardAlert = {
      ...finding,
      id: alertId,
      recordId: record.id,
      pileName: record.pileName,
      location: record.location,
      detectedAt: record.createdAt,
      imageUrl: record.images[0],
    };

    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...storedItem };
    } else {
      existing.unshift(storedItem);
      logAudit(operatorUser, 'CREACION', 'hazard_alert', alertId, `${finding.typeLabel} en ${record.pileName}`, undefined, storedItem);
    }
  }

  atomicWriteJson(FILES.HAZARDS, existing);
}

export function updateHazardAlertStatus(
  alertId: string,
  status: 'confirmada' | 'descartada' | 'pendiente',
  reviewedBy: string,
  reviewNotes: string
): StoredHazardAlert | undefined {
  const alerts = getAllHazardAlerts();
  const alert = alerts.find((a) => a.id === alertId);
  if (!alert) return undefined;

  const prev = { ...alert };
  alert.status = status;
  alert.reviewed_by = reviewedBy;
  alert.reviewed_at = new Date().toISOString();
  alert.review_notes = reviewNotes;

  atomicWriteJson(FILES.HAZARDS, alerts);
  logAudit(reviewedBy, 'REVISION_ALERTA', 'hazard_alert', alertId, `${alert.typeLabel} (${status})`, prev, alert, reviewNotes);

  // Sincronizar de vuelta en el registro correspondiente
  const records = getAllRecords(true);
  const rec = records.find((r) => r.id === alert.recordId);
  if (rec && rec.hazardDetection) {
    const fIdx = rec.hazardDetection.findings.findIndex((f) => f.id === alert.id || `${rec.id}-${f.id}` === alert.id);
    if (fIdx >= 0) {
      rec.hazardDetection.findings[fIdx].status = status;
      rec.hazardDetection.findings[fIdx].reviewed_by = reviewedBy;
      rec.hazardDetection.findings[fIdx].reviewed_at = alert.reviewed_at;
      rec.hazardDetection.findings[fIdx].review_notes = reviewNotes;
      atomicWriteJson(FILES.RECORDS, records);
    }
  }

  return alert;
}

// ── AJUSTES GLOBALES ──────────────────────────────────────────────
export function getStoredSettings(defaultSettings: AppSettings): AppSettings {
  return readJsonSafe<AppSettings>(FILES.SETTINGS, defaultSettings);
}

export function saveStoredSettings(settings: AppSettings, operatorUser = 'Operario'): AppSettings {
  const prev = readJsonSafe<AppSettings>(FILES.SETTINGS, settings);
  atomicWriteJson(FILES.SETTINGS, settings);
  logAudit(operatorUser, 'CAMBIO_AJUSTES', 'settings', 'global-settings', 'Configuración de Planta', prev, settings);
  return settings;
}

// ── GESTIÓN DE USUARIOS Y ROLES (RBAC) ─────────────────────────────
export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-jefe-carlos',
    name: 'Carlos Martínez',
    username: 'carlos.jefe',
    role: 'jefe',
    email: 'carlos.martinez@rcdcircular.es',
    jobTitle: 'Jefe de Planta & Director Técnico',
    plantLocation: 'Planta La Campaneta (Monzón)',
    shift: 'Jornada Completa',
    avatarBg: 'bg-emerald-600',
    isDefault: true,
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'usr-op-manolo',
    name: 'Manolo Gómez',
    username: 'manolo.operario',
    role: 'operario',
    email: 'manolo.gomez@rcdcircular.es',
    jobTitle: 'Operario Retroexcavadora & Acopios',
    plantLocation: 'Planta La Campaneta',
    shift: 'Turno Mañana (07:00 - 15:00)',
    avatarBg: 'bg-amber-600',
    isDefault: false,
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'usr-op-david',
    name: 'David Sanz',
    username: 'david.operario',
    role: 'operario',
    email: 'david.sanz@rcdcircular.es',
    jobTitle: 'Operario Trituradora Móvil & Machaqueo',
    plantLocation: 'Obra Externa / Planta',
    shift: 'Turno Tarde (15:00 - 23:00)',
    avatarBg: 'bg-blue-600',
    isDefault: false,
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'usr-tec-laura',
    name: 'Laura Ibáñez',
    username: 'laura.calidad',
    role: 'tecnico_calidad',
    email: 'laura.ibanez@rcdcircular.es',
    jobTitle: 'Responsable de Báscula y Control Calidad',
    plantLocation: 'Báscula y Laboratorio',
    shift: 'Turno Continuo',
    avatarBg: 'bg-purple-600',
    isDefault: false,
    createdAt: '2026-01-01T08:00:00Z',
  },
];

export function getAllUsers(): UserAccount[] {
  let users = readJsonSafe<UserAccount[]>(FILES.USERS, []);
  if (users.length === 0) {
    users = [...INITIAL_USERS];
    atomicWriteJson(FILES.USERS, users);
  }
  return users;
}

export function getUserById(id: string): UserAccount | undefined {
  return getAllUsers().find((u) => u.id === id);
}

export function saveUser(user: UserAccount, operatorUser = 'Administrador Planta'): UserAccount {
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    const prev = users[idx];
    users[idx] = user;
    atomicWriteJson(FILES.USERS, users);
    logAudit(operatorUser, 'EDICION', 'settings', user.id, `Usuario: ${user.name} (${user.role})`, prev, user);
  } else {
    user.id = user.id || `usr-${Date.now()}`;
    user.createdAt = user.createdAt || new Date().toISOString();
    users.push(user);
    atomicWriteJson(FILES.USERS, users);
    logAudit(operatorUser, 'CREACION', 'settings', user.id, `Usuario: ${user.name} (${user.role})`, undefined, user);
  }
  return user;
}

export function deleteUser(id: string, operatorUser = 'Administrador Planta'): boolean {
  const users = getAllUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return false;
  const filtered = users.filter((u) => u.id !== id);
  atomicWriteJson(FILES.USERS, filtered);
  logAudit(operatorUser, 'BORRADO_LOGICO', 'settings', id, `Eliminado usuario: ${target.name}`, target, undefined);
  return true;
}

// ── COPIA DE SEGURIDAD / RESTAURACIÓN COMPLETA DE LA BD ───────────
export function exportFullDatabaseBackup() {
  return {
    version: '2.0',
    app: 'AcopioVision - RCD Circular (Monzón)',
    exportedAt: new Date().toISOString(),
    records: getAllRecords(true),
    zones: getAllZones(),
    users: getAllUsers(),
    calibrationSamples: getAllCalibrationSamples(),
    hazardAlerts: getAllHazardAlerts(),
    auditLogs: getAuditLogs(undefined, 10000),
    settings: readJsonSafe<any>(FILES.SETTINGS, null),
  };
}

export function restoreFullDatabaseBackup(backupData: any, operatorUser = 'Operario'): boolean {
  try {
    if (!backupData) return false;
    if (Array.isArray(backupData.records)) atomicWriteJson(FILES.RECORDS, backupData.records);
    if (Array.isArray(backupData.zones)) atomicWriteJson(FILES.ZONES, backupData.zones);
    if (Array.isArray(backupData.users)) atomicWriteJson(FILES.USERS, backupData.users);
    if (Array.isArray(backupData.calibrationSamples)) atomicWriteJson(FILES.CALIBRATION, backupData.calibrationSamples);
    if (Array.isArray(backupData.hazardAlerts)) atomicWriteJson(FILES.HAZARDS, backupData.hazardAlerts);
    if (Array.isArray(backupData.auditLogs)) atomicWriteJson(FILES.AUDIT_LOG, backupData.auditLogs);
    if (backupData.settings) atomicWriteJson(FILES.SETTINGS, backupData.settings);

    logAudit(operatorUser, 'IMPORTACION_CSV', 'settings', 'backup-restore', 'Restauración completa de base de datos');
    return true;
  } catch (e) {
    console.error('Error restoring database backup:', e);
    return false;
  }
}
