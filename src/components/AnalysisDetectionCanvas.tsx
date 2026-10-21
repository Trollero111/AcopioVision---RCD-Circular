/**
 * Canvas interactivo para visualización de detecciones de visión artificial y calibración manual
 * RCD Circular - Monzón (Aragón)
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GeminiAnalysisRaw, ManualMeasurement } from '../types';
import { Eye, EyeOff, Ruler, RotateCcw } from 'lucide-react';

interface AnalysisDetectionCanvasProps {
  imageUrl: string;
  analysisData?: GeminiAnalysisRaw;
  manualMeasurement?: ManualMeasurement;
  onManualMeasurementChange?: (measurement: ManualMeasurement | undefined) => void;
  isManualDrawingEnabled?: boolean;
  onToggleManualDrawing?: (enabled: boolean) => void;
  className?: string;
}

export const AnalysisDetectionCanvas: React.FC<AnalysisDetectionCanvasProps> = ({
  imageUrl,
  analysisData,
  manualMeasurement,
  onManualMeasurementChange,
  isManualDrawingEnabled = false,
  onToggleManualDrawing,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  // Cargar imagen
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      setImgElement(img);
    };
  }, [imageUrl]);

  // Dibujar en canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElement) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajustar dimensiones internas del canvas a la imagen
    canvas.width = imgElement.naturalWidth || 800;
    canvas.height = imgElement.naturalHeight || 600;

    // 1. Dibujar imagen de fondo
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

    if (!showOverlays) return;

    const w = canvas.width;
    const h = canvas.height;

    // 2. Dibujar contorno / polígono del acopio si está disponible
    if (analysisData?.polygon && analysisData.polygon.length > 2) {
      ctx.save();
      ctx.beginPath();
      const first = analysisData.polygon[0];
      ctx.moveTo(first.x * w, first.y * h);
      for (let i = 1; i < analysisData.polygon.length; i++) {
        const pt = analysisData.polygon[i];
        ctx.lineTo(pt.x * w, pt.y * h);
      }
      ctx.closePath();

      // Relleno semi-transparente verde industrial
      ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
      ctx.fill();

      // Borde punteado de alta visibilidad
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = Math.max(3, Math.round(w / 300));
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Dibujar bounding box del acopio si existe
    if (analysisData?.bounding_box && analysisData.bounding_box.length === 4) {
      const [ymin, xmin, ymax, xmax] = analysisData.bounding_box;
      const bx = xmin * w;
      const by = ymin * h;
      const bw = (xmax - xmin) * w;
      const bh = (ymax - ymin) * h;

      ctx.save();
      ctx.strokeStyle = 'rgba(163, 230, 53, 0.9)'; // lima
      ctx.lineWidth = Math.max(2, Math.round(w / 400));
      ctx.setLineDash([]);
      ctx.strokeRect(bx, by, bw, bh);

      // Etiqueta dimensiones
      const dims = analysisData.dimensions;
      if (dims) {
        const text = `Acopio: ${dims.width_m.toFixed(1)}m ancho × ${dims.height_m.toFixed(1)}m alto`;
        ctx.font = `bold ${Math.max(14, Math.round(w / 45))}px 'Plus Jakarta Sans', sans-serif`;
        const textMetrics = ctx.measureText(text);
        const pad = 6;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(bx, Math.max(0, by - 30), textMetrics.width + pad * 2, 28);
        ctx.fillStyle = '#a3e635';
        ctx.fillText(text, bx + pad, Math.max(20, by - 10));
      }

      // Línea de altura vertical desde base a cúspide
      const centerX = bx + bw / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, by + bh);
      ctx.lineTo(centerX, by);
      ctx.strokeStyle = '#38bdf8'; // cian
      ctx.lineWidth = Math.max(2, Math.round(w / 500));
      ctx.setLineDash([4, 4]);
      ctx.stroke();

      ctx.restore();
    }

    // 4. Dibujar objeto de referencia si está detectado
    if (analysisData?.reference_object?.detected && analysisData.reference_object.box) {
      const [rymin, rxmin, rymax, rxmax] = analysisData.reference_object.box;
      const rx = rxmin * w;
      const ry = rymin * h;
      const rw = (rxmax - rxmin) * w;
      const rh = (rymax - rymin) * h;

      ctx.save();
      ctx.strokeStyle = '#f59e0b'; // ámbar
      ctx.lineWidth = Math.max(3, Math.round(w / 350));
      ctx.setLineDash([]);
      ctx.strokeRect(rx, ry, rw, rh);

      // Etiqueta referencia
      const refLabel = `Ref: ${analysisData.reference_object.type} (${analysisData.reference_object.assumed_dimension_m} m)`;
      ctx.font = `bold ${Math.max(12, Math.round(w / 55))}px 'Plus Jakarta Sans', sans-serif`;
      const refMetrics = ctx.measureText(refLabel);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.fillRect(rx, Math.max(0, ry - 24), refMetrics.width + 10, 22);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(refLabel, rx + 5, Math.max(16, ry - 7));
      ctx.restore();
    }

    // 5. Dibujar medición manual existente o en progreso
    const lineToDraw = isDrawing && startPos && currentPos
      ? { start: startPos, end: currentPos, meters: manualMeasurement?.realMeters || 1.0 }
      : manualMeasurement
      ? { start: manualMeasurement.startPoint, end: manualMeasurement.endPoint, meters: manualMeasurement.realMeters }
      : null;

    if (lineToDraw) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(lineToDraw.start.x * w, lineToDraw.start.y * h);
      ctx.lineTo(lineToDraw.end.x * w, lineToDraw.end.y * h);
      ctx.strokeStyle = '#ec4899'; // rosa fuerte
      ctx.lineWidth = Math.max(3, Math.round(w / 300));
      ctx.setLineDash([]);
      ctx.stroke();

      // Círculos en extremos
      const r = Math.max(5, Math.round(w / 160));
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(lineToDraw.start.x * w, lineToDraw.start.y * h, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lineToDraw.end.x * w, lineToDraw.end.y * h, r, 0, Math.PI * 2);
      ctx.fill();

      // Etiqueta de longitud
      const midX = ((lineToDraw.start.x + lineToDraw.end.x) / 2) * w;
      const midY = ((lineToDraw.start.y + lineToDraw.end.y) / 2) * h;
      const label = `Medida manual: ${lineToDraw.meters.toFixed(2)} m`;
      ctx.font = `bold ${Math.max(13, Math.round(w / 50))}px 'Plus Jakarta Sans', sans-serif`;
      const m = ctx.measureText(label);
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(midX - m.width / 2 - 6, midY - 26, m.width + 12, 22);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, midX - m.width / 2, midY - 10);
      ctx.restore();
    }
  }, [imgElement, showOverlays, analysisData, manualMeasurement, isDrawing, startPos, currentPos]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Manejadores de interacción para calibración manual
  const getNormalizedCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isManualDrawingEnabled) return;
    const coords = getNormalizedCoords(e);
    if (!coords) return;
    setIsDrawing(true);
    setStartPos(coords);
    setCurrentPos(coords);
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    const coords = getNormalizedCoords(e);
    if (!coords) return;
    setCurrentPos(coords);
  };

  const handlePointerUp = () => {
    if (!isDrawing || !startPos || !currentPos || !canvasRef.current) {
      setIsDrawing(false);
      return;
    }

    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    const dx = (currentPos.x - startPos.x) * w;
    const dy = (currentPos.y - startPos.y) * h;
    const pixelLength = Math.sqrt(dx * dx + dy * dy);

    if (pixelLength > 15) {
      const realMeters = manualMeasurement?.realMeters || 1.0;
      onManualMeasurementChange?.({
        pixelLength,
        realMeters,
        startPoint: startPos,
        endPoint: currentPos,
      });
    }

    setIsDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
  };

  return (
    <div ref={containerRef} className={`relative flex flex-col items-center bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl ${className}`}>
      {/* Barra de controles sobre la imagen */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => setShowOverlays(!showOverlays)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md transition-all shadow-md ${
              showOverlays
                ? 'bg-emerald-500/90 text-slate-950 hover:bg-emerald-400'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
            }`}
          >
            {showOverlays ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showOverlays ? 'Detección Visible' : 'Ocultar Detección'}
          </button>

          {onToggleManualDrawing && (
            <button
              type="button"
              onClick={() => onToggleManualDrawing(!isManualDrawingEnabled)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md transition-all shadow-md ${
                isManualDrawingEnabled
                  ? 'bg-pink-600 text-white hover:bg-pink-500 ring-2 ring-pink-400'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              {isManualDrawingEnabled ? 'Trazando Escala...' : 'Medir Escala'}
            </button>
          )}
        </div>

        {manualMeasurement && onManualMeasurementChange && (
          <button
            type="button"
            onClick={() => onManualMeasurementChange(undefined)}
            className="pointer-events-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/80 hover:bg-red-500 text-white backdrop-blur-md transition-all shadow"
            title="Borrar calibración trazada"
          >
            <RotateCcw className="w-3 h-3" />
            Borrar Línea
          </button>
        )}
      </div>

      {/* Indicador de ayuda al trazar */}
      {isManualDrawingEnabled && (
        <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none">
          <div className="bg-pink-950/90 border border-pink-500/50 text-pink-200 text-xs px-3 py-2 rounded-xl text-center backdrop-blur-md shadow-lg">
            Arrastra el dedo o ratón sobre un elemento de tamaño conocido en la foto (ej: rueda, valla o jalón).
          </div>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        className={`w-full max-h-[520px] object-contain select-none transition-all ${
          isManualDrawingEnabled ? 'cursor-crosshair touch-none' : 'cursor-default'
        }`}
      />
    </div>
  );
};
