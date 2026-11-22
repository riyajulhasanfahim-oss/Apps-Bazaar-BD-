import { ChevronRight, Star } from 'lucide-react';
import { APP_CONTENT } from '../data/appContent';

interface RatingsReviewsSectionProps {
  onOpenReviews: (starFilter?: number) => void;
}

export function RatingsReviewsSection({ onOpenReviews }: RatingsReviewsSectionProps) {
  const { overallRating, totalDownloadsLabel, sampleNotice, distribution, items } =
    APP_CONTENT.reviews;

  return (
    <section aria-labelledby="ratings-reviews-heading">
      <div className="flex items-center justify-between mb-3">
        <h2
          id="ratings-reviews-heading"
          className="font-display text-[17px] sm:text-[18px] font-bold text-[#1F1F1F] tracking-[-0.01em]"
        >
          Ratings &amp; Reviews
        </h2>
        <button
          type="button"
          onClick={() => onOpenReviews()}
          aria-label="View all sample reviews"
          className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-[#5F6368] hover:bg-slate-100 hover:text-[#1F1F1F] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1A73E8]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Rating Summary & 5-to-1 Distribution Bars */}
      <div className="flex items-center gap-5 sm:gap-8">
        <div className="shrink-0">
          <div className="font-display text-[42px] sm:text-[48px] font-bold leading-none tracking-[-0.03em] text-[#1F1F1F] tabular-nums">
            {overallRating}
          </div>

          <div
            className="mt-2 flex items-center gap-0.5"
            aria-label={`${overallRating} out of 5 stars`}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#FBBC04] text-[#FBBC04]"
                aria-hidden="true"
              />
            ))}
          </div>

          <div className="mt-1.5 text-[11.5px] sm:text-[12px] font-medium text-[#5F6368] tabular-nums whitespace-nowrap">
            {totalDownloadsLabel}
          </div>
        </div>

        <div className="flex-1 space-y-1.5 min-w-0">
          {distribution.map((row) => (
            <button
              key={row.stars}
              type="button"
              onClick={() => onOpenReviews(row.stars)}
              aria-label={`Filter ${row.stars} star sample reviews`}
              className="w-full flex items-center gap-2.5 group cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-[#1A73E8]"
            >
              <span className="w-7 shrink-0 inline-flex items-center justify-end gap-0.5 text-[11.5px] font-semibold text-[#3C4043] tabular-nums">
                {row.stars}
                <Star className="w-2.5 h-2.5 fill-[#1A73E8] text-[#1A73E8]" aria-hidden="true" />
              </span>

              <div className="flex-1 h-2 bg-[#E8EEF5] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1A73E8] group-hover:bg-[#0D5BD9] rounded-full transition-colors duration-150"
                  style={{ width: `${row.percent}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Clearly Labeled Sample / Placeholder Review Cards */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <p className="text-[11.5px] text-[#5F6368] mb-3">{sampleNotice}</p>

        <div className="space-y-3">
          {items.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-slate-200/80 bg-slate-50/55 p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-full bg-[#1A73E8]/12 text-[#1A73E8] font-display font-bold text-[12px] flex items-center justify-center shrink-0"
                    aria-hidden="true"
                  >
                    {review.reviewerName.slice(0, 1)}
                  </div>
                  <span className="font-display text-[13.5px] font-semibold text-[#1F1F1F] truncate">
                    {review.reviewerName}
                  </span>
                </div>
                <span className="text-[11.5px] text-[#5F6368] whitespace-nowrap shrink-0">
                  {review.date} · {review.label}
                </span>
              </div>

              <div
                className="mt-2 flex items-center gap-0.5"
                aria-label={`${review.rating} out of 5 stars`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= review.rating
                        ? 'fill-[#FBBC04] text-[#FBBC04]'
                        : 'fill-slate-200 text-slate-200'
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>

              <p className="mt-1.5 text-[13px] leading-relaxed text-[#4B5563]">
                {review.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
