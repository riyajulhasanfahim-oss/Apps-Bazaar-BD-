import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Smartphone,
  Star,
  X,
} from 'lucide-react';
import { APP_CONTENT, isSafeMediaUrl } from '../data/appContent';
import { BuyNowModal } from './BuyNowModal';

export type ModalType = 'buy' | 'video' | 'screenshot' | 'reviews' | null;

interface InteractiveModalsProps {
  activeModal: ModalType;
  screenshotIndex: number;
  reviewStarFilter: number | null;
  onClose: () => void;
  onChangeScreenshot: (index: number) => void;
}

export function InteractiveModals({
  activeModal,
  screenshotIndex,
  reviewStarFilter,
  onClose,
  onChangeScreenshot,
}: InteractiveModalsProps) {
  const { appInfo, screenshots, videoDemo, reviews } = APP_CONTENT;
  const safeVideoUrl = isSafeMediaUrl(videoDemo.videoUrl) ? videoDemo.videoUrl.trim() : '';

  const [selectedStar, setSelectedStar] = useState<number | null>(reviewStarFilter);
  const [lightboxImageFailed, setLightboxImageFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelectedStar(reviewStarFilter);
  }, [reviewStarFilter]);

  useEffect(() => {
    if (!activeModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, onClose]);

  if (!activeModal) return null;

  const filteredReviews = selectedStar
    ? reviews.items.filter((r) => r.rating === selectedStar)
    : reviews.items;

  const currentScreenshot = screenshots[screenshotIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/55 backdrop-blur-[2px] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-[460px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <h3 className="font-display text-[16px] font-bold text-[#1F1F1F]">
            {activeModal === 'buy' && `Buy ${appInfo.name} · ${appInfo.price}`}
            {activeModal === 'video' && videoDemo.title}
            {activeModal === 'screenshot' && currentScreenshot?.title}
            {activeModal === 'reviews' && 'Ratings & Sample Reviews'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 -mr-1.5 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto">
          {activeModal === 'buy' && <BuyNowModal onClose={onClose} />}

          {/* VIDEO DEMO MODAL */}
          {activeModal === 'video' && (
            <div className="space-y-4">
              {safeVideoUrl ? (
                <div className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-200">
                  {safeVideoUrl.endsWith('.mp4') || safeVideoUrl.endsWith('.webm') ? (
                    <video
                      src={safeVideoUrl}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <iframe
                      src={safeVideoUrl}
                      title={videoDemo.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              ) : (
                <div className="w-full aspect-video rounded-2xl bg-gradient-to-br from-[#0A2E73] via-[#1565D8] to-[#0B3B8C] p-5 text-white flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-white/15 border border-white/30 flex items-center justify-center mb-3">
                    <Film className="w-5 h-5 text-white" aria-hidden="true" />
                  </div>
                  <div className="font-display text-[15px] font-bold">{videoDemo.title}</div>
                  <p className="mt-1.5 text-[12.5px] text-blue-100/90 max-w-[300px] leading-relaxed">
                    Video container is ready. Add a real video URL in the app content
                    configuration when available.
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-display text-[14px] font-semibold text-[#1F1F1F]">
                  {videoDemo.title}
                </h4>
                <p className="mt-1 text-[13px] leading-relaxed text-[#4B5563]">
                  {videoDemo.description}
                </p>
              </div>
            </div>
          )}

          {/* SCREENSHOT LIGHTBOX */}
          {activeModal === 'screenshot' && currentScreenshot && (
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() =>
                    onChangeScreenshot(
                      (screenshotIndex - 1 + screenshots.length) % screenshots.length
                    )
                  }
                  aria-label="Previous screenshot"
                  className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="w-[215px] aspect-[9/16] rounded-[22px] overflow-hidden bg-[#091326] border border-slate-900/20 shadow-xl">
                  {!lightboxImageFailed[currentScreenshot.id] ? (
                    <img
                      src={currentScreenshot.imageUrl}
                      alt={currentScreenshot.alt}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setLightboxImageFailed((prev) => ({
                          ...prev,
                          [currentScreenshot.id]: true,
                        }))
                      }
                      className="w-full h-full object-cover scale-[1.13]"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white p-4 text-center">
                      <Smartphone className="w-8 h-8 text-blue-300 mb-2" />
                      <span className="text-[13px] font-semibold">
                        {currentScreenshot.title}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onChangeScreenshot((screenshotIndex + 1) % screenshots.length)
                  }
                  aria-label="Next screenshot"
                  className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-3 text-[12px] text-[#5F6368] tabular-nums">
                {screenshotIndex + 1} of {screenshots.length}
              </div>
            </div>
          )}

          {/* REVIEWS SHEET */}
          {activeModal === 'reviews' && (
            <div className="space-y-4">
              <p className="text-[12px] text-[#5F6368]">{reviews.sampleNotice}</p>

              <div className="flex items-center gap-2">
                {[null, 5, 4].map((star) => (
                  <button
                    key={star ?? 'all'}
                    type="button"
                    onClick={() => setSelectedStar(star)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors cursor-pointer ${
                      selectedStar === star
                        ? 'bg-[#1A73E8] text-white'
                        : 'bg-slate-100 text-[#3C4043] hover:bg-slate-200'
                    }`}
                  >
                    {star === null ? 'All Sample Reviews' : `${star} ★`}
                  </button>
                ))}
              </div>

              <div className="divide-y divide-slate-100">
                {filteredReviews.map((rev) => (
                  <div key={rev.id} className="py-3 first:pt-1 last:pb-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-semibold text-[13.5px] text-[#1F1F1F]">
                        {rev.reviewerName}
                      </span>
                      <span className="text-[11.5px] text-[#5F6368] whitespace-nowrap">
                        {rev.date} · {rev.label}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-0.5">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star
                          key={idx}
                          className="w-3 h-3 fill-[#FBBC04] text-[#FBBC04]"
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#4B5563]">{rev.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
