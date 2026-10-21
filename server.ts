import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  getAllRecords,
  getRecordById,
  saveRecord,
  softDeleteRecord,
  getAllZones,
  saveZone,
  deleteZone,
  getAllCalibrationSamples,
  saveCalibrationSample,
  deleteCalibrationSample,
  getFewShotSamplesForAnalysis,
  getAllHazardAlerts,
  updateHazardAlertStatus,
  getAuditLogs,
  getStoredSettings,
  saveStoredSettings,
  exportFullDatabaseBackup,
  restoreFullDatabaseBackup,
  logAudit,
  INITIAL_ZONES,
  getAllUsers,
  getUserById,
  saveUser,
  deleteUser,
} from './server/db.ts';
import { OFFICIAL_CATALOG } from './src/services/catalog.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const app = express();
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Shared Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: GEMINI_MODEL,
    storageType: 'persistent_filesystem_json_atomic',
  });
});

// ── REST API: REGISTROS DE ACOPIOS ────────────────────────────────
app.get('/api/records', (req: Request, res: Response) => {
  const includeDeleted = req.query.includeDeleted === 'true';
  const records = getAllRecords(includeDeleted);
  res.json({ success: true, count: records.length, data: records });
});

app.get('/api/records/:id', (req: Request, res: Response) => {
  const record = getRecordById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Acopio no encontrado' });
  res.json({ success: true, data: record });
});

app.post('/api/records', (req: Request, res: Response) => {
  const operatorUser = req.body.operatorUser || 'Operario Planta';
  const saved = saveRecord(req.body, operatorUser);
  res.status(201).json({ success: true, data: saved });
});

app.put('/api/records/:id', (req: Request, res: Response) => {
  const operatorUser = req.body.operatorUser || 'Operario Planta';
  const existing = getRecordById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Acopio no encontrado' });
  const updated = saveRecord({ ...existing, ...req.body, id: req.params.id }, operatorUser);
  res.json({ success: true, data: updated });
});

app.delete('/api/records/:id', (req: Request, res: Response) => {
  const operatorUser = (req.query.operatorUser as string) || 'Operario Planta';
  const ok = softDeleteRecord(req.params.id, operatorUser);
  if (!ok) return res.status(404).json({ error: 'Acopio no encontrado' });
  res.json({ success: true, message: 'Registro borrado lógicamente' });
});

// ── REST API: ZONAS DE ACOPIO ─────────────────────────────────────
app.get('/api/zones', (_req: Request, res: Response) => {
  const zones = getAllZones();
  res.json({ success: true, count: zones.length, data: zones });
});

app.post('/api/zones', (req: Request, res: Response) => {
  const operatorUser = req.body.operatorUser || 'Operario Planta';
  const saved = saveZone(req.body, operatorUser);
  res.status(201).json({ success: true, data: saved });
});

app.put('/api/zones/:id', (req: Request, res: Response) => {
  const operatorUser = req.body.operatorUser || 'Operario Planta';
  const updated = saveZone({ ...req.body, id: req.params.id }, operatorUser);
  res.json({ success: true, data: updated });
});

app.delete('/api/zones/:id', (req: Request, res: Response) => {
  const operatorUser = (req.query.operatorUser as string) || 'Operario Planta';
  const ok = deleteZone(req.params.id, operatorUser);
  if (!ok) return res.status(404).json({ error: 'Zona no encontrada' });
  res.json({ success: true });
});

// ── REST API: USUARIOS Y CONTROL DE ROLES (RBAC) ───────────────────
app.get('/api/users', (_req: Request, res: Response) => {
  const users = getAllUsers();
  res.json({ success: true, count: users.length, data: users });
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ success: true, data: user });
});

app.post('/api/users', (req: Request, res: Response) => {
  const operatorUser = req.body.adminUser || 'Administrador Planta';
  const saved = saveUser(req.body, operatorUser);
  res.status(201).json({ success: true, data: saved });
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  const operatorUser = req.body.adminUser || 'Administrador Planta';
  const updated = saveUser({ ...req.body, id: req.params.id }, operatorUser);
  res.json({ success: true, data: updated });
});

app.delete('/api/users/:id', (req: Request, res: Response) => {
  const operatorUser = (req.query.operatorUser as string) || 'Administrador Planta';
  const ok = deleteUser(req.params.id, operatorUser);
  if (!ok) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ success: true });
});

