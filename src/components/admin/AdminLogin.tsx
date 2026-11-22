import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';

interface AdminLoginProps {
  onAuthenticated: (token: string) => void;
  onBackToStore: () => void;
}

type AuthMode = 'loading' | 'env' | 'claimed' | 'unclaimed' | 'error';

export function AdminLogin({ onAuthenticated, onBackToStore }: AdminLoginProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAuthStatus = async () => {
    setAuthMode('loading');
    setError(null);
    try {
      const res = await fetch('/api/admin/auth-status');
      const data = await res.json();
      if (!res.ok || !data?.mode) {
        setAuthMode('error');
        setError('Unable to check admin authentication status.');
        return;
      }
      setAuthMode(data.mode as AuthMode);
    } catch {
      setAuthMode('error');
      setError('Network error while connecting to authentication server.');
    }
  };

  useEffect(() => {
    loadAuthStatus();
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    if (!password) {
      setError('Please enter your admin password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.token) {
        setError(data?.error ?? 'Authentication failed. Please check your password.');
        return;
      }

      setPassword('');
      onAuthenticated(data.token as string);
    } catch {
      setError('Network error while signing in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFirstRunBootstrap = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.token) {
        setError(data?.error ?? 'Unable to save initial admin password.');
        await loadAuthStatus();
        return;
      }

      setPassword('');
      setConfirmPassword('');
      onAuthenticated(data.token as string);
    } catch {
      setError('Network error during admin setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8FD] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-[420px]">
        <button
          type="button"
          onClick={onBackToStore}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1A73E8] hover:text-[#0D5BD9] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to Apps Bazaar Storefront</span>
        </button>

        <div className="bg-white rounded-3xl border border-slate-200/85 shadow-[0_8px_30px_rgba(15,23,42,0.06)] p-6 sm:p-7">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-[#1A73E8] text-white flex items-center justify-center shadow-sm shrink-0">
              <Lock className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-[19px] font-bold text-[#1F1F1F] leading-tight">
                {authMode === 'unclaimed' ? 'First-Time Admin Setup' : 'Apps Bazaar Admin'}
              </h1>
              <p className="text-[12.5px] text-[#5F6368] mt-0.5">
                {authMode === 'unclaimed'
                  ? 'Set your private administrator password to lock this portal.'
                  : 'Protected order management & payment verification'}
              </p>
            </div>
          </div>

          {authMode === 'loading' && (
            <div className="py-10 flex flex-col items-center justify-center text-[#5F6368] gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#1A73E8]" />
              <span className="text-[13px]">Checking security configuration...</span>
            </div>
          )}

          {authMode === 'error' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-[13px] text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={loadAuthStatus}
                className="w-full min-h-[44px] rounded-full bg-[#1A73E8] text-white font-display font-semibold text-[14px] cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {(authMode === 'env' || authMode === 'claimed') && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-password-input"
                  className="block text-[12.5px] font-semibold text-[#3C4043] mb-1.5"
                >
                  Administrator Password
                </label>
                <div className="relative">
                  <input
                    id="admin-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter admin password"
                    autoComplete="current-password"
                    className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-slate-200 text-[14px] text-[#1F1F1F] focus:outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-[12.5px] text-red-700 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[44px] rounded-full bg-gradient-to-b from-[#1D74F5] to-[#0D5BD9] hover:from-[#1868E0] hover:to-[#0A4EC0] disabled:opacity-60 text-white font-display font-semibold text-[14px] shadow-[0_4px_14px_rgba(26,115,232,0.28)] inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sign In to Admin Panel</span>
                  </>
                )}
              </button>
            </form>
          )}

          {authMode === 'unclaimed' && (
            <form onSubmit={handleFirstRunBootstrap} className="space-y-4">
              <div className="rounded-xl bg-blue-50/75 border border-blue-200/80 p-3 text-[12px] leading-relaxed text-[#374151]">
                No <code className="font-mono text-[#1A73E8]">ADMIN_PASSCODE</code> secret is set
                yet. Claim your admin password below (this one-time setup locks immediately after
                saving).
              </div>

              <div>
                <label
                  htmlFor="setup-admin-password"
                  className="block text-[12.5px] font-semibold text-[#3C4043] mb-1"
                >
                  Create Admin Password (min 8 chars)
                </label>
                <div className="relative">
                  <input
                    id="setup-admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-slate-200 text-[14px] text-[#1F1F1F] focus:outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="setup-confirm-password"
                  className="block text-[12.5px] font-semibold text-[#3C4043] mb-1"
                >
                  Confirm Password
                </label>
                <input
                  id="setup-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Re-enter admin password"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[14px] text-[#1F1F1F] focus:outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/25"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-[12.5px] text-red-700 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[44px] rounded-full bg-gradient-to-b from-[#1D74F5] to-[#0D5BD9] hover:from-[#1868E0] hover:to-[#0A4EC0] disabled:opacity-60 text-white font-display font-semibold text-[14px] shadow-[0_4px_14px_rgba(26,115,232,0.28)] inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Admin Password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Claim Admin Access</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
