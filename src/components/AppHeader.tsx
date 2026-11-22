import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { APP_CONTENT } from '../data/appContent';

export function AppHeader() {
  const { name, developer, verifiedLabel } = APP_CONTENT.appInfo;

  return (
    <header className="flex items-start gap-4 sm:gap-5">
      {/* App Icon */}
      <div
        className="relative shrink-0 w-[78px] h-[78px] sm:w-[88px] sm:h-[88px] rounded-[20px] sm:rounded-[22px] bg-gradient-to-br from-[#0E1C36] via-[#0B1528] to-[#060C18] border border-slate-800/40 shadow-[0_8px_20px_rgba(11,21,40,0.22)] flex items-center justify-center overflow-hidden"
        aria-label={`${name} app icon`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
        <svg
          viewBox="0 0 64 64"
          className="w-12 h-12 sm:w-14 sm:h-14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M21 20L24.5 13L32 18L39.5 13L43 20H21Z"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx="24.5" cy="11.5" r="1.4" fill="#FFFFFF" />
          <circle cx="32" cy="11" r="1.6" fill="#FFFFFF" />
          <circle cx="39.5" cy="11.5" r="1.4" fill="#FFFFFF" />
          <rect
            x="16"
            y="24"
            width="32"
            height="27"
            rx="7.5"
            stroke="#FFFFFF"
            strokeWidth="2.4"
          />
          <path
            d="M28.5 32.2C28.5 31.35 29.43 30.83 30.15 31.28L38.45 36.48C39.13 36.9 39.13 37.9 38.45 38.32L30.15 43.52C29.43 43.97 28.5 43.45 28.5 42.6V32.2Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>

      {/* App Title & Developer Metadata */}
      <div className="min-w-0 flex-1 pt-0.5">
        <h1 className="font-display text-[24px] sm:text-[27px] font-bold tracking-[-0.02em] text-[#1F1F1F] leading-tight">
          {name}
        </h1>

        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <span className="text-[14px] sm:text-[14.5px] font-semibold text-[#1A73E8] leading-snug">
            By {developer}
          </span>
          <BadgeCheck
            className="w-4 h-4 text-white fill-[#1A73E8] shrink-0"
            aria-label="Verified developer badge"
          />
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 text-[12px] sm:text-[12.5px] font-medium text-[#5F6368]">
          <ShieldCheck
            className="w-3.5 h-3.5 text-[#188038] shrink-0"
            aria-hidden="true"
          />
          <span className="truncate">{verifiedLabel}</span>
        </div>
      </div>
    </header>
  );
}
