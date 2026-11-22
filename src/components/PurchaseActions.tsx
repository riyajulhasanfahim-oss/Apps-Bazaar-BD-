import { Play, ShoppingCart } from 'lucide-react';
import { APP_CONTENT } from '../data/appContent';

interface PurchaseActionsProps {
  onBuyNow: () => void;
}

export function PurchaseActions({ onBuyNow }: PurchaseActionsProps) {
  const { price, liveDemoUrl } = APP_CONTENT.appInfo;

  return (
    <section aria-label="Purchase actions" className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={onBuyNow}
        className="min-h-[44px] px-4 py-2.5 rounded-full bg-gradient-to-b from-[#1D74F5] to-[#0D5BD9] hover:from-[#1868E0] hover:to-[#0A4EC0] active:scale-[0.98] text-white font-display font-semibold text-[13.5px] sm:text-[14px] shadow-[0_4px_14px_rgba(26,115,232,0.3)] transition-all duration-150 inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A73E8]"
      >
        <ShoppingCart className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="tabular-nums">Buy Now · {price}</span>
      </button>

      <a
        href={liveDemoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="min-h-[44px] px-4 py-2.5 rounded-full bg-white hover:bg-blue-50/75 active:scale-[0.98] text-[#1A73E8] border-[1.5px] border-[#1A73E8] font-display font-semibold text-[13.5px] sm:text-[14px] transition-all duration-150 inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A73E8]"
      >
        <Play className="w-3.5 h-3.5 fill-[#1A73E8] text-[#1A73E8] shrink-0" aria-hidden="true" />
        <span>Live Demo</span>
      </a>
    </section>
  );
}
