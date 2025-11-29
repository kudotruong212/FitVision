// src/utils/imageUtils.js
// Image validation and processing utilities

/**
 * Get score level information
 * @param {number} score - Body scan score
 * @returns {Object} { label, colorClass }
 */
export function getScoreLevel(score) {
  if (score >= 80) {
    return {
      label: "Rất tốt",
      colorClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    };
  }
  if (score >= 50) {
    return {
      label: "Ổn nhưng còn yếu",
      colorClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    };
  }
  return {
    label: "Cần cải thiện nhiều",
    colorClass: "bg-red-500/20 text-red-300 border-red-500/40",
  };
}

/**
 * Validate image quality (size)
 * @param {File} file - Image file
 * @returns {Object} { ok: boolean, message: string }
 */
export function validateImageQuality(file) {
  const sizeKB = Math.round(file.size / 1024);
  if (sizeKB < 80) {
    return { ok: false, message: "Ảnh quá nhỏ (<80KB). Hãy chụp ảnh rõ hơn." };
  }
  if (sizeKB > 8 * 1024) {
    return { ok: false, message: "Ảnh quá lớn (>8MB). Hãy nén hoặc chụp lại." };
  }
  return { ok: true, message: `Kích thước ảnh: ${sizeKB}KB` };
}

/**
 * Get image dimensions
 * @param {File} file - Image file
 * @returns {Promise<Object|null>} { width, height } or null if error
 */
export function getImageDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

