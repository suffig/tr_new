// React-compatible error handling utilities
import { toast } from 'react-hot-toast';

export class ErrorHandler {
  static showUserError(message, type = 'error', duration = 5000) {
    if (type === 'success') {
      toast.success(message, { duration });
    } else if (type === 'warning' || type === 'info') {
      // Use info style for warnings since react-hot-toast doesn't have warning
      toast(message, { 
        duration,
        icon: '⚠️',
        style: {
          background: '#FEF3C7',
          color: '#92400E',
          border: '1px solid #FBBF24',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
        }
      });
    } else {
      toast.error(message, { duration });
    }
  }

  static handleDatabaseError(error, operation = 'Operation') {
    console.error(`${operation} error:`, error);
    
    let userMessage = 'Ein unerwarteter Fehler ist aufgetreten.';
    let errorType = 'error';
    
    if (error?.message) {
      const message = error.message.toLowerCase();
      
      if (message.includes('failed to fetch') || message.includes('network')) {
        userMessage = 'Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung.';
        errorType = 'warning';
      } else if (message.includes('jwt expired') || message.includes('token')) {
        userMessage = 'Sitzung abgelaufen. Bitte melden Sie sich erneut an.';
      } else if (error?.status === 401) {
        userMessage = 'Nicht autorisiert. Bitte melden Sie sich an.';
      } else if (error?.status === 403) {
        userMessage = 'Keine Berechtigung für diese Aktion.';
      } else if (message.includes('duplicate key') || message.includes('unique constraint')) {
        userMessage = 'Eintrag existiert bereits.';
        errorType = 'warning';
      } else if (message.includes('not found') || error?.status === 404) {
        userMessage = 'Die angeforderten Daten wurden nicht gefunden.';
        errorType = 'warning';
      } else if (message.includes('timeout')) {
        userMessage = 'Anfrage-Timeout. Bitte versuchen Sie es erneut.';
        errorType = 'warning';
      } else if (message.includes('server') || error?.status >= 500) {
        userMessage = 'Server temporär nicht verfügbar. Bitte versuchen Sie es später erneut.';
        errorType = 'warning';
      } else if (message.includes('validation') || message.includes('validierung')) {
        userMessage = error.message; // Use the actual validation message
        errorType = 'warning';
      }
    }

    this.showUserError(userMessage, errorType);
  }

  static handleAuthError(error, operation = 'Authentication') {
    console.error(`${operation} error:`, error);
    
    if (error?.message?.includes('Invalid login credentials')) {
      this.showUserError('Ungültige Anmeldedaten.');
    } else if (error?.message?.includes('Email not confirmed')) {
      this.showUserError('Bitte bestätige zuerst deine E-Mail-Adresse.');
    } else if (error?.message?.includes('Password should be at least')) {
      this.showUserError('Passwort muss mindestens 6 Zeichen haben.');
    } else {
      this.showUserError(
        error?.message || `Fehler bei ${operation}. Bitte versuche es erneut.`
      );
    }
  }
}

// Form validation utilities
export const FormValidator = {
  validateRequired(value, fieldName) {
    if (!value || value.toString().trim() === '') {
      throw new Error(`${fieldName} ist erforderlich`);
    }
    return true;
  },

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Ungültige E-Mail-Adresse');
    }
    return true;
  },

  validateNumber(value, fieldName, min = null, max = null) {
    const num = parseFloat(value);
    if (isNaN(num)) {
      throw new Error(`${fieldName} muss eine Zahl sein`);
    }
    if (min !== null && num < min) {
      throw new Error(`${fieldName} muss mindestens ${min} sein`);
    }
    if (max !== null && num > max) {
      throw new Error(`${fieldName} darf höchstens ${max} sein`);
    }
    return true;
  },

  sanitizeInput(input) {
    return input.toString().trim();
  }
};

// Constants
export const POSITIONS = ["TH", "LV", "RV", "IV", "ZDM", "ZM", "ZOM", "LM", "RM", "LF", "RF", "ST"];
export const TEAMS = ["AEK", "Real", "Ehemalige"];

// Loading manager for React
export class LoadingManager {
  constructor() {
    this.loadingStates = new Set();
    this.listeners = new Set();
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  setLoading(key, isLoading) {
    if (isLoading) {
      this.loadingStates.add(key);
    } else {
      this.loadingStates.delete(key);
    }
    
    this.listeners.forEach(callback => {
      callback(this.loadingStates);
    });
  }

  isLoading(key = null) {
    return key ? this.loadingStates.has(key) : this.loadingStates.size > 0;
  }

  getLoadingStates() {
    return new Set(this.loadingStates);
  }
}

export const loadingManager = new LoadingManager();