// ── REST API: CALIBRACIÓN Y FEW-SHOT ──────────────────────────────
app.get('/api/calibration-samples', (_req: Request, res: Response) => {
  const samples = getAllCalibrationSamples();
  res.json({ success: true, count: samples.length, data: samples });
});

app.post('/api/calibration-samples', (req: Request, res: Response) => {
  const operatorUser = req.body.operatorUser || 'Operario Planta';
  const saved = saveCalibrationSample(req.body, operatorUser);
  res.status(201).json({ success: true, data: saved });
});

app.post('/api/calibration-samples/batch-csv', (req: Request, res: Response) => {
  const { samples, operatorUser = 'Operario Planta' } = req.body;
  if (!Array.isArray(samples)) {
    return res.status(400).json({ error: 'Se esperaba un array de muestras.' });
  }

  let count = 0;
  for (const s of samples) {
    if (s.material && s.realWeightTonnes) {
      saveCalibrationSample(s, operatorUser);
      count++;
    }
  }

  logAudit(operatorUser, 'IMPORTACION_CSV', 'calibration_sample', 'batch-import', `Importación de ${count} muestras de calibración`);
  res.json({ success: true, importedCount: count });
});

app.delete('/api/calibration-samples/:id', (req: Request, res: Response) => {
  const operatorUser = (req.query.operatorUser as string) || 'Operario Planta';
  const ok = deleteCalibrationSample(req.params.id, operatorUser);
  if (!ok) return res.status(404).json({ error: 'Muestra no encontrada' });
  res.json({ success: true });
});

// ── REST API: ALERTAS DE PELIGROSIDAD ─────────────────────────────
app.get('/api/hazard-alerts', (_req: Request, res: Response) => {
  const alerts = getAllHazardAlerts();
  res.json({ success: true, count: alerts.length, data: alerts });
});

app.put('/api/hazard-alerts/:id', (req: Request, res: Response) => {
  const { status, reviewedBy = 'Inspector RCD', reviewNotes = '' } = req.body;
  if (!['confirmada', 'descartada', 'pendiente'].includes(status)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }
  const updated = updateHazardAlertStatus(req.params.id, status, reviewedBy, reviewNotes);
  if (!updated) return res.status(404).json({ error: 'Alerta no encontrada' });
  res.json({ success: true, data: updated });
});

// ── REST API: AUDITORÍA Y TRAZABILIDAD ────────────────────────────
app.get('/api/audit-log', (req: Request, res: Response) => {
  const entityId = req.query.entityId as string | undefined;
  const limit = parseInt(req.query.limit as string) || 200;
  const logs = getAuditLogs(entityId, limit);
  res.json({ success: true, count: logs.length, data: logs });
});

// ── REST API: AJUSTES GLOBALES ────────────────────────────────────
app.get('/api/settings', (_req: Request, res: Response) => {
  const settings = getStoredSettings({} as any);
  res.json({ success: true, data: settings });
});

app.put('/api/settings', (req: Request, res: Response) => {
  const operatorUser = req.body.operatorUser || 'Operario Planta';
  const updated = saveStoredSettings(req.body, operatorUser);
  res.json({ success: true, data: updated });
});

