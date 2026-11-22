import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { APP_CONTENT } from '../data/appContent';

interface AppScreenshotsProps {
  onSelectScreenshot: (index: number) => void;
}

export function AppScreenshots({ onSelectScreenshot }: AppScreenshotsProps) {
  const screenshots = APP_CONTENT.screenshots;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeDot, setActiveDot] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll > 0) {
      const ratio = el.scrollLeft / maxScroll;
      const index = Math.min(
        screenshots.length - 1,
        Math.max(0, Math.round(ratio * (screenshots.length - 1)))
      );
      setActiveDot(index);
    }
  };

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, []);

  const scrollByAmount = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = direction === 'right' ? 200 : -200;
    el.scrollBy({ left: distance, behavior: 'smooth' });
  };

  const scrollToSlide = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const targetLeft =
      screenshots.length > 1 ? (index / (screenshots.length - 1)) * maxScroll : 0;
    el.scrollTo({ left: targetLeft, behavior: 'smooth' });
  };

  return (
    <section aria-labelledby="screenshots-heading">
      <div className="flex items-center justify-between mb-3">
        <h2
          id="screenshots-heading"
          className="font-display text-[17px] sm:text-[18px] font-bold text-[#1F1F1F] tracking-[-0.01em]"
        >
          App Screenshots
        </h2>
        <button
          type="button"
          onClick={() => scrollByAmount('right')}
          aria-label="Scroll screenshots forward"
          className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-[#5F6368] hover:bg-slate-100 hover:text-[#1F1F1F] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1A73E8]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar pb-1"
        >
          {screenshots.map((item, index) => {
            const hasFailed = failedImages[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectScreenshot(index)}
                aria-label={`Preview ${item.title} screenshot`}
                className="group relative shrink-0 w-[138px] sm:w-[152px] aspect-[9/16] rounded-[18px] overflow-hidden bg-[#091326] border border-slate-900/15 shadow-[0_6px_16px_rgba(15,23,42,0.12)] snap-start transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A73E8]"
              >
                {!hasFailed ? (
                  <img
                    src={item.imageUrl}
                    alt={item.alt}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [item.id]: true }))
                    }
                    className="w-full h-full object-cover scale-[1.13] select-none pointer-events-none"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-[#0D1E42] to-[#081226] text-white p-3 flex flex-col items-center justify-center text-center">
                    <Smartphone className="w-6 h-6 text-blue-300 mb-2" aria-hidden="true" />
                    <span className="text-[11px] font-semibold leading-snug">
                      {item.title}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Left subtle scroll arrow */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByAmount('left')}
            aria-label="Previous screenshots"
            className="hidden sm:flex absolute left-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 border border-slate-200/90 shadow-[0_4px_12px_rgba(15,23,42,0.16)] items-center justify-center text-slate-700 hover:bg-white hover:scale-105 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1A73E8]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right subtle next-arrow control */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByAmount('right')}
            aria-label="Next screenshots"
            className="flex absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 border border-slate-200/90 shadow-[0_4px_12px_rgba(15,23,42,0.16)] items-center justify-center text-slate-700 hover:bg-white hover:scale-105 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1A73E8]"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Subtle Scroll Indicator Dots */}
      <div className="mt-2.5 flex items-center justify-center gap-1.5" aria-hidden="true">
        {screenshots.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            tabIndex={-1}
            onClick={() => scrollToSlide(idx)}
            className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
              activeDot === idx ? 'w-4 bg-[#1A73E8]' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
