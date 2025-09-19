import { useState, useEffect } from 'react';
import { supabase, switchToFallbackMode } from '../utils/supabase';
import { ErrorHandler, FormValidator } from '../utils/errorHandling';
import logoFusta from '/assets/logo-fusta.png';

export default function Login() {
  // Always login mode, no registration - removed unused isLogin state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Listen for fallback mode activation
  useEffect(() => {
    const handleFallbackActivation = (event) => {
      console.log('🔄 Fallback mode activated:', event.detail);
      setIsDemoMode(true);
      // Show helpful message
      setErrors({ 
        form: '🌐 Demo-Modus aktiviert - Verwenden Sie beliebige Anmeldedaten für die Vorschau!' 
      });
    };

    window.addEventListener('fifa-fallback-activated', handleFallbackActivation);
    
    // Check if already in fallback mode
    const checkFallbackStatus = () => {
      try {
        if (window.location.hostname === 'localhost' || 
            document.querySelector('script[src*="supabase"]') === null) {
          setIsDemoMode(true);
        }
      } catch (error) {
        console.warn('Error checking fallback status:', error);
      }
    };
    
    checkFallbackStatus();
    
    return () => {
      window.removeEventListener('fifa-fallback-activated', handleFallbackActivation);
    };
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Get fresh values from form elements to avoid state issues
    const formData = new FormData(e.target);
    const formEmail = formData.get('email') || email;
    const formPassword = formData.get('password') || password;

    console.log('🔑 Attempting login with:', formEmail, 'isDemoMode:', isDemoMode);

    try {
      // Client-side validation
      const newErrors = {};
      if (!formEmail.trim()) {
        newErrors.email = 'E-Mail ist erforderlich';
      } else {
        try {
          FormValidator.validateEmail(formEmail);
        } catch (err) {
          newErrors.email = 'Ungültige E-Mail-Adresse';
        }
      }
      
      if (!formPassword.trim()) {
        newErrors.password = 'Passwort ist erforderlich';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      // Force switch to fallback mode when in demo mode or CDN is blocked
      if (isDemoMode || !window.supabase || document.querySelector('script[src*="supabase"]') === null) {
        console.warn('🔄 Force switching to fallback mode for demo');
        await switchToFallbackMode();
        setIsDemoMode(true);
      }

      // Use current supabase client for auth
      let result;
      try {
        result = await supabase.auth.signInWithPassword({
          email: FormValidator.sanitizeInput(formEmail),
          password: formPassword
        });
      } catch (authError) {
        console.error('Auth operation failed:', authError);
        
        // If auth fails, try switching to fallback mode
        if (authError.message?.includes('Failed to fetch') || 
            authError.name === 'AuthRetryableFetchError' ||
            authError.message?.includes('NetworkError')) {
          console.warn('🔄 Auth failed, switching to fallback mode');
          await switchToFallbackMode();
          setIsDemoMode(true);
          
          // Retry with fallback
          result = await supabase.auth.signInWithPassword({
            email: FormValidator.sanitizeInput(formEmail),
            password: formPassword
          });
        } else {
          throw authError;
        }
      }

      console.log('🔍 Auth result:', result);

      if (result.error) {
        if (result.error.message?.includes('Invalid login credentials')) {
          setErrors({ form: 'Ungültige Anmeldedaten. Bitte überprüfen Sie E-Mail und Passwort.' });
        } else if (result.error.message?.includes('Email not confirmed')) {
          setErrors({ form: 'Bitte bestätigen Sie Ihre E-Mail-Adresse.' });
        } else if (result.error.message?.includes('User already registered')) {
          setErrors({ form: 'Diese E-Mail ist bereits registriert. Bitte melden Sie sich an.' });
        } else {
          setErrors({ form: result.error.message });
        }
      } else {
        // Success - component will unmount when user state changes
        console.log('✅ Login successful, should redirect to main app');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setErrors({ form: ErrorHandler.getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-system-green/20 via-bg-primary to-system-blue/20 flex items-center justify-center p-4 safe-area-all">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="floating-orb floating-orb-1 bg-system-green/10"></div>
        <div className="floating-orb floating-orb-2 bg-system-blue/10"></div>
        <div className="floating-orb floating-orb-3 bg-fifa-green/10"></div>
        <div className="floating-pattern floating-pattern-1">⚽</div>
        <div className="floating-pattern floating-pattern-2">🏆</div>
        <div className="floating-pattern floating-pattern-3">⭐</div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="card-ios p-8 login-card">
          {/* Header */}
          <div className="text-center mb-8 login-header">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-system-green to-system-blue rounded-ios-2xl flex items-center justify-center shadow-ios-lg login-logo-bounce">
                <img 
                  src={logoFusta} 
                  alt="FUSTA Logo" 
                  className="w-12 h-12 object-contain"
                  loading="eager"
                />
              </div>
            </div>
            <h1 className="text-title1 font-bold text-text-primary mb-2 login-title-bounce">FUSTA</h1>
            
            {/* Demo Mode Indicator */}
            {isDemoMode && (
              <div className="mt-4 p-3 bg-system-blue/10 border border-system-blue/30 rounded-ios-lg">
                <div className="flex items-center justify-center gap-2 text-system-blue">
                  <span className="text-lg">🌐</span>
                  <span className="text-footnote font-medium">Demo-Modus aktiv</span>
                </div>
                <p className="text-caption1 text-text-secondary mt-1">
                  Verwenden Sie beliebige Anmeldedaten um fortzufahren
                </p>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-6">
            {/* Email Field */}
            <div className="form-group slide-up-delay-1">
              <label htmlFor="email" className="block text-footnote font-medium text-text-secondary mb-2">
                E-Mail
              </label>
              <div className="input-container">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-4 bg-bg-tertiary border border-border-light rounded-ios-lg text-body text-text-primary placeholder-text-tertiary form-input-enhanced ${
                    errors.email ? 'border-system-red focus:border-system-red focus:ring-system-red/20' : ''
                  }`}
                  placeholder="deine@email.de"
                  autoComplete="email"
                  autoCapitalize="none"
                  required
                />
              </div>
              {errors.email && (
                <p className="text-caption1 text-system-red mt-2 error-message">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group slide-up-delay-2">
              <label htmlFor="password" className="block text-footnote font-medium text-text-secondary mb-2">
                Passwort
              </label>
              <div className="input-container">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-4 bg-bg-tertiary border border-border-light rounded-ios-lg text-body text-text-primary placeholder-text-tertiary form-input-enhanced ${
                    errors.password ? 'border-system-red focus:border-system-red focus:ring-system-red/20' : ''
                  }`}
                  placeholder="Dein Passwort"
                  autoComplete="current-password"
                  required
                />
              </div>
              {errors.password && (
                <p className="text-caption1 text-system-red mt-2 error-message">{errors.password}</p>
              )}
            </div>

            {/* Form Error */}
            {errors.form && (
              <div className={`p-4 rounded-ios bg-system-red/10 border border-system-red/20 slide-up-delay-3 ${
                errors.form.includes('erfolgreich') ? 'bg-system-green/10 border-system-green/20' : ''
              }`}>
                <p className={`text-footnote ${
                  errors.form.includes('erfolgreich') ? 'text-system-green' : 'text-system-red'
                }`}>
                  {errors.form}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary-ios text-body font-semibold py-4 slide-up-delay-3 btn-spring-press disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center gap-3">
                {loading && (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                )}
                <span>Anmelden</span>
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}