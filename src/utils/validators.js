/**
 * Validation utilities for the CT226 system
 */

export const validatePhoneNumber = (phone) => {
  if (!phone) return { isValid: false, error: "Phone number is required" };

  const phoneStr = phone.toString().trim();

  // Remove all non-numeric characters
  const numericPhone = phoneStr.replace(/\D/g, "");

  // Check if it's empty after removing non-digits
  if (numericPhone.length === 0) {
    return { isValid: false, error: "Phone number must contain digits" };
  }

  // Check length - should be 9 digits (without 254 prefix) or 12 digits (with 254)
  if (numericPhone.length === 9) {
    // Format: 0XXXXXXXXX
    if (!/^0/.test(numericPhone)) {
      return { isValid: false, error: "Phone number should start with 0" };
    }
    return { isValid: true, formatted: numericPhone };
  } else if (numericPhone.length === 12) {
    // Format: 254XXXXXXXXX
    if (!/^254/.test(numericPhone)) {
      return {
        isValid: false,
        error: "International format should start with 254",
      };
    }
    // Convert to local format
    const localFormat = "0" + numericPhone.substring(3);
    return { isValid: true, formatted: localFormat };
  } else {
    return {
      isValid: false,
      error:
        "Phone number should be 9 digits (0XXXXXXXXX) or 12 digits (254XXXXXXXXX)",
    };
  }
};

export const validatePassword = (password) => {
  if (!password) return { isValid: false, error: "Password is required" };

  const passwordStr = password.toString();

  if (passwordStr.length < 6) {
    return { isValid: false, error: "Password must be at least 6 characters" };
  }

  // Optional: Add more complex validation if needed
  // if (!/[A-Z]/.test(passwordStr)) {
  //   return { isValid: false, error: "Password must contain at least one uppercase letter" };
  // }
  // if (!/\d/.test(passwordStr)) {
  //   return { isValid: false, error: "Password must contain at least one number" };
  // }

  return { isValid: true };
};

export const validateEmail = (email) => {
  if (!email) return { isValid: false, error: "Email is required" };

  const emailStr = email.toString().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(emailStr)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  return { isValid: true };
};

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === "string" && value.trim() === "")) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
};

export const validateNumber = (value, fieldName, options = {}) => {
  const { min, max, required = true } = options;

  if (required) {
    const requiredCheck = validateRequired(value, fieldName);
    if (!requiredCheck.isValid) return requiredCheck;
  } else if (!value && value !== 0) {
    return { isValid: true }; // Not required and empty
  }

  const num = Number(value);
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }

  if (min !== undefined && num < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && num > max) {
    return { isValid: false, error: `${fieldName} must be at most ${max}` };
  }

  return { isValid: true };
};

export const validateDate = (dateString, fieldName) => {
  if (!dateString) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { isValid: false, error: `${fieldName} must be a valid date` };
  }

  // Check if date is not in the future (for order dates)
  if (date > new Date()) {
    return { isValid: false, error: `${fieldName} cannot be in the future` };
  }

  return { isValid: true };
};

export const validateOrderData = (order) => {
  const errors = [];

  // Required fields
  const requiredFields = [
    { name: "customerCode", label: "Customer Code" },
    { name: "customerName", label: "Customer Name" },
    { name: "totalValue", label: "Total Value" },
  ];

  requiredFields.forEach((field) => {
    const check = validateRequired(order[field.name], field.label);
    if (!check.isValid) errors.push(check.error);
  });

  // Validate total value is a positive number
  if (order.totalValue) {
    const numCheck = validateNumber(order.totalValue, "Total Value", {
      min: 0,
    });
    if (!numCheck.isValid) errors.push(numCheck.error);
  }

  // Validate order date if provided
  if (order.orderDate) {
    const dateCheck = validateDate(order.orderDate, "Order Date");
    if (!dateCheck.isValid) errors.push(dateCheck.error);
  }

  return {
    isValid: errors.length === 0,
    errors,
    hasErrors: errors.length > 0,
  };
};

export const validateBranchName = (branchName) => {
  const check = validateRequired(branchName, "Branch Name");
  if (!check.isValid) return check;

  // Branch name should not contain special characters
  const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
  if (specialCharRegex.test(branchName)) {
    return {
      isValid: false,
      error: "Branch name cannot contain special characters",
    };
  }

  return { isValid: true };
};

export const validateCustomerData = (customer) => {
  const errors = [];

  // Required fields
  if (!customer.name || customer.name.trim() === "") {
    errors.push("Customer name is required");
  }

  if (!customer.code || customer.code.trim() === "") {
    errors.push("Customer code is required");
  }

  // Validate phone if provided
  if (customer.phone) {
    const phoneCheck = validatePhoneNumber(customer.phone);
    if (!phoneCheck.isValid) errors.push(phoneCheck.error);
  }

  // Validate email if provided
  if (customer.email) {
    const emailCheck = validateEmail(customer.email);
    if (!emailCheck.isValid) errors.push(emailCheck.error);
  }

  return {
    isValid: errors.length === 0,
    errors,
    hasErrors: errors.length > 0,
  };
};

export const validateSearchQuery = (query) => {
  if (!query || query.trim() === "") {
    return { isValid: false, error: "Search query cannot be empty" };
  }

  if (query.length < 2) {
    return {
      isValid: false,
      error: "Search query must be at least 2 characters",
    };
  }

  return { isValid: true };
};

export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;

  // Remove potential XSS attack vectors
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
};

export const validateToken = (token) => {
  if (!token) return { isValid: false, error: "Token is required" };

  const tokenStr = token.toString().trim();

  // Basic JWT validation (starts with eyJ and has three parts)
  const parts = tokenStr.split(".");
  if (parts.length !== 3) {
    return { isValid: false, error: "Invalid token format" };
  }

  if (!tokenStr.startsWith("eyJ")) {
    return { isValid: false, error: "Invalid token format" };
  }

  return { isValid: true };
};

// Form validation helper
export const validateForm = (formData, rules) => {
  const errors = {};

  Object.keys(rules).forEach((fieldName) => {
    const fieldRules = rules[fieldName];
    const value = formData[fieldName];

    // Check required
    if (fieldRules.required && !value) {
      errors[fieldName] = fieldRules.message || `${fieldName} is required`;
      return;
    }

    // Check pattern if provided
    if (fieldRules.pattern && value) {
      const regex = new RegExp(fieldRules.pattern);
      if (!regex.test(value)) {
        errors[fieldName] =
          fieldRules.patternMessage || `Invalid ${fieldName} format`;
      }
    }

    // Check min length
    if (fieldRules.minLength && value && value.length < fieldRules.minLength) {
      errors[fieldName] = `Must be at least ${fieldRules.minLength} characters`;
    }

    // Check max length
    if (fieldRules.maxLength && value && value.length > fieldRules.maxLength) {
      errors[fieldName] = `Cannot exceed ${fieldRules.maxLength} characters`;
    }

    // Custom validation function
    if (fieldRules.validate && value) {
      const customError = fieldRules.validate(value, formData);
      if (customError) {
        errors[fieldName] = customError;
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