// ── REST API: BACKUP & RESTAURACIÓN ───────────────────────────────
app.get('/api/database/backup', (_req: Request, res: Response) => {
  const backup = exportFullDatabaseBackup();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=backup_rcd_circular_${new Date().toISOString().slice(0, 10)}.json`);
  res.json(backup);
});

app.post('/api/database/restore', (req: Request, res: Response) => {
  const operatorUser = req.body.operatorUser || 'Administrador Planta';
  const ok = restoreFullDatabaseBackup(req.body.backupData, operatorUser);
  if (!ok) return res.status(400).json({ error: 'El archivo de copia de seguridad no es válido.' });
  res.json({ success: true, message: 'Base de datos restaurada con éxito.' });
});

// ── REST API: MIGRACIÓN INICIAL DESDE LOCALSTORAGE ─────────────────
app.post('/api/migrate-from-local', (req: Request, res: Response) => {
  const { records = [], zones = [], operatorUser = 'Migración Local' } = req.body;
  let migratedRecords = 0;
  let migratedZones = 0;

  if (Array.isArray(records)) {
    const existing = getAllRecords(true);
    for (const r of records) {
      if (!existing.some((e) => e.id === r.id)) {
        saveRecord(r, operatorUser);
        migratedRecords++;
      }
    }
  }

  if (Array.isArray(zones)) {
    const existingZones = getAllZones();
    for (const z of zones) {
      if (!existingZones.some((ez) => ez.id === z.id)) {
        saveZone(z, operatorUser);
        migratedZones++;
      }
    }
  }

  res.json({
    success: true,
    migratedRecords,
    migratedZones,
    message: `Migración completada: ${migratedRecords} registros y ${migratedZones} zonas transferidas.`,
  });
});

// ── PROCESAMIENTO MULTIMODAL CON GEMINI ───────────────────────────
app.post('/api/analyze-pile', async (req: Request, res: Response) => {
  try {
    const {
      images,
      category = 'Detectar automáticamente',
      referenceObject,
      manualMeasurement,
      location = 'Planta La Campaneta',
      zoneId,
      pileName = '',
      highPrecisionMode = false,
      hazardDetectionEnabled = true,
      hazardSensitivity = 'media',
      visualGuideReferences = [],
    } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos una imagen del acopio.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'No se ha configurado la clave GEMINI_API_KEY en el entorno de AI Studio.',
      });
    }

    // Preparar ejemplos de Few-Shot de la biblioteca de calibración
    const fewShotSamples = getFewShotSamplesForAnalysis(
      category === 'Producto tratado' ? 'Árido reciclado' : 'Escombro',
      undefined,
      undefined,
      zoneId,
      3
    );

    // Instrucciones de sistema con catálogo cerrado y detección de peligrosos
    const systemInstruction = `Eres un ingeniero senior experto en visión artificial, fotogrametría terrestre y gestión de plantas de valorización de Residuos de Construcción y Demolición (RCD) en RCD Circular (Monzón, Aragón).
RCD Circular solo recibe residuos NO peligrosos y produce áridos reciclados en tres tamaños. Tu labor es analizar fotografías tomadas a nivel de suelo de acopios y extraer dimensiones geométricas exactas, clasificar el material de acuerdo al catálogo oficial de la empresa, estimar el nivel de limpieza e inspeccionar si hay residuos peligrosos.

CATÁLOGO CERRADO DE MATERIALES DE RCD CIRCULAR (OBLIGATORIO):
A) RESIDUO RECIBIDO:
  1. "Escombro": mezcla de residuos de albañilería, ladrillo, mortero, azulejos y hormigón troceado. Requiere OBLIGATORIAMENTE evaluar el nivel de limpieza: 'limpio' (<3%), 'mixto' (3-10%), 'sucio' (10-20%), 'muy_sucio' (>20%).
  2. "Hormigón": bloques y soleras de hormigón limpio. SOLO se acepta limpio. Si se aprecian maderas, plásticos o yesos, se debe activar la alerta de calidad "Hormigón no conforme".
  3. "Madera": maderas de encofrado, tarimas, puertas, palets de derribo.
  4. "Yesos y pladur": placas de yeso laminado, molduras, escayola.
  5. "Metales": ferralla, perfiles de acero, carpintería metálica suelta.
  6. "Vidrio": vidrio plano de ventanas o cristales (presencia escasa).
  7. "Cartón / embalajes": cajas de cartón, sacos de papel multicapa.
  8. "Rafia": sacos y tejidos de polipropileno/rafia de escombros (big-bags).
  9. "Plástico fino": film de embalaje, retráctil, láminas de polietileno.
  10. "Residuos peligrosos: aerosoles": botes presurizados o aerosoles. Si se detectan, SIEMPRE es una ALERTA.
  11. "Basura": restos no reciclables, materia orgánica, rechazo general.

B) PRODUCTO TRATADO:
  1. "Árido reciclado": material tratado cribado en TRES granulometrías: "0-20 mm", "20-40 mm", "40-80 mm".
  2. "Árido reciclado de hormigón": fracción cribada procedente exclusivamente de hormigón ("0-20 mm", "20-40 mm", "40-80 mm").
  3. "Árido reciclado mixto": fracción de zahorra reciclada mixta ("0-20 mm", "20-40 mm", "40-80 mm").
  4. "Tierra vegetal": tierra cribada de desmonte ("0-20 mm").

