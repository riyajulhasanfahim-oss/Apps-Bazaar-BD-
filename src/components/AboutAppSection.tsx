import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { APP_CONTENT } from '../data/appContent';

export function AboutAppSection() {
  const [expanded, setExpanded] = useState(false);
  const { shortDescription, howItWorks, features, withdrawalInfo, metaLine } =
    APP_CONTENT.about;

  return (
    <section aria-labelledby="about-app-heading">
      <div className="flex items-center justify-between mb-2">
        <h2
          id="about-app-heading"
          className="font-display text-[17px] sm:text-[18px] font-bold text-[#1F1F1F] tracking-[-0.01em]"
        >
          About this App
        </h2>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={expanded ? 'Collapse app details' : 'Expand app details'}
          aria-expanded={expanded}
          className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-[#5F6368] hover:bg-slate-100 hover:text-[#1F1F1F] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1A73E8]"
        >
          <ChevronRight
            className={`w-5 h-5 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          />
        </button>
      </div>

      <p className="text-[13.5px] sm:text-[14px] leading-[1.6] text-[#4B5563]">
        {shortDescription}
      </p>

      {expanded && (
        <div className="mt-3 space-y-3 text-[13.5px] sm:text-[14px] leading-[1.6] text-[#4B5563]">
          <p>{howItWorks}</p>

          <div>
            <h3 className="font-display text-[13.5px] font-semibold text-[#1F1F1F] mb-1.5">
              Key Features
            </h3>
            <ul className="space-y-1.5 text-[13px] text-[#374151]">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span className="text-[#1A73E8] font-bold" aria-hidden="true">
                    •
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[13px] leading-[1.55] text-[#5F6368]">{withdrawalInfo}</p>

          <p className="pt-0.5 text-[12px] text-[#5F6368]">{metaLine}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-1.5 text-[13.5px] font-semibold text-[#1A73E8] hover:text-[#0D5BD9] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A73E8] rounded"
      >
        {expanded ? 'Read Less' : 'Read More...'}
      </button>
    </section>
  );
}
