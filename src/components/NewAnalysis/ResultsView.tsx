/**
 * Paso 4: Pantalla de resultados, inspección de seguridad, desglose y ajuste del operario
 * RCD Circular - Monzón (Aragón)
 */

import React, { useState } from 'react';
import {
  PileAnalysisRecord,
  AppSettings,
  GeometricShape,
  CleanlinessLevel,
} from '../../types';
import { AnalysisDetectionCanvas } from '../AnalysisDetectionCanvas';
import {
  calculateGeometricVolume,
  calculateWeightFromVolume,
} from '../../services/volumeCalculator';
import { exportService } from '../../services/exportService';
import { OFFICIAL_CATALOG } from '../../services/catalog';
import {
  Layers,
  Scale,
  Sparkles,
  AlertTriangle,
  Sliders,
  CheckCircle2,
  Copy,
  Printer,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Info,
  Building2,
  Check,
  PlusCircle,
  X,
  User,
  History,
} from 'lucide-react';

interface ResultsViewProps {
  record: PileAnalysisRecord;
  settings: AppSettings;
  onSaveToHistory: (record: PileAnalysisRecord) => void;
  onGenerateBudget: (record: PileAnalysisRecord) => void;
  onOpenPrintModal: (record: PileAnalysisRecord) => void;
  onResetNewAnalysis: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  record: initialRecord,
  settings,
  onSaveToHistory,
  onGenerateBudget,
  onOpenPrintModal,
  onResetNewAnalysis,
}) => {
  const [currentRecord, setCurrentRecord] = useState<PileAnalysisRecord>(initialRecord);
  const [isSaved, setIsSaved] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [hazardReviewed, setHazardReviewed] = useState(false);

  // Modal para pesaje real directo
  const [showWeighingModal, setShowWeighingModal] = useState(false);
  const [scaleWeightInput, setScaleWeightInput] = useState(
    currentRecord.realScaleWeightTonnes ? currentRecord.realScaleWeightTonnes.toString() : ''
  );
  const [scaleTicketInput, setScaleTicketInput] = useState(currentRecord.scaleTicketNumber || '');

  // Estados de ajuste manual del operario
  const rawDims = currentRecord.aiOutput.dimensions;
  const adjustments = currentRecord.operatorAdjustments;

  const [widthM, setWidthM] = useState<number>(adjustments?.width_m ?? rawDims.width_m);
  const [depthM, setDepthM] = useState<number>(adjustments?.depth_m ?? rawDims.depth_m);
  const [heightM, setHeightM] = useState<number>(adjustments?.height_m ?? rawDims.height_m);
  const [geometricShape, setGeometricShape] = useState<GeometricShape>(
    adjustments?.geometric_shape ?? currentRecord.aiOutput.geometric_shape
  );
  const [shapeFactor, setShapeFactor] = useState<number>(
    adjustments?.shape_factor ?? currentRecord.aiOutput.shape_factor
  );
  const [material, setMaterial] = useState<string>(
    adjustments?.material ?? currentRecord.aiOutput.material_classification.primary_material
  );
  const [cleanlinessLevel, setCleanlinessLevel] = useState<CleanlinessLevel>(
    currentRecord.effectiveCleanliness.level
  );
  const [granulometry, setGranulometry] = useState<string>(
    adjustments?.granulometry ??
      currentRecord.aiOutput.granulometry.primary_granulometry ??
      '0-20 mm'
  );
  const [densityTM3, setDensityTM3] = useState<number>(
    adjustments?.density_t_m3 ??
      (settings.densities[adjustments?.material ?? currentRecord.aiOutput.material_classification.primary_material] || 1.30)
  );

  // Recálculo determinista en vivo cuando el operario mueve un slider
  const handleOperatorChange = (changes: {
    w?: number;
    d?: number;
    h?: number;
    shape?: GeometricShape;
    factor?: number;
    mat?: string;
    cleanliness?: CleanlinessLevel;
    gran?: string;
    density?: number;
  }) => {
    const newW = changes.w !== undefined ? changes.w : widthM;
    const newD = changes.d !== undefined ? changes.d : depthM;
    const newH = changes.h !== undefined ? changes.h : heightM;
    const newShape = changes.shape !== undefined ? changes.shape : geometricShape;
    const newFactor = changes.factor !== undefined ? changes.factor : shapeFactor;
    const newMat = changes.mat !== undefined ? changes.mat : material;
    const newClean = changes.cleanliness !== undefined ? changes.cleanliness : cleanlinessLevel;
    const newGran = changes.gran !== undefined ? changes.gran : granulometry;
    const newDens = changes.density !== undefined ? changes.density : (changes.mat ? (settings.densities[changes.mat] || 1.30) : densityTM3);

    setWidthM(newW);
    setDepthM(newD);
    setHeightM(newH);
    setGeometricShape(newShape);
    setShapeFactor(newFactor);
    setMaterial(newMat);
    setCleanlinessLevel(newClean);
    setGranulometry(newGran);
    setDensityTM3(newDens);

    // Calcular nuevo volumen determinista
    const newVol = calculateGeometricVolume({
      dimensions: {
        width_m: newW,
        depth_m: newD,
        height_m: newH,
        top_radius_m: currentRecord.aiOutput.dimensions.top_radius_m,
      },
      geometricShape: newShape,
      shapeFactor: newFactor,
      confidenceScore: currentRecord.aiOutput.confidence_score,
      hasReferenceObject: Boolean(currentRecord.aiOutput.reference_object?.detected),
      photoCount: currentRecord.images.length,
    });

    // Calcular nuevo peso determinista
    const calFactor = settings.calibrationFactors[newMat] || 1.0;
    const customDensities = { ...settings.densities, [newMat]: newDens };

    const newWeight = calculateWeightFromVolume({
      volumeM3: newVol.nominal_m3,
      minVolumeM3: newVol.min_m3,
      maxVolumeM3: newVol.max_m3,
      materialName: newMat,
      densitySettings: customDensities,
      calibrationFactor: calFactor,
      cleanlinessLevel: newClean,
      rejectionPercentage: currentRecord.effectiveCleanliness.rejection_percentage,
      reduceDensityOnRejection: settings.reduceDensityOnRejection,
    });

    const isModified =
      newW !== rawDims.width_m ||
      newD !== rawDims.depth_m ||
      newH !== rawDims.height_m ||
      newShape !== currentRecord.aiOutput.geometric_shape ||
      newMat !== currentRecord.aiOutput.material_classification.primary_material ||
      newClean !== currentRecord.aiOutput.cleanliness.level ||
      newDens !== (settings.densities[newMat] || 1.30);

    const updated: PileAnalysisRecord = {
      ...currentRecord,
      calculatedVolume: newVol,
      calculatedWeight: newWeight,
      effectiveVolumeM3: newVol.nominal_m3,
      effectiveVolumeRange: [newVol.min_m3, newVol.max_m3],
      effectiveWeightTonnes: newWeight.nominal_tonnes,
      effectiveWeightRange: [newWeight.min_tonnes, newWeight.max_tonnes],
      effectiveMaterial: newMat,
      effectiveGranulometry: newGran,
      effectiveCleanliness: {
        ...currentRecord.effectiveCleanliness,
        level: newClean,
      },
      operatorAdjustments: {
        width_m: newW,
        depth_m: newD,
        height_m: newH,
        geometric_shape: newShape,
        shape_factor: newFactor,
        material: newMat,
        granulometry: newGran,
        density_t_m3: newDens,
        isAdjusted: isModified,
        operator_user: settings.operatorName,
        timestamp: new Date().toISOString(),
      },
    };

    setCurrentRecord(updated);
  };

  const handleSaveScaleWeighing = () => {
    const val = parseFloat(scaleWeightInput);
    if (isNaN(val) || val <= 0) {
      alert('Introduce un peso real válido de báscula en toneladas.');
      return;
    }

    const estimated = currentRecord.effectiveWeightTonnes;
    const errorTonnes = Math.round((estimated - val) * 100) / 100;
    const errorPercent = Math.round(((Math.abs(estimated - val) / val) * 100) * 10) / 10;

    const updated: PileAnalysisRecord = {
      ...currentRecord,
      realScaleWeightTonnes: val,
      scaleTicketNumber: scaleTicketInput.trim() || undefined,
      scaleWeighingDate: new Date().toISOString(),
      scaleVerified: true,
      weightErrorTonnes: errorTonnes,
      weightErrorPercent: errorPercent,
    };

    setCurrentRecord(updated);
    onSaveToHistory(updated);
    setShowWeighingModal(false);
  };

  const handleSave = () => {
    onSaveToHistory(currentRecord);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleCopy = async () => {
    const ok = await exportService.copySummaryToClipboard(currentRecord);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  const cleanliness = currentRecord.effectiveCleanliness;
  const isTreated = currentRecord.aiOutput.material_classification.category === 'Producto tratado';
  const confidence = currentRecord.aiOutput.confidence_score;
  const primaryImg = currentRecord.images[0] || '';
  const hazards = currentRecord.hazardDetection?.findings || [];
  const hasHighHazard = hazards.some((h) => h.suspicion_level === 'alta');

  // Semáforo de limpieza
  const cleanlinessStyles = {
    limpio: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', label: 'Limpio (<3%)' },
    mixto: { bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30', label: 'Mixto (3-10%)' },
    sucio: { bg: 'bg-orange-500/10 text-orange-300 border-orange-500/30', label: 'Sucio (10-20%)' },
    muy_sucio: { bg: 'bg-red-500/20 text-red-300 border-red-500/50', label: 'Muy Sucio (>20%)' },
  }[cleanliness.level] || { bg: 'bg-slate-800 text-slate-300 border-slate-700', label: cleanliness.level };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* 1. ALERTA DE RESIDUOS PELIGROSOS (SI APLICA) */}
      {hazards.length > 0 && (
        <div className="bg-red-950/60 border-2 border-red-500/80 p-5 rounded-3xl shadow-xl shadow-red-950/40 space-y-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-7 h-7 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-red-200 uppercase tracking-wide">
                  ¡Alerta de Seguridad: Posible Residuo Peligroso Detectado!
                </h4>
                <span className="text-xs bg-red-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full font-mono">
                  {hazards.length} SOSPECHA(S)
                </span>
              </div>
              <p className="text-xs text-red-200/90 leading-relaxed font-semibold">
                Posible residuo peligroso: requiere revisión por un trabajador. La IA NO confirma la presencia de amianto; solo un análisis especializado de laboratorio acreditado puede hacerlo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {hazards.map((h, i) => (
              <div key={i} className="p-3 bg-red-900/30 rounded-2xl border border-red-500/40 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <strong className="text-white capitalize">{h.type.replace('_', ' ')}</strong>
                  <span className="text-[10px] bg-red-950 px-2 py-0.5 rounded text-red-300 font-mono font-bold">
                    Sospecha: {h.suspicion_level.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-red-200">{h.visual_reason}</p>
                <p className="text-[11px] text-amber-200 font-medium">Acción: {h.recommendation}</p>
              </div>
            ))}
          </div>

          {hasHighHazard && (
            <div className="pt-2 border-t border-red-500/40 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-red-200 font-bold">
                <input
                  type="checkbox"
                  checked={hazardReviewed}
                  onChange={(e) => setHazardReviewed(e.target.checked)}
                  className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                />
                <span>He realizado la inspección visual presencial del protocolo de seguridad</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* 2. ALERTA DE NO CONFORMIDAD / CALIDAD */}
      {cleanliness.excess_rejection_alert && (
        <div className="bg-amber-950/40 border border-amber-500/60 p-4 rounded-3xl flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-200 uppercase tracking-wide">
              {currentRecord.effectiveMaterial === 'Hormigón'
                ? '¡Alerta de Calidad: Hormigón No Conforme!'
                : 'Alerta de Exceso de Rechazo en Recepción (>20%)'}
            </h4>
            <p className="text-xs text-amber-300">
              {currentRecord.effectiveMaterial === 'Hormigón'
                ? 'El hormigón solo se acepta 100% limpio para machaqueo estructural. Se han detectado impropios banales.'
                : `El acopio contiene un estimado de ${cleanliness.rejection_percentage.toFixed(1)}% de impropios (${cleanliness.detected_impurities.join(', ') || 'plásticos, maderas'}). Requiere recargo de triaje.`}
            </p>
          </div>
        </div>
      )}

      {/* 3. TARJETAS PRINCIPALES: PESO Y VOLUMEN ESTIMADOS (PESO DESTACADO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tarjeta PESO ESTIMADO (DATO PRINCIPAL) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-lime-500/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-44 h-44 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-bold text-lime-400 uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5 font-mono">
              <Scale className="w-4 h-4" />
              <span>Peso Estimado (Dato Principal)</span>
            </span>
            <span className="bg-lime-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold">
              d = {densityTM3.toFixed(2)} t/m³
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-5xl sm:text-6xl font-black text-white font-mono tracking-tight">
              ≈ {currentRecord.effectiveWeightTonnes.toLocaleString('es-ES')}
            </span>
            <span className="text-3xl font-bold text-lime-400 font-mono">t</span>
          </div>

          <div className="text-xs text-slate-400 font-mono flex items-center justify-between pt-3 border-t border-slate-800">
            <span>Rango de tonelaje:</span>
            <span className="text-white font-bold">
              {currentRecord.effectiveWeightRange[0]} – {currentRecord.effectiveWeightRange[1]} t
            </span>
          </div>

          {/* Estado de báscula */}
          {currentRecord.scaleVerified ? (
            <div className="mt-3 p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs flex items-center justify-between">
              <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Báscula Oficial: {currentRecord.realScaleWeightTonnes} t</span>
              </span>
              <span className="text-emerald-400 font-mono font-bold">
                Error: {currentRecord.weightErrorPercent?.toFixed(1)}% ({currentRecord.weightErrorTonnes} t)
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowWeighingModal(true)}
              className="mt-3 w-full py-2 px-3 bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Scale className="w-4 h-4 text-sky-400" />
              <span>Añadir Pesaje Real (Báscula Puente)</span>
            </button>
          )}
        </div>

        {/* Tarjeta VOLUMEN ESTIMADO */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5 font-mono">
              <Layers className="w-4 h-4" />
              <span>Volumen Calculado</span>
            </span>
            <span className="bg-emerald-500/20 px-2 py-0.5 rounded-full text-[10px]">
              ±{currentRecord.calculatedVolume.error_margin_percent}% Incertidumbre
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
              ≈ {currentRecord.effectiveVolumeM3.toLocaleString('es-ES')}
            </span>
            <span className="text-2xl font-bold text-emerald-400 font-mono">m³</span>
          </div>

          <div className="text-xs text-slate-400 font-mono flex items-center justify-between pt-3 border-t border-slate-800">
            <span>Rango volumétrico:</span>
            <span className="text-white font-bold">
              {currentRecord.effectiveVolumeRange[0]} – {currentRecord.effectiveVolumeRange[1]} m³
            </span>
          </div>
        </div>
      </div>

      {/* METADATOS: MATERIAL, LIMPIEZA/GRANULOMETRÍA, CONFIANZA Y OPERARIO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Material */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Material Catálogo
          </span>
          <span className="text-sm font-bold text-white block truncate">
            {currentRecord.effectiveMaterial}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            {isTreated ? 'Producto tratado' : 'Residuo recibido'}
          </span>
        </div>

        {/* Nivel de Limpieza o Granulometría */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            {isTreated ? 'Granulometría' : 'Nivel de Limpieza'}
          </span>
          {isTreated ? (
            <div>
              <span className="text-sm font-bold text-white block font-mono">
                {currentRecord.effectiveGranulometry || '0-20 mm'}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Cribado normalizado</span>
            </div>
          ) : (
            <div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold border ${cleanlinessStyles.bg}`}>
                {cleanlinessStyles.label}
              </span>
              <span className="text-[11px] text-slate-400 block mt-1 font-mono">
                {cleanliness.rejection_percentage.toFixed(1)}% impropios
              </span>
            </div>
          )}
        </div>

        {/* Confianza IA */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Confianza Global
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-1 mb-1">
            <div
              className={`h-full rounded-full transition-all ${
                confidence >= 0.8
                  ? 'bg-emerald-500'
                  : confidence >= 0.55
                  ? 'bg-amber-400'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.round(confidence * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block">
            {confidence >= 0.8 ? 'Alta fiabilidad' : confidence >= 0.55 ? 'Media' : 'Baja (verificar)'}
          </span>
        </div>

        {/* Trazabilidad / Operario */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Trazabilidad y Operario
          </span>
          <span className="text-xs font-bold text-white block truncate flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{currentRecord.operatorUser || settings.operatorName}</span>
          </span>
          <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
            {new Date(currentRecord.createdAt).toLocaleDateString('es-ES')}
          </span>
        </div>
      </div>

      {/* VISTA FOTOGRAMÉTRICA CON CONTORNOS */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Detección Fotogramétrica Superpuesta</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {currentRecord.pileName} · {currentRecord.location}
          </span>
        </div>

        <AnalysisDetectionCanvas
          imageUrl={primaryImg}
          analysisData={currentRecord.aiOutput}
          manualMeasurement={currentRecord.manualMeasurement}
          className="w-full"
        />
      </div>

      {/* ACCORDEÓN: DESGLOSE TRANSPARENTE DEL CÁLCULO DETERMINISTA */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-800/40 transition"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">
              ¿Cómo se ha calculado? Desglose Matemático Transparente
            </span>
          </div>
          <span className="text-xs text-emerald-400 font-semibold font-mono">
            {showBreakdown ? 'Ocultar' : 'Ver fórmula y parámetros'}
          </span>
        </button>

        {showBreakdown && (
          <div className="p-5 pt-0 border-t border-slate-800/60 text-xs text-slate-300 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Geometría Elegida</span>
                <span className="text-sm font-bold text-white block capitalize">{geometricShape.replace('_', ' ')}</span>
                <span className="text-[11px] text-slate-400 block">Factor forma: {(shapeFactor * 100).toFixed(0)}%</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Dimensiones de Base</span>
                <span className="text-sm font-bold text-white block font-mono">
                  {widthM.toFixed(2)}m × {depthM.toFixed(2)}m
                </span>
                <span className="text-[11px] text-slate-400 block font-mono">Altura máxima: {heightM.toFixed(2)} m</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Densidad & Calibración</span>
                <span className="text-sm font-bold text-white block font-mono">
                  {densityTM3.toFixed(2)} t/m³ (base)
                </span>
                <span className="text-[11px] text-slate-400 block font-mono">
                  Factor mat: ×{settings.calibrationFactors[material]?.toFixed(2) || '1.00'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-emerald-400 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Fórmula de volumen aplicada:</span>
              <p className="text-xs font-semibold">{currentRecord.calculatedVolume.formula_applied}</p>
              <p className="text-[11px] text-slate-400">{currentRecord.calculatedVolume.explanation}</p>
            </div>
          </div>
        )}
      </div>

      {/* ACCORDEÓN: PANEL DE AJUSTE MANUAL DEL OPERARIO (OVERRIDE) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setShowAdjustments(!showAdjustments)}
          className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-800/40 transition"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-lime-400" />
            <span className="text-sm font-bold text-white">
              Ajuste Manual del Operario (Corrección en Vivo)
            </span>
            {currentRecord.operatorAdjustments?.isAdjusted && (
              <span className="text-[10px] bg-lime-500/20 text-lime-400 px-2 py-0.5 rounded-full font-bold">
                Ajustado
              </span>
            )}
          </div>
          <span className="text-xs text-lime-400 font-semibold font-mono">
            {showAdjustments ? 'Cerrar sliders' : 'Editar medidas'}
          </span>
        </button>

        {showAdjustments && (
          <div className="p-5 pt-0 border-t border-slate-800/60 space-y-4">
            <p className="text-xs text-slate-400 pt-2">
              Modifica cualquier parámetro si conoces mejor el terreno o la báscula. El peso y volumen se recalcularán al instante y quedará registrado con tu nombre en la base de datos de trazabilidad.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Ancho base:</span>
                  <span className="font-mono font-bold text-white">{widthM.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  step="0.2"
                  value={widthM}
                  onChange={(e) => handleOperatorChange({ w: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Fondo base:</span>
                  <span className="font-mono font-bold text-white">{depthM.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  step="0.2"
                  value={depthM}
                  onChange={(e) => handleOperatorChange({ d: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Altura máxima:</span>
                  <span className="font-mono font-bold text-white">{heightM.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="12"
                  step="0.1"
                  value={heightM}
                  onChange={(e) => handleOperatorChange({ h: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

            {/* Ajuste de material del catálogo oficial */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Material Catálogo:</label>
                <select
                  value={material}
                  onChange={(e) => handleOperatorChange({ mat: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {OFFICIAL_CATALOG.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name} ({item.category})
                    </option>
                  ))}
                </select>
              </div>

              {material === 'Escombro' && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nivel Limpieza Escombro:</label>
                  <select
                    value={cleanlinessLevel}
                    onChange={(e) => handleOperatorChange({ cleanliness: e.target.value as CleanlinessLevel })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="limpio">Limpio (1,25 t/m³)</option>
                    <option value="mixto">Mixto (1,10 t/m³)</option>
                    <option value="sucio">Sucio (0,95 t/m³)</option>
                    <option value="muy_sucio">Muy sucio (0,80 t/m³)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 block mb-1">Densidad Aparente (t/m³):</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  max="2.5"
                  value={densityTM3}
                  onChange={(e) => handleOperatorChange({ density: parseFloat(e.target.value) || 1.3 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BARRA DE ACCIONES PRINCIPALES */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={handleSave}
          className={`py-3 px-4 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg ${
            isSaved
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 active:scale-98'
          }`}
        >
          {isSaved ? <Check className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{isSaved ? '¡Guardado en BD!' : 'Guardar en BD'}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowWeighingModal(true)}
          className="py-3 px-4 rounded-2xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/25 active:scale-98"
        >
          <Scale className="w-4 h-4" />
          <span>Pesaje Báscula</span>
        </button>

        <button
          type="button"
          onClick={() => onGenerateBudget(currentRecord)}
          className="py-3 px-4 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 active:scale-98"
        >
          <Building2 className="w-4 h-4" />
          <span>Presupuesto</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenPrintModal(currentRecord)}
          className="py-3 px-4 rounded-2xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center justify-center gap-1.5 active:scale-98"
        >
          <Printer className="w-4 h-4 text-sky-400" />
          <span>Informe PDF</span>
        </button>

        <button
          type="button"
          onClick={onResetNewAnalysis}
          className="col-span-2 sm:col-span-1 py-3 px-4 rounded-2xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition flex items-center justify-center gap-1.5 active:scale-98"
        >
          <Sparkles className="w-4 h-4 text-lime-400" />
          <span>Nuevo</span>
        </button>
      </div>

      {/* MODAL REGISTRAR PESAJE BÁSCULA DIRECTO */}
      {showWeighingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setShowWeighingModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-2xl">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-mono">Registrar Pesaje de Báscula</h3>
                <p className="text-xs text-slate-400">Contraste oficial con ticket puente</p>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400">Acopio seleccionado:</span>
                <span className="font-bold text-white block text-sm">{currentRecord.pileName}</span>
                <span className="text-lime-400 font-mono">
                  Peso estimado por IA: {currentRecord.effectiveWeightTonnes.toFixed(1)} t
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Peso Real en Báscula (toneladas): *
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  placeholder="Ej: 182.5"
                  value={scaleWeightInput}
                  onChange={(e) => setScaleWeightInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Número de Ticket / Albarán:
                </label>
                <input
                  type="text"
                  placeholder="Ej: BAS-2026-1145"
                  value={scaleTicketInput}
                  onChange={(e) => setScaleTicketInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowWeighingModal(false)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveScaleWeighing}
                className="py-2.5 px-5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-bold transition shadow-lg shadow-sky-500/25"
              >
                Guardar Pesaje Oficial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
