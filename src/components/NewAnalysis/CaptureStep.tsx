/**
 * Paso 1 del flujo de análisis: Captura y subida de 1 a 3 fotos del acopio
 * RCD Circular - Monzón (Aragón)
 */

import React, { useRef, useState } from 'react';
import { Camera, Upload, Trash2, HelpCircle, Check, AlertCircle, Sparkles } from 'lucide-react';
import { processAndCompressImage, ProcessedImage, formatBytes } from '../../services/imageUtils';
import { CaptureAdviceModal } from './CaptureAdviceModal';

export interface PhotoSlot {
  id: string;
  angleLabel: string;
  processed?: ProcessedImage;
}

interface CaptureStepProps {
  photos: PhotoSlot[];
  onPhotosChange: (photos: PhotoSlot[]) => void;
  onNext: () => void;
}

export const CaptureStep: React.FC<CaptureStepProps> = ({
  photos,
  onPhotosChange,
  onNext,
}) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const filledCount = photos.filter((p) => p.processed).length;

  const handleFiles = async (files: FileList | null, targetIndex?: number) => {
    if (!files || files.length === 0) return;
    setIsCompressing(true);

    try {
      const newPhotos = [...photos];
      let slotIdx = targetIndex !== undefined ? targetIndex : photos.findIndex((p) => !p.processed);
      if (slotIdx === -1) slotIdx = 0;

      for (let i = 0; i < files.length && slotIdx < newPhotos.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const processed = await processAndCompressImage(file, 1600, 0.84);
        newPhotos[slotIdx] = {
          ...newPhotos[slotIdx],
          processed,
        };
        slotIdx++;
      }

      onPhotosChange(newPhotos);
    } catch (err: any) {
      alert(err.message || 'Error procesando la fotografía.');
    } finally {
      setIsCompressing(false);
    }
  };

  const removePhoto = (index: number) => {
    const updated = [...photos];
    updated[index] = {
      ...updated[index],
      processed: undefined,
    };
    onPhotosChange(updated);
  };

  const openCamera = (index: number) => {
    setActiveSlotIndex(index);
    cameraInputRef.current?.click();
  };

  const openFilePicker = (index: number) => {
    setActiveSlotIndex(index);
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Botón de consejos fotográficos */}
      <div className="flex items-center justify-between bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Paso 1: Fotografías del Acopio</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
              {filledCount}/3 fotos
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            1 foto estima el volumen; con 2 o 3 fotos se triangula la profundidad y la confianza se dispara.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvice(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <span>Guía de toma</span>
        </button>
      </div>

      {/* Hidden inputs para cámara y galería */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files, activeSlotIndex)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files, activeSlotIndex)}
      />

      {/* Ranuras de fotos (1 a 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {photos.map((slot, index) => {
          const hasImage = Boolean(slot.processed);

          return (
            <div
              key={slot.id}
              className={`relative rounded-3xl border-2 transition-all p-3 flex flex-col justify-between min-h-[260px] ${
                hasImage
                  ? 'border-emerald-500/60 bg-slate-900/90 shadow-lg shadow-emerald-950/20'
                  : 'border-dashed border-slate-700 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-900/60'
              }`}
            >
              {/* Cabecera del slot */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 inline-flex items-center justify-center text-[10px] font-bold">
                    {index + 1}
                  </span>
                  {slot.angleLabel}
                </span>

                {hasImage && (
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/50 rounded-lg transition"
                    title="Eliminar foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Contenido / Miniatura */}
              {hasImage && slot.processed ? (
                <div className="relative flex-1 flex flex-col items-center justify-center rounded-2xl overflow-hidden bg-slate-950 mb-2 border border-slate-800">
                  <img
                    src={slot.processed.thumbnailUrl}
                    alt={slot.angleLabel}
                    className="w-full h-44 object-cover rounded-xl"
                  />
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-slate-300 flex justify-between">
                    <span>{slot.processed.width}×{slot.processed.height}px</span>
                    <span>{formatBytes(slot.processed.sizeBytes)}</span>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    handleFiles(e.dataTransfer.files, index);
                  }}
                  className={`flex-1 rounded-2xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition ${
                    isDragOver ? 'bg-emerald-500/10 border-emerald-500' : ''
                  }`}
                  onClick={() => openFilePicker(index)}
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-white mb-1">
                    {index === 0 ? 'Foto principal' : `Añadir ángulo ${index + 1}`}
                  </span>
                  <span className="text-xs text-slate-400">
                    Toca para cámara o arrastra una imagen
                  </span>
                </div>
              )}

              {/* Botones de acción inferiores */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => openCamera(index)}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700 shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cámara</span>
                </button>
                <button
                  type="button"
                  onClick={() => openFilePicker(index)}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5 text-sky-400" />
                  <span>Subir</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicador de fiabilidad por número de fotos */}
      <div className="p-4 rounded-2xl border transition-all">
        {filledCount === 0 && (
          <div className="flex items-center gap-3 text-slate-400 text-xs">
            <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Haz o sube al menos una fotografía del acopio para iniciar la estimación.</span>
          </div>
        )}

        {filledCount === 1 && (
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>1 foto lista:</strong> El modelo estimará la profundidad asumiendo simetría de talud (margen de error aprox. ±18% a ±25%). Si puedes, añade la vista lateral para un resultado más exacto.
            </div>
          </div>
        )}

        {filledCount >= 2 && (
          <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-emerald-300 text-xs">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>{filledCount} fotos combinadas:</strong> Alta precisión fotogramétrica. El modelo reconciliará anchura, fondo y altura desde ángulos complementarios (margen de error estimado ±8% a ±12%).
            </div>
          </div>
        )}
      </div>

      {/* Botón continuar */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={filledCount === 0 || isCompressing}
          onClick={onNext}
          className={`py-3.5 px-8 rounded-2xl font-bold text-sm flex items-center gap-2.5 transition-all shadow-lg ${
            filledCount > 0 && !isCompressing
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 active:scale-98'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          {isCompressing ? (
            <span>Comprimiendo imagen...</span>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Siguiente: Parámetros y Referencia</span>
            </>
          )}
        </button>
      </div>

      <CaptureAdviceModal isOpen={showAdvice} onClose={() => setShowAdvice(false)} />
    </div>
  );
};
