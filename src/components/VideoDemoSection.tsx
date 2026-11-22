import { useState } from 'react';
import { ChevronRight, Play } from 'lucide-react';
import { APP_CONTENT, isSafeMediaUrl } from '../data/appContent';
import type { DemoVideoItem } from '../../shared/youtube';

interface VideoDemoSectionProps {
  demoVideo?: DemoVideoItem | null;
  onOpenVideo: () => void;
}

export function VideoDemoSection({ demoVideo = null, onOpenVideo }: VideoDemoSectionProps) {
  const { sectionTitle, title, description, badgeLabel, videoUrl } = APP_CONTENT.videoDemo;
  const [thumbFailed, setThumbFailed] = useState(false);

  const displayTitle = demoVideo?.title?.trim() || title;
  const displayDescription = demoVideo?.description?.trim() || description;
  const customThumbnail =
    demoVideo?.thumbnailUrl && isSafeMediaUrl(demoVideo.thumbnailUrl) && !thumbFailed
      ? demoVideo.thumbnailUrl.trim()
      : '';

  const safeVideoUrl = isSafeMediaUrl(videoUrl) ? videoUrl.trim() : '';
  const isDirectVideo =
    !demoVideo &&
    Boolean(safeVideoUrl && (safeVideoUrl.endsWith('.mp4') || safeVideoUrl.endsWith('.webm')));

  return (
    <section aria-labelledby="video-demo-heading">
      <div className="flex items-center justify-between mb-3">
        <h2
          id="video-demo-heading"
          className="font-display text-[17px] sm:text-[18px] font-bold text-[#1F1F1F] tracking-[-0.01em]"
        >
          {sectionTitle}
        </h2>
        <button
          type="button"
          onClick={onOpenVideo}
          aria-label="Open video walkthrough"
          className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-[#5F6368] hover:bg-slate-100 hover:text-[#1F1F1F] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1A73E8]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Responsive Video Container */}
      {isDirectVideo ? (
        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-[0_8px_22px_rgba(21,101,216,0.18)]">
          <video
            src={safeVideoUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        </div>
      ) : customThumbnail ? (
        <button
          type="button"
          onClick={onOpenVideo}
          aria-label={`${badgeLabel}: ${displayTitle}`}
          className="group relative w-full aspect-video max-h-[210px] rounded-2xl overflow-hidden bg-slate-950 shadow-[0_8px_22px_rgba(21,101,216,0.22)] border border-slate-200/80 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A73E8]"
        >
          <img
            src={customThumbnail}
            alt={displayTitle}
            referrerPolicy="no-referrer"
            onError={() => setThumbFailed(true)}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/30 transition-colors flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-slate-950/65 backdrop-blur-sm border border-white/50 flex items-center justify-center text-white shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition-transform duration-150 group-hover:scale-110">
              <Play className="w-5 h-5 fill-white text-white ml-0.5" aria-hidden="true" />
            </div>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenVideo}
          aria-label={`${badgeLabel}: ${displayTitle}`}
          className="group relative w-full h-[120px] sm:h-[138px] rounded-2xl overflow-hidden bg-gradient-to-r from-[#0A3A8A] via-[#1565D8] to-[#0E4AB2] shadow-[0_8px_22px_rgba(21,101,216,0.24)] border border-blue-700/20 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A73E8]"
        >
          <div className="pointer-events-none absolute -left-8 -top-10 w-44 h-44 rounded-full bg-cyan-400/20 blur-2xl" />
          <div className="pointer-events-none absolute right-6 -bottom-12 w-48 h-48 rounded-full bg-blue-300/20 blur-2xl" />

          <div className="relative z-10 h-full px-4 sm:px-5 flex items-center justify-between gap-2">
            <div className="min-w-0 max-w-[44%]">
              <div className="font-display text-[16px] sm:text-[20px] font-extrabold text-white leading-tight tracking-tight">
                Premium
              </div>
              <div className="font-display text-[12px] sm:text-[14.5px] font-bold text-[#FACC15] leading-tight mt-0.5">
                Earning App Pro
              </div>

              <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-b from-[#FACC15] to-[#EAB308] text-[#0F172A] font-display font-bold text-[10.5px] sm:text-[11.5px] shadow-sm whitespace-nowrap">
                <Play className="w-2.5 h-2.5 fill-[#0F172A] text-[#0F172A]" aria-hidden="true" />
                <span>{badgeLabel}</span>
              </div>
            </div>

            <div className="relative shrink-0 mr-1 sm:mr-3 flex items-center">
              <div className="hidden sm:flex w-6 h-6 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 border border-amber-200 shadow-md items-center justify-center text-[10px] font-extrabold text-amber-950 -mr-2 mt-6 z-20">
                ৳
              </div>
              <div className="w-[62px] sm:w-[70px] h-[96px] sm:h-[110px] rounded-[13px] bg-white border-[2.5px] border-slate-900 shadow-[0_10px_22px_rgba(0,0,0,0.3)] rotate-[5deg] overflow-hidden flex flex-col items-center justify-center p-1.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-[#0F244D] to-[#1A73E8] flex items-center justify-center shadow-sm">
                  <Play className="w-3.5 h-3.5 fill-white text-white" aria-hidden="true" />
                </div>
                <div className="mt-1.5 text-[7px] sm:text-[7.5px] font-bold text-slate-900 text-center leading-tight">
                  Ad Earning
                </div>
                <div className="mt-0.5 text-[6px] font-semibold text-blue-600 text-center">
                  Pro Build
                </div>
              </div>
            </div>
          </div>

          {/* Centered Play Button */}
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-slate-950/60 backdrop-blur-sm border border-white/45 flex items-center justify-center text-white shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition-transform duration-150 group-hover:scale-110">
              <Play className="w-5 h-5 fill-white text-white ml-0.5" aria-hidden="true" />
            </div>
          </div>
        </button>
      )}

      {/* Video Title & Short Video Description */}
      <div className="mt-2.5">
        <h3 className="font-display text-[14px] sm:text-[14.5px] font-semibold text-[#1F1F1F] leading-snug">
          {displayTitle}
        </h3>
        <p className="mt-0.5 text-[12.5px] sm:text-[13px] leading-relaxed text-[#5F6368]">
          {displayDescription}
        </p>
      </div>
    </section>
  );
}
