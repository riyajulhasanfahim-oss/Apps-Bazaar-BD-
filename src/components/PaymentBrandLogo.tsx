import type { PaymentMethodName } from '../../shared/orderValidation';

interface LogoProps {
  className?: string;
}

export function AppsBazaarLogo({ className = 'w-8 h-8' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="apps-bazaar-grad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1D74F5" />
          <stop offset="1" stopColor="#0A45B5" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#apps-bazaar-grad)" />
      <path
        d="M16 14.5C16 13.1193 17.4694 12.2355 18.6897 12.8815L35.4248 21.7412C36.7124 22.4229 36.7124 24.2683 35.4248 24.95L18.6897 33.8097C17.4694 34.4557 16 33.5719 16 32.1912V14.5Z"
        fill="white"
        fillOpacity="0.96"
      />
      <circle cx="34" cy="14" r="4" fill="#FBBC04" />
    </svg>
  );
}

interface PaymentMethodLogoProps {
  method: PaymentMethodName;
  variant?: 'card' | 'header';
}

export function PaymentMethodLogo({ method, variant = 'card' }: PaymentMethodLogoProps) {
  const compact = variant === 'card';

  if (method === 'bKash') {
    return (
      <div className="inline-flex items-center gap-1.5 select-none">
        <svg
          viewBox="0 0 36 32"
          className={compact ? 'w-6 h-5' : 'w-7 h-6'}
          fill="none"
          aria-hidden="true"
        >
          {/* Authentic multi-facet origami bird mark */}
          <path d="M2 5L18.5 13L11.5 18L2 5Z" fill="#E2136E" />
          <path d="M18.5 13L29.5 7.5L21 21L11.5 18L18.5 13Z" fill="#C20D5C" />
          <path d="M29.5 7.5L34 10.5L25.5 13L29.5 7.5Z" fill="#F03D8C" />
          <path d="M11.5 18L21 21L13.5 28.5L11.5 18Z" fill="#9E0848" />
          <path d="M18.5 13L11.5 18L7 19.5L18.5 13Z" fill="#FF4B9A" />
        </svg>
        <div className="leading-none text-left">
          <div
            className={`font-display font-extrabold tracking-tight text-[#E2136E] ${
              compact ? 'text-[14px]' : 'text-[16px]'
            }`}
          >
            bKash
          </div>
          <div className="text-[8.5px] font-bold text-[#9E0848] leading-tight">বিকাশ</div>
        </div>
      </div>
    );
  }

  if (method === 'Nagad') {
    return (
      <div className="inline-flex items-center gap-1.5 select-none">
        <svg
          viewBox="0 0 34 34"
          className={compact ? 'w-6 h-6' : 'w-7 h-7'}
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="nagad-ring" x1="4" y1="4" x2="30" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F7941D" />
              <stop offset="1" stopColor="#ED1C24" />
            </linearGradient>
          </defs>
          <circle cx="17" cy="17" r="15" fill="url(#nagad-ring)" />
          <path
            d="M17 6C21 10.2 24 13.6 24 18.2C24 22.4 20.9 25.6 17 25.6C13.1 25.6 10 22.4 10 18.2C10 15.1 11.9 12.2 14.3 9.7L15.9 15.4L18.9 12L17 6Z"
            fill="white"
          />
          <circle cx="17" cy="19.5" r="2.3" fill="#ED1C24" />
        </svg>
        <div className="leading-none text-left">
          <div
            className={`font-display font-extrabold text-[#ED1C24] ${
              compact ? 'text-[14px]' : 'text-[15.5px]'
            }`}
          >
            নগদ
          </div>
          <div className="text-[8.5px] font-extrabold tracking-wider text-[#F7941D] uppercase">
            Nagad
          </div>
        </div>
      </div>
    );
  }

  if (method === 'Rocket') {
    return (
      <div className="inline-flex items-center gap-1.5 select-none">
        <svg
          viewBox="0 0 34 34"
          className={compact ? 'w-6 h-6' : 'w-7 h-7'}
          fill="none"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="30" height="30" rx="9" fill="#8C3494" />
          <path d="M8.5 18.5L26 9.5L20 26.5L16.5 20L8.5 18.5Z" fill="white" />
          <path d="M16.5 20L26 9.5L19.2 17.6L16.5 20Z" fill="#DFB6E4" />
          <circle cx="19.8" cy="15.2" r="1.6" fill="#8C3494" />
        </svg>
        <div className="leading-none text-left">
          <div className="text-[8.5px] font-extrabold tracking-wider text-[#8C3494] uppercase">
            ROCKET
          </div>
          <div
            className={`font-display font-extrabold text-[#6D2275] ${
              compact ? 'text-[13px]' : 'text-[14.5px]'
            }`}
          >
            রকেট
          </div>
        </div>
      </div>
    );
  }

  // Upay
  return (
    <div className="inline-flex items-center gap-1.5 select-none">
      <svg
        viewBox="0 0 34 34"
        className={compact ? 'w-6 h-6' : 'w-7 h-7'}
        fill="none"
        aria-hidden="true"
      >
        <rect x="2" y="2" width="30" height="30" rx="9" fill="#00A5A8" />
        <path
          d="M10.5 10.5V18.5C10.5 22.0899 13.4101 25 17 25C20.5899 25 23.5 22.0899 23.5 18.5V10.5"
          stroke="white"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        <circle cx="23.5" cy="9.8" r="2.5" fill="#FFD100" />
        <circle cx="10.5" cy="9.8" r="2.2" fill="#004D99" />
      </svg>
      <div className="leading-none text-left">
        <div
          className={`font-display font-extrabold text-[#007B7E] ${
            compact ? 'text-[13px]' : 'text-[14.5px]'
          }`}
        >
          উপায়
        </div>
        <div className="text-[9px] font-extrabold tracking-wide text-[#00A5A8]">upay</div>
      </div>
    </div>
  );
}