REGLAS DE ESCALA Y FOTOGRAMETRÍA:
1. Utiliza prioritariamente el objeto de referencia declarado:
   - "Palo / jalón graduado de altura conocida": vara o jalón con marcas métricas de altura indicada (${referenceObject?.assumed_dimension_m || 2.0} m).
   - "Pared / muro de dimensiones medidas": muro perimetral o de box de box conocido (ancho y alto).
   - "Cazo de pala cargadora", "Persona", "Palet europeo", "Cono de tráfico", "Contenedor de obra", o "Medida manual conocida".
   - Si no hay referencia detectable, anota 'sin referencia', reduce la confianza global (máximo 0.45) y añade la advertencia en confidence_reduction_factors.
2. Dimensiones geométricas estimadas en metros reales: width_m (ancho base), depth_m (fondo base), height_m (altura vertical máxima), top_radius_m (radio superior si es aplanado).
3. Forma geométrica: 'cono' | 'tronco_cono' | 'semielipsoide' | 'prisma_triangular' | 'forma_compuesta'.
4. DETECCIÓN DE RESIDUOS PELIGROSOS (CRIBADO VISUAL PREVENTIVO):
   - ${hazardDetectionEnabled ? 'ACTIVADA' : 'DESACTIVADA'}. Sensibilidad: ${hazardSensitivity}.
   - Examina visualmente la superficie del acopio en busca de:
     * Placas onduladas o planas grisáceas compatibles con fibrocemento / uralita (posible amianto).
     * Botes de aerosol o sprays presurizados.
     * Envases con pictogramas de peligro CLP/SGH (inflamable, corrosivo, tóxico) o bidones/garrafas de químicos, pinturas o aceites.
     * Bombonas, baterías, tubos fluorescentes, restos asfálticos.
   - Si detectas sospechas, rellena el bloque hazard_detection indicando tipo, nivel de sospecha (baja/media/alta), delimitación aproximada en la imagen y recomendación.
   - Texto preventivo obligatorio: "Posible residuo peligroso: requiere revisión por un trabajador. La IA NO confirma la presencia de amianto; solo un análisis especializado puede hacerlo."`;

    const userPrompt = `Analiza estas fotografías de acopio en RCD Circular (Ubicación: ${location}, Nombre/ID acopio: ${pileName || 'Sin asignar'}).
Contexto facilitado por el operario:
- Categoría indicada: ${category}
- Objeto de referencia indicado: ${referenceObject ? JSON.stringify(referenceObject) : 'Automático'}
- Medición manual sobre imagen: ${manualMeasurement ? JSON.stringify(manualMeasurement) : 'Ninguna'}
- Número de ángulos proporcionados: ${images.length}
- Zona de acopio seleccionada: ${zoneId || 'Sin zona fija'}

