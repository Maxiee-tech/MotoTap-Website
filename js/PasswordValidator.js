// Password strength validator
class PasswordValidator {
  static validate(password) {
    const errors = [];

    if (!password) {
      errors.push("Password is required.");
      return { isValid: false, errors, strength: 0 };
    }

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters.");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain an uppercase letter.");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain a lowercase letter.");
    }

    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain a number.");
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("Password must contain a special character.");
    }

    const strength =
      5 -
      (errors.length === 0
        ? 0
        : Math.max(0, Math.ceil(errors.length / 1.5)));

    return {
      isValid: errors.length === 0,
      errors,
      strength: Math.max(0, Math.min(5, strength)),
    };
  }

  static getStrengthLabel(strength) {
    switch (strength) {
      case 0:
        return "Very Weak";
      case 1:
        return "Weak";
      case 2:
        return "Fair";
      case 3:
        return "Good";
      case 4:
        return "Strong";
      case 5:
        return "Very Strong";
      default:
        return "Unknown";
    }
  }
}

export default PasswordValidator;
