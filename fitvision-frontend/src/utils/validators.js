// src/utils/validators.js
// Form validation helpers

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export function isValidEmail(email) {
  if (!email || typeof email !== "string") {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @param {number} options.minLength - Minimum length (default: 6)
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validatePassword(password, options = {}) {
  const { minLength = 6 } = options;
  const errors = [];
  
  if (!password || typeof password !== "string") {
    return { valid: false, errors: ["Mật khẩu không được để trống"] };
  }
  
  if (password.length < minLength) {
    errors.push(`Mật khẩu phải có ít nhất ${minLength} ký tự`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate required field
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {Object} { valid: boolean, error: string|null }
 */
export function validateRequired(value, fieldName = "Trường này") {
  if (value === null || value === undefined || value === "") {
    return {
      valid: false,
      error: `${fieldName} không được để trống`,
    };
  }
  
  if (typeof value === "string" && value.trim() === "") {
    return {
      valid: false,
      error: `${fieldName} không được để trống`,
    };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate number range
 * @param {number} value - Number to validate
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum value
 * @param {number} options.max - Maximum value
 * @returns {Object} { valid: boolean, error: string|null }
 */
export function validateNumberRange(value, options = {}) {
  const { min, max } = options;
  
  if (typeof value !== "number" || isNaN(value)) {
    return {
      valid: false,
      error: "Giá trị phải là số",
    };
  }
  
  if (min !== undefined && value < min) {
    return {
      valid: false,
      error: `Giá trị phải lớn hơn hoặc bằng ${min}`,
    };
  }
  
  if (max !== undefined && value > max) {
    return {
      valid: false,
      error: `Giá trị phải nhỏ hơn hoặc bằng ${max}`,
    };
  }
  
  return { valid: true, error: null };
}

