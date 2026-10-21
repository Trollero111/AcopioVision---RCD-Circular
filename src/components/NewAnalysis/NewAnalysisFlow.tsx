/**
 * Orquestador del flujo principal de análisis (Captura -> Contexto -> Procesamiento -> Resultados)
 * RCD Circular - Monzón (Aragón)
 */

import React, { useState } from 'react';
import {
  PileAnalysisRecord,
  AppSettings,
  ReferenceObjectOption,
  ManualMeasurement,
  GeminiAnalysisRaw,
  HazardFinding,
  HazardDetection,
  UserAccount,
} from '../../types';
import { CaptureStep, PhotoSlot } from './CaptureStep';
import { ContextStep } from './ContextStep';
import { ProcessingStep } from './ProcessingStep';
import { ResultsView } from './ResultsView';
import {
  calculateGeometricVolume,
  calculateWeightFromVolume,
} from '../../services/volumeCalculator';

interface NewAnalysisFlowProps {
  settings: AppSettings;
  currentUser: UserAccount;
  onSaveRecord: (record: PileAnalysisRecord) => void;
  onGenerateBudget: (record: PileAnalysisRecord) => void;
  onOpenPrintModal: (record: PileAnalysisRecord) => void;
}

export const NewAnalysisFlow: React.FC<NewAnalysisFlowProps> = ({
  settings,
  currentUser,
  onSaveRecord,
  onGenerateBudget,
  onOpenPrintModal,
}) => {
  // Estado del flujo (1: Captura, 2: Contexto, 3: Procesando, 4: Resultados)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Datos del análisis en curso
  const [photos, setPhotos] = useState<PhotoSlot[]>([
    { id: 'p1', angleLabel: 'Vista Frontal (Principal)' },
    { id: 'p2', angleLabel: 'Vista Lateral (90°)' },
    { id: 'p3', angleLabel: 'Vista Cenital / Esquina' },
  ]);

  const [category, setCategory] = useState<string>('Detectar automáticamente');
  const [selectedRefObject, setSelectedRefObject] = useState<ReferenceObjectOption>(
    settings.referenceObjects[0] || {
      id: 'persona',
      name: 'Persona',
      type: 'persona',
      defaultDimensionM: 1.75,
      dimensionLabel: 'Altura media (m)',
      category: 'persona',
    }
  );
  const [customDimensionM, setCustomDimensionM] = useState<number>(1.75);
  const [manualMeasurement, setManualMeasurement] = useState<ManualMeasurement | undefined>(undefined);
  const [location, setLocation] = useState<string>('Planta La Campaneta');
  const [zoneId, setZoneId] = useState<string>('');
  const [wallHeightM, setWallHeightM] = useState<number>(2.5);
  const [operatorUser, setOperatorUser] = useState<string>(currentUser ? currentUser.name : (settings.operatorName || 'Operario Planta'));
  const [pileName, setPileName] = useState<string>('');
  const [cameraDistanceM, setCameraDistanceM] = useState<string>('');
  const [knownRealWeightTonnes, setKnownRealWeightTonnes] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [highPrecisionMode, setHighPrecisionMode] = useState<boolean>(settings.highPrecisionMode);

  // Estados de ejecución
  const [processingStageText, setProcessingStageText] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [completedRecord, setCompletedRecord] = useState<PileAnalysisRecord | null>(null);

  // Ejecución de llamada al backend
  const runAnalysis = async () => {
    setCurrentStep(3);
    setAnalysisError(null);
    setProcessingStageText('Enviando imágenes a modelo de visión artificial...');

    try {
      const activePhotos = photos
        .filter((p) => p.processed)
        .map((p) => p.processed!.fullDataUrl);

      if (activePhotos.length === 0) {
        throw new Error('No hay ninguna fotografía válida para analizar.');
      }

      setProcessingStageText('Visión artificial: detectando taludes y escala...');

      const response = await fetch('/api/analyze-pile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: activePhotos,
          category,
          referenceObject: {
            id: selectedRefObject.id,
            name: selectedRefObject.name,
            type: selectedRefObject.type,
            assumed_dimension_m: customDimensionM,
            dimension_label: selectedRefObject.dimensionLabel,
          },
          manualMeasurement,
          location,
          pileName: pileName.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Error en el servidor (${response.status})`);
      }

      const resData = await response.json();
      const aiData: GeminiAnalysisRaw = resData.data;

      if (!aiData || !aiData.pile_detected) {
        throw new Error(
          aiData?.observations ||
            'No se ha detectado con suficiente claridad un acopio de material en las fotografías. Asegúrate de encuadrar el montón desde el suelo sin recortes.'
        );
      }

      setProcessingStageText('Calculando volumen determinista y propagando incertidumbre...');

      // 1. CÁLCULO VOLUMEN DETERMINISTA EN TYPESCRIPT
      const calcVolume = calculateGeometricVolume({
        dimensions: aiData.dimensions,
        geometricShape: aiData.geometric_shape,
        shapeFactor: aiData.shape_factor,
        confidenceScore: aiData.confidence_score,
        hasReferenceObject: selectedRefObject.id !== 'sin_referencia',
        photoCount: activePhotos.length,
      });

      // 2. CÁLCULO PESO DETERMINISTA
      const primaryMat = aiData.material_classification.primary_material;
      const calFactor = settings.calibrationFactors[primaryMat] || 1.0;

      const calcWeight = calculateWeightFromVolume({
        volumeM3: calcVolume.nominal_m3,
        minVolumeM3: calcVolume.min_m3,
        maxVolumeM3: calcVolume.max_m3,
        materialName: primaryMat,
        densitySettings: settings.densities,
        calibrationFactor: calFactor,
        cleanlinessLevel: aiData.cleanliness.level,
        rejectionPercentage: aiData.cleanliness.rejection_percentage,
        reduceDensityOnRejection: settings.reduceDensityOnRejection,
      });

      // 3. VALIDACIÓN DE PESAJE REAL SI EL OPERARIO LO INDICÓ
      let weightErrorTonnes: number | undefined;
      let weightErrorPercent: number | undefined;
      const parsedKnownWeight = parseFloat(knownRealWeightTonnes);
      if (!isNaN(parsedKnownWeight) && parsedKnownWeight > 0) {
        weightErrorTonnes = Math.round((calcWeight.nominal_tonnes - parsedKnownWeight) * 100) / 100;
        weightErrorPercent =
          Math.round((Math.abs(weightErrorTonnes) / parsedKnownWeight) * 1000) / 10;
      }

      // 4. CREAR REGISTRO COMPLETO
      const recordId = `rcd-${Date.now()}`;
      const rawHazards = aiData.hazard_detection?.findings || [];
      const hazardFindings: HazardFinding[] = rawHazards.map((f: any, idx: number) => ({
        id: `hz-${Date.now()}-${idx}`,
        type: (f.type as any) || 'otros_peligrosos',
        typeLabel: f.type ? f.type.replace('_', ' ') : 'Posible peligroso',
        suspicion_level: f.suspicion_level || 'media',
        box: f.box,
        visual_reason: f.visual_reason || 'Detectado por IA',
        recommendation: f.recommendation || 'Inspeccionar presencialmente',
        status: 'pendiente',
      }));

      const hazardDetectionData: HazardDetection | undefined = aiData.hazard_detection
        ? {
            enabled: true,
            has_hazard: Boolean(aiData.hazard_detection.has_hazard || hazardFindings.length > 0),
            alert_count: hazardFindings.length,
            findings: hazardFindings,
          }
        : undefined;

      const record: PileAnalysisRecord = {
        id: recordId,
        pileName: pileName.trim() || `Acopio #${recordId.slice(-4)}`,
        location: location.trim() || 'Planta La Campaneta',
        zoneId: zoneId || undefined,
        operatorUser: operatorUser.trim() || currentUser.name,
        operatorUserId: currentUser.id,
        operatorRole: currentUser.role,
        createdAt: new Date().toISOString(),
        images: activePhotos,
        referenceObjectType: selectedRefObject.id,
        manualMeasurement,
        aiOutput: aiData,
        calculatedVolume: calcVolume,
        calculatedWeight: calcWeight,
        effectiveVolumeM3: calcVolume.nominal_m3,
        effectiveVolumeRange: [calcVolume.min_m3, calcVolume.max_m3],
        effectiveWeightTonnes: calcWeight.nominal_tonnes,
        effectiveWeightRange: [calcWeight.min_tonnes, calcWeight.max_tonnes],
        effectiveMaterial: primaryMat,
        effectiveGranulometry: aiData.granulometry.primary_granulometry,
        effectiveCleanliness: aiData.cleanliness,
        hazardDetection: hazardDetectionData,
        realScaleWeightTonnes: !isNaN(parsedKnownWeight) && parsedKnownWeight > 0 ? parsedKnownWeight : undefined,
        scaleVerified: !isNaN(parsedKnownWeight) && parsedKnownWeight > 0,
        weightErrorTonnes,
        weightErrorPercent,
        notes: notes.trim() || undefined,
        isDemo: false,
      };

      setCompletedRecord(record);
      onSaveRecord(record);
      setCurrentStep(4);
    } catch (err: any) {
      console.error('Error in pile analysis:', err);
      setAnalysisError(err.message || 'Error procesando la imagen con la IA.');
    }
  };

  const handleReset = () => {
    setPhotos([
      { id: 'p1', angleLabel: 'Vista Frontal (Principal)' },
      { id: 'p2', angleLabel: 'Vista Lateral (90°)' },
      { id: 'p3', angleLabel: 'Vista Cenital / Esquina' },
    ]);
    setManualMeasurement(undefined);
    setPileName('');
    setKnownRealWeightTonnes('');
    setNotes('');
    setCompletedRecord(null);
    setCurrentStep(1);
  };

  return (
    <div>
      {/* Paso 1: Captura de fotos */}
      {currentStep === 1 && (
        <CaptureStep
          photos={photos}
          onPhotosChange={setPhotos}
          onNext={() => setCurrentStep(2)}
        />
      )}

      {/* Paso 2: Parámetros y Referencia de escala */}
      {currentStep === 2 && (
        <ContextStep
          photos={photos}
          category={category}
          onCategoryChange={setCategory}
          selectedRefObject={selectedRefObject}
          onSelectedRefObjectChange={setSelectedRefObject}
          customDimensionM={customDimensionM}
          onCustomDimensionMChange={setCustomDimensionM}
          wallHeightM={wallHeightM}
          onWallHeightMChange={setWallHeightM}
          manualMeasurement={manualMeasurement}
          onManualMeasurementChange={setManualMeasurement}
          location={location}
          onLocationChange={setLocation}
          zoneId={zoneId}
          onZoneIdChange={setZoneId}
          pileName={pileName}
          onPileNameChange={setPileName}
          operatorUser={operatorUser}
          onOperatorUserChange={setOperatorUser}
          cameraDistanceM={cameraDistanceM}
          onCameraDistanceMChange={setCameraDistanceM}
          knownRealWeightTonnes={knownRealWeightTonnes}
          onKnownRealWeightTonnesChange={setKnownRealWeightTonnes}
          notes={notes}
          onNotesChange={setNotes}
          highPrecisionMode={highPrecisionMode}
          onHighPrecisionModeChange={setHighPrecisionMode}
          settings={settings}
          onBack={() => setCurrentStep(1)}
          onStartAnalysis={runAnalysis}
        />
      )}

      {/* Paso 3: Pantalla de carga y progreso */}
      {currentStep === 3 && (
        <ProcessingStep
          currentStageText={processingStageText}
          error={analysisError}
          onRetry={runAnalysis}
          onCancel={() => setCurrentStep(2)}
        />
      )}

      {/* Paso 4: Resultados, desglose y ajuste del operario */}
      {currentStep === 4 && completedRecord && (
        <ResultsView
          record={completedRecord}
          settings={settings}
          onSaveToHistory={onSaveRecord}
          onGenerateBudget={onGenerateBudget}
          onOpenPrintModal={onOpenPrintModal}
          onResetNewAnalysis={handleReset}
        />
      )}
    </div>
  );
};
