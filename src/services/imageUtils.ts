/**
 * Utilidades de manipulación, reducción y compresión de imágenes en el cliente
 */

export interface ProcessedImage {
  fullDataUrl: string; // Reducida a máx 1600px para enviar al backend
  thumbnailUrl: string; // Reducida a máx 400px para guardar en historial
  width: number;
  height: number;
  sizeBytes: number;
  originalName: string;
}

/**
 * Procesa y comprime una imagen desde un File u objeto Blob
 * Ajusta la dimensión mayor a un máximo de 1600px manteniendo la relación de aspecto
 */
export async function processAndCompressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.84
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const { width, height } = calculateAspectFit(img.width, img.height, maxDimension);
          
          // Canvas para versión completa optimizada
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('No se pudo inicializar el contexto 2D del navegador.');
          }

          // Dibujar con suavizado
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const fullDataUrl = canvas.toDataURL('image/jpeg', quality);

          // Canvas para miniatura rápida (máx 400px)
          const thumbDim = calculateAspectFit(img.width, img.height, 400);
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = thumbDim.width;
          thumbCanvas.height = thumbDim.height;
          const thumbCtx = thumbCanvas.getContext('2d');
          if (thumbCtx) {
            thumbCtx.imageSmoothingEnabled = true;
            thumbCtx.imageSmoothingQuality = 'medium';
            thumbCtx.drawImage(img, 0, 0, thumbDim.width, thumbDim.height);
          }
          const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.70);

          // Estimación del tamaño en bytes
          const head = 'data:image/jpeg;base64,';
          const sizeBytes = Math.round(((fullDataUrl.length - head.length) * 3) / 4);

          resolve({
            fullDataUrl,
            thumbnailUrl,
            width,
            height,
            sizeBytes,
            originalName: file.name,
          });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('El archivo seleccionado no es una imagen válida o está dañado.'));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo en el dispositivo.'));
    };

    reader.readAsDataURL(file);
  });
}

function calculateAspectFit(
  srcWidth: number,
  srcHeight: number,
  maxDimension: number
): { width: number; height: number } {
  if (srcWidth <= maxDimension && srcHeight <= maxDimension) {
    return { width: srcWidth, height: srcHeight };
  }

  const ratio = Math.min(maxDimension / srcWidth, maxDimension / srcHeight);
  return {
    width: Math.round(srcWidth * ratio),
    height: Math.round(srcHeight * ratio),
  };
}

/**
 * Formatea un tamaño en bytes a KB/MB legible
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
