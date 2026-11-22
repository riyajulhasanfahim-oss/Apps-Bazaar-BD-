import { Star } from 'lucide-react';
import { APP_CONTENT } from '../data/appContent';

export function AppStats() {
  const { oldPrice, soldCount, rating } = APP_CONTENT.appInfo;

  return (
    <section aria-label="App highlights" className="grid grid-cols-3 items-center py-1">
      {/* Old Price */}
      <div className="flex flex-col items-center justify-center px-2 border-r border-slate-200/90">
        <span className="font-display text-[15px] sm:text-[16px] font-bold text-[#1F1F1F] tabular-nums line-through decoration-[#D93025]/80 decoration-[1.75px]">
          {oldPrice}
        </span>
        <span className="mt-0.5 text-[11.5px] sm:text-[12px] font-medium text-[#5F6368]">
          Old Price
        </span>
      </div>

      {/* Sold */}
      <div className="flex flex-col items-center justify-center px-2 border-r border-slate-200/90">
        <span className="font-display text-[15px] sm:text-[16px] font-bold text-[#1F1F1F] tabular-nums">
          {soldCount}
        </span>
        <span className="mt-0.5 text-[11.5px] sm:text-[12px] font-medium text-[#5F6368]">
          Sold
        </span>
      </div>

      {/* Rating */}
      <div className="flex flex-col items-center justify-center px-2">
        <span className="font-display text-[15px] sm:text-[16px] font-bold text-[#1F1F1F] tabular-nums inline-flex items-center gap-1">
          {rating}
          <Star className="w-3.5 h-3.5 fill-[#1F1F1F] text-[#1F1F1F]" aria-hidden="true" />
        </span>
        <span className="mt-0.5 text-[11.5px] sm:text-[12px] font-medium text-[#5F6368]">
          Reviews
        </span>
      </div>
    </section>
  );
}