Clasifica de forma rigurosa dentro del catálogo cerrado de RCD Circular, calcula las dimensiones métricas, el nivel de limpieza y la presencia de posibles residuos peligrosos.`;

    // Partes de contenido para Gemini
    const contentsParts: any[] = [];

    // Añadir imágenes del acopio a analizar
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const match = img.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        contentsParts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      } else {
        contentsParts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: img,
          },
        });
      }
    }

    // Si hay ejemplos few-shot de la biblioteca de calibración, añadir referencias
    if (fewShotSamples.length > 0) {
      let fewShotDesc = `\n[REFERENCIAS HISTÓRICAS DE RCD CIRCULAR CON PESAJE REAL EN BÁSCULA PARA COMPARACIÓN VISUAL]:\n`;
      fewShotSamples.forEach((fs, idx) => {
        fewShotDesc += `Ejemplo ${idx + 1}: Material "${fs.material}", Limpieza: "${fs.cleanlinessLevel || 'N/A'}", Granulometría: "${fs.granulometry || 'N/A'}", Peso real contrastado en báscula: ${fs.realWeightTonnes} t.\n`;
      });
      fewShotDesc += `Utiliza estos casos previos como referencia comparativa de densidad y apariencia visual, sin copiar ciegamente los números.\n`;
      contentsParts.push({ text: fewShotDesc });
    }

    // Si se enviaron fotos de la guía visual corporativa, incluir hasta 3
    if (Array.isArray(visualGuideReferences) && visualGuideReferences.length > 0) {
      const guideSubset = visualGuideReferences.slice(0, 3);
      for (const ref of guideSubset) {
        if (ref.imageThumbnail) {
          const match = ref.imageThumbnail.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
          if (match) {
            contentsParts.push({
              inlineData: { mimeType: match[1], data: match[2] },
            });
            contentsParts.push({
              text: `[GUÍA VISUAL CORPORATIVA RCD CIRCULAR]: ${ref.title} (${ref.typeTag}): ${ref.description}`,
            });
          }
        }
      }
    }

    contentsParts.push({ text: userPrompt });

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        pile_detected: {
          type: Type.BOOLEAN,
          description: 'Indica si se ha detectado con certeza un acopio de material en la imagen',
        },
        pile_count: {
          type: Type.INTEGER,
          description: 'Número de acopios distintos identificados en la escena',
        },
        bounding_box: {
          type: Type.ARRAY,
          items: { type: Type.NUMBER },
          description: 'Caja delimitadora normalizada del acopio principal [ymin, xmin, ymax, xmax]',
        },
        polygon: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER },
            },
            required: ['x', 'y'],
          },
          description: 'Puntos clave del polígono perimetral del acopio (coordenadas 0-1)',
        },
        reference_object: {
          type: Type.OBJECT,
          properties: {
            detected: { type: Type.BOOLEAN },
            type: { type: Type.STRING },
            assumed_dimension_m: { type: Type.NUMBER },
            dimension_type: { type: Type.STRING },
            box: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
            },
            confidence: { type: Type.NUMBER },
          },
          required: ['detected', 'type', 'assumed_dimension_m'],
        },
        estimated_scale_m_per_px: {
          type: Type.NUMBER,
          description: 'Escala calculada en metros por píxel a la distancia del acopio',
        },
        scale_reasoning: {
          type: Type.STRING,
          description: 'Explicación técnica del cálculo de escala empleado',
        },
        dimensions: {
          type: Type.OBJECT,
          properties: {
            width_m: { type: Type.NUMBER, description: 'Ancho de la base en metros' },
            depth_m: { type: Type.NUMBER, description: 'Fondo de la base en metros' },
            height_m: { type: Type.NUMBER, description: 'Altura máxima del acopio en metros' },
            top_radius_m: { type: Type.NUMBER, description: 'Radio superior si es tronco de cono' },
          },
          required: ['width_m', 'depth_m', 'height_m'],
        },
        geometric_shape: {
          type: Type.STRING,
          description: 'Forma geométrica: cono | tronco_cono | semielipsoide | prisma_triangular | forma_compuesta',
        },
        shape_factor: {
          type: Type.NUMBER,
          description: 'Factor de forma o llenado (0.70 a 1.0) para compensar irregularidades del talud',
        },
        material_classification: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: 'Residuo recibido o Producto tratado' },
            primary_material: {
              type: Type.STRING,
              description: 'Nombre exacto del catálogo: Escombro | Hormigón | Madera | Yesos y pladur | Metales | Vidrio | Cartón / embalajes | Rafia | Plástico fino | Residuos peligrosos: aerosoles | Basura | Árido reciclado | Árido reciclado de hormigón | Árido reciclado mixto | Tierra vegetal',
            },
            probabilities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  material: { type: Type.STRING },
                  probability: { type: Type.NUMBER },
                },
                required: ['material', 'probability'],
              },
            },
          },
          required: ['category', 'primary_material'],
        },
        granulometry: {
          type: Type.OBJECT,
          properties: {
            applicable: { type: Type.BOOLEAN },
            primary_granulometry: { type: Type.STRING, description: '0-20 mm | 20-40 mm | 40-80 mm' },
            probabilities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  size: { type: Type.STRING },
                  probability: { type: Type.NUMBER },
                },
                required: ['size', 'probability'],
              },
            },
          },
          required: ['applicable'],
        },
        cleanliness: {
          type: Type.OBJECT,
          properties: {
            level: { type: Type.STRING, description: 'limpio | mixto | sucio | muy_sucio' },
            rejection_percentage: { type: Type.NUMBER, description: 'Porcentaje visual estimado de impropios (0-100)' },
            detected_impurities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Lista de materiales banales o impropios detectados (madera, plastico, metal, etc.)',
            },
            excess_rejection_alert: { type: Type.BOOLEAN },
          },
          required: ['level', 'rejection_percentage', 'detected_impurities', 'excess_rejection_alert'],
        },
        hazard_detection: {
          type: Type.OBJECT,
          properties: {
            has_hazard: { type: Type.BOOLEAN },
            findings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: 'amianto_uralita | aerosoles | envases_pictogramas_quimicos | bombonas_baterias | otros_peligrosos' },
                  suspicion_level: { type: Type.STRING, description: 'baja | media | alta' },
                  box: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                  visual_reason: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                },
                required: ['type', 'suspicion_level', 'visual_reason', 'recommendation'],
              },
            },
          },
          required: ['has_hazard', 'findings'],
        },
        confidence_score: {
          type: Type.NUMBER,
          description: 'Nivel global de confianza entre 0.0 y 1.0',
        },
        confidence_reduction_factors: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        observations: {
          type: Type.STRING,
          description: 'Recomendaciones prácticas para el operario de planta',
        },
      },
      required: [
        'pile_detected',
        'dimensions',
        'geometric_shape',
        'shape_factor',
        'material_classification',
        'granulometry',
        'cleanliness',
        'confidence_score',
        'observations',
      ],
    };

    // Ejecución de llamada(s) a Gemini
    const callGemini = async (temp = 0.1) => {
      const genResponse = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: { parts: contentsParts },
        config: {
          systemInstruction,
          temperature: temp,
          responseMimeType: 'application/json',
          responseSchema: responseSchema as any,
        },
      });
      const rawText = genResponse.text || '{}';
      return JSON.parse(rawText);
    };

    let parsedData: any;

    if (highPrecisionMode) {
      // Modo alta precisión: 3 ejecuciones independientes y mediana de dimensiones
      console.log('[AcopioVision] Ejecutando análisis en Modo Alta Precisión (3 muestreos)...');
      const results = await Promise.all([callGemini(0.0), callGemini(0.2), callGemini(0.35)]);
      parsedData = results[0]; // Base estructural

      const widths = results.map((r) => r.dimensions.width_m).sort((a, b) => a - b);
      const depths = results.map((r) => r.dimensions.depth_m).sort((a, b) => a - b);
      const heights = results.map((r) => r.dimensions.height_m).sort((a, b) => a - b);

      // Mediana de dimensiones
      parsedData.dimensions.width_m = widths[1];
      parsedData.dimensions.depth_m = depths[1];
      parsedData.dimensions.height_m = heights[1];
      parsedData.observations += ` [Modo Alta Precisión: Mediana de 3 muestreos fotogramétricos (ancho: ${widths[0].toFixed(1)}–${widths[2].toFixed(1)}m, alto: ${heights[0].toFixed(1)}–${heights[2].toFixed(1)}m)].`;
    } else {
      parsedData = await callGemini(0.1);
    }

    // Normalización de seguridad del material respecto al catálogo
    const matName = parsedData.material_classification?.primary_material || 'Escombro';
    const catalogMatch = OFFICIAL_CATALOG.find(
      (c: any) => c.name.toLowerCase() === matName.toLowerCase() || c.id === matName.toLowerCase()
    );

    if (catalogMatch) {
      parsedData.material_classification.primary_material = catalogMatch.name;
    } else {
      parsedData.material_classification.primary_material = 'Basura';
      parsedData.confidence_reduction_factors = parsedData.confidence_reduction_factors || [];
      parsedData.confidence_reduction_factors.push(`Material "${matName}" fuera de catálogo normalizado; asignado a Basura/Rechazo.`);
    }

    // Comprobación de alerta de calidad en Hormigón
    if (
      parsedData.material_classification.primary_material === 'Hormigón' &&
      parsedData.cleanliness.rejection_percentage > 3.0
    ) {
      parsedData.cleanliness.excess_rejection_alert = true;
      parsedData.observations = `ALERTA DE CALIDAD: Hormigón no conforme (${parsedData.cleanliness.rejection_percentage.toFixed(1)}% de impropios). El hormigón solo se acepta limpio para trituración estructural. ` + parsedData.observations;
    }

    return res.json({
      success: true,
      data: parsedData,
      modelUsed: GEMINI_MODEL,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error analyzing pile with Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Error procesando el análisis de imagen con la API de Gemini.',
    });
  }
});

// Configure Vite middleware in dev or static files in prod
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[AcopioVision] Servidor escuchando en http://0.0.0.0:${PORT} (Modelo: ${GEMINI_MODEL}, Modo: ${isProd ? 'producción' : 'desarrollo'})`);
  });
}

startServer().catch((err) => {
  console.error('[AcopioVision] Error al iniciar el servidor:', err);
  process.exit(1);
});
