import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
} from 'lucide-react';
import type { PaymentMethodName } from '../../../shared/orderValidation';
import {
  PAYMENT_BRAND_THEMES,
  type PublicPaymentMethod,
} from '../../data/paymentConfig';
import { PaymentMethodLogo } from '../PaymentBrandLogo';

interface PaymentSettingsPanelProps {
  token: string;
  onUnauthorized: () => void;
}

interface EditableMethodDraft {
  displayName: string;
  accountNumber: string;
  dialCode: string;
  instructionsText: string;
  isActive: boolean;
}

export function PaymentSettingsPanel({ token, onUnauthorized }: PaymentSettingsPanelProps) {
  const [methods, setMethods] = useState<PublicPaymentMethod[]>([]);
  const [drafts, setDrafts] = useState<Record<string, EditableMethodDraft>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [savingId, setSavingId] = useState<PaymentMethodName | null>(null);
  const [cardErrors, setCardErrors] = useState<Record<string, string | null>>({});
  const [cardSuccess, setCardSuccess] = useState<Record<string, boolean>>({});

  const fetchSettings = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/payment-settings', {
        signal,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.settings)) {
        setLoadError(data?.error ?? 'Failed to load payment settings.');
        return;
      }

      const list = data.settings as PublicPaymentMethod[];
      setMethods(list);

      const initialDrafts: Record<string, EditableMethodDraft> = {};
      for (const m of list) {
        initialDrafts[m.id] = {
          displayName: m.displayName,
          accountNumber: m.accountNumber,
          dialCode: m.dialCode,
          instructionsText: m.instructions.join('\n'),
          isActive: m.isActive,
        };
      }
      setDrafts(initialDrafts);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setLoadError('Network error while loading payment settings.');
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    const controller = new AbortController();
    fetchSettings(controller.signal);
    return () => controller.abort();
  }, [fetchSettings]);

  const updateDraft = (
    methodId: PaymentMethodName,
    patch: Partial<EditableMethodDraft>
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [methodId]: {
        ...prev[methodId],
        ...patch,
      },
    }));
    setCardErrors((prev) => ({ ...prev, [methodId]: null }));
    setCardSuccess((prev) => ({ ...prev, [methodId]: false }));
  };

  const handleSave = async (methodId: PaymentMethodName) => {
    const draft = drafts[methodId];
    if (!draft || savingId) return;

    setSavingId(methodId);
    setCardErrors((prev) => ({ ...prev, [methodId]: null }));
    setCardSuccess((prev) => ({ ...prev, [methodId]: false }));

    const instructions = draft.instructionsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    try {
      const res = await fetch(`/api/admin/payment-settings/${encodeURIComponent(methodId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: draft.displayName,
          accountNumber: draft.accountNumber,
          dialCode: draft.dialCode,
          instructions,
          isActive: draft.isActive,
        }),
      });

      if (res.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.setting) {
        setCardErrors((prev) => ({
          ...prev,
          [methodId]: data?.error ?? 'Failed to save payment settings.',
        }));
        return;
      }

      const saved = data.setting as PublicPaymentMethod;
      setMethods((prev) => prev.map((m) => (m.id === methodId ? saved : m)));
      setDrafts((prev) => ({
        ...prev,
        [methodId]: {
          displayName: saved.displayName,
          accountNumber: saved.accountNumber,
          dialCode: saved.dialCode,
          instructionsText: saved.instructions.join('\n'),
          isActive: saved.isActive,
        },
      }));
      setCardSuccess((prev) => ({ ...prev, [methodId]: true }));
      window.setTimeout(() => {
        setCardSuccess((prev) => ({ ...prev, [methodId]: false }));
      }, 2200);
    } catch {
      setCardErrors((prev) => ({
        ...prev,
        [methodId]: 'Network error while saving settings.',
      }));
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/85 py-14 flex flex-col items-center justify-center gap-2 text-[#5F6368]">
        <Loader2 className="w-6 h-6 animate-spin text-[#1A73E8]" />
        <span className="text-[13px]">Loading configurable payment methods...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-center justify-between gap-3 text-[13px] text-red-700"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{loadError}</span>
        </div>
        <button
          type="button"
          onClick={() => fetchSettings()}
          className="px-3 py-1.5 rounded-full bg-white border border-red-200 font-semibold text-red-700 hover:bg-red-100 cursor-pointer shrink-0 inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200/85 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="font-display font-bold text-[15.5px] text-[#1F1F1F]">
            Mobile Banking Payment Accounts &amp; Instructions
          </h2>
          <p className="text-[12.5px] text-[#5F6368] mt-0.5">
            Changes saved here immediately update the live customer checkout modal across bKash,
            Nagad, Rocket, and Upay.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {methods.map((method) => {
          const draft = drafts[method.id];
          const theme = PAYMENT_BRAND_THEMES[method.id];
          const errorMsg = cardErrors[method.id];
          const isSaved = Boolean(cardSuccess[method.id]);
          const isSaving = savingId === method.id;

          if (!draft) return null;

          return (
            <div
              key={method.id}
              className="bg-white rounded-2xl border border-slate-200/85 overflow-hidden shadow-2xs flex flex-col"
            >
              {/* Colored Brand Accent Strip */}
              <div style={{ backgroundColor: theme.primaryHex }} className="h-1.5 w-full" />

              <div className="p-4 sm:p-5 space-y-3.5 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <PaymentMethodLogo method={method.id} variant="card" />
                    <div>
                      <div className="font-display font-bold text-[14px] text-[#1F1F1F]">
                        {method.id}
                      </div>
                      <div className="text-[11px] text-[#5F6368]">
                        Brand color {theme.primaryHex}
                      </div>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={draft.isActive}
                      onChange={(e) =>
                        updateDraft(method.id, { isActive: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-300 text-[#1A73E8] focus:ring-[#1A73E8]"
                    />
                    <span
                      className={`text-[12px] font-semibold px-2 py-0.5 rounded-full border ${
                        draft.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {draft.isActive ? 'LIVE' : 'Paused'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[#3C4043] mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={draft.displayName}
                      onChange={(e) =>
                        updateDraft(method.id, { displayName: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] text-[#1F1F1F] focus:outline-none focus:border-[#1A73E8]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#3C4043] mb-1">
                      Dial Code
                    </label>
                    <input
                      type="text"
                      value={draft.dialCode}
                      onChange={(e) =>
                        updateDraft(method.id, { dialCode: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-[13px] text-[#1F1F1F] focus:outline-none focus:border-[#1A73E8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#3C4043] mb-1">
                    Recipient Payment Number (11 digits)
                  </label>
                  <input
                    type="tel"
                    value={draft.accountNumber}
                    onChange={(e) =>
                      updateDraft(method.id, { accountNumber: e.target.value })
                    }
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-[14px] text-[#1F1F1F] tabular-nums focus:outline-none focus:border-[#1A73E8]"
                  />
                </div>

                <div className="flex-1">
                  <label className="block text-[12px] font-medium text-[#3C4043] mb-1">
                    Checkout Instructions (one bullet step per line)
                  </label>
                  <textarea
                    rows={5}
                    value={draft.instructionsText}
                    onChange={(e) =>
                      updateDraft(method.id, { instructionsText: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[12.5px] leading-relaxed text-[#1F1F1F] focus:outline-none focus:border-[#1A73E8]"
                  />
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-700 flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="pt-1 flex items-center justify-between gap-3">
                  <div>
                    {isSaved && (
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Saved live</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSave(method.id)}
                    style={{ backgroundColor: theme.primaryHex }}
                    className="px-4 min-h-[38px] rounded-full text-white font-display font-semibold text-[12.5px] inline-flex items-center gap-1.5 hover:brightness-95 disabled:opacity-60 cursor-pointer transition-all"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{isSaving ? 'Saving...' : `Save ${method.id}`}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
