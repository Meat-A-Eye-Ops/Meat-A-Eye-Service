// Image Preprocessing Utility for AI Analysis

export interface PreprocessedImage {
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB (전체 사진 확인을 위해 크기 제한 완화)
const MIN_SIZE_PX = 260; // EfficientNet-B2 최소 해상도

/**
 * Preprocesses an image before sending to AI server
 * - 전체 사진 확인을 위해 리사이즈 최소화 (최대 3840px까지 허용)
 * - 최소 해상도 260px 유지 (EfficientNet-B2 규격)
 * - 압축 최소화 (품질 0.95 유지, 크롭하지 않음)
 * - Converts to base64 data URL
 */
export async function preprocessImage(
  file: File,
  maxSize: number = 3840, // 전체 사진 확인을 위해 크기 제한 완화
  quality: number = 0.95, // 높은 품질 유지
  maxBytes: number = MAX_SIZE_BYTES,
): Promise<PreprocessedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    const tryCompress = (q: number) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // 최소 해상도 260px 강제 유지
        const aspectRatio = width / height;
        if (width < MIN_SIZE_PX || height < MIN_SIZE_PX) {
          if (width > height) {
            width = Math.max(MIN_SIZE_PX, width);
            height = Math.max(MIN_SIZE_PX, width / aspectRatio);
          } else {
            height = Math.max(MIN_SIZE_PX, height);
            width = Math.max(MIN_SIZE_PX, height * aspectRatio);
          }
        }

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        // 최종 해상도가 최소값보다 작으면 강제로 최소값으로 설정
        width = Math.max(MIN_SIZE_PX, width);
        height = Math.max(MIN_SIZE_PX, height);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob"));
              return;
            }
            if (blob.size > maxBytes && q > 0.7) {
              tryCompress(Math.max(0.7, q - 0.1));
              return;
            }
            const r = new FileReader();
            r.onloadend = () => {
              resolve({
                dataUrl: r.result as string,
                width,
                height,
                originalSize: file.size,
                compressedSize: blob.size,
              });
            };
            r.onerror = reject;
            r.readAsDataURL(blob);
          },
          "image/jpeg",
          q,
        );
      };
      img.onerror = reject;
      img.src = (reader.result as string) || "";
    };

    reader.onload = () => tryCompress(quality);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Captures image from video stream (webcam)
 * 전체 사진 확인을 위해 리사이즈 최소화
 */
export function captureFromVideo(
  videoElement: HTMLVideoElement,
  maxSize: number = 3840, // 전체 사진 확인을 위해 크기 제한 완화
): string {
  const canvas = document.createElement("canvas");

  let width = videoElement.videoWidth;
  let height = videoElement.videoHeight;

  // 최소 해상도 260px 강제
  const aspectRatio = width / height;
  if (width < MIN_SIZE_PX || height < MIN_SIZE_PX) {
    if (width > height) {
      width = Math.max(MIN_SIZE_PX, width);
      height = Math.max(MIN_SIZE_PX, width / aspectRatio);
    } else {
      height = Math.max(MIN_SIZE_PX, height);
      width = Math.max(MIN_SIZE_PX, height * aspectRatio);
    }
  }

  // Resize if needed
  if (width > maxSize || height > maxSize) {
    if (width > height) {
      height = (height / width) * maxSize;
      width = maxSize;
    } else {
      width = (width / height) * maxSize;
      height = maxSize;
    }
  }

  // 최종 해상도가 최소값보다 작으면 강제로 최소값으로 설정
  width = Math.max(MIN_SIZE_PX, width);
  height = Math.max(MIN_SIZE_PX, height);

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  ctx.drawImage(videoElement, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.95); // 높은 품질 유지
}

/**
 * Validates image file
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  if (!file.type.startsWith("image/")) {
    return { valid: false, error: "이미지 파일만 업로드 가능합니다." };
  }

  // Check file size (max 10MB)
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxFileSize) {
    return { valid: false, error: "파일 크기는 10MB 이하여야 합니다." };
  }

  return { valid: true };
}

/**
 * Creates a preview URL for an image file
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
