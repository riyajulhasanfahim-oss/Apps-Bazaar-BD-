/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { AppStats } from './components/AppStats';
import { PurchaseActions } from './components/PurchaseActions';
import { AppScreenshots } from './components/AppScreenshots';
import { VideoDemoSection } from './components/VideoDemoSection';
import { AboutAppSection } from './components/AboutAppSection';
import { RatingsReviewsSection } from './components/RatingsReviewsSection';
import { InteractiveModals, type ModalType } from './components/InteractiveModals';
import { AdminPortal } from './components/admin/AdminPortal';

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [screenshotIndex, setScreenshotIndex] = useState(0);
  const [reviewStarFilter, setReviewStarFilter] = useState<number | null>(null);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToStore = () => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
      setPathname('/');
    }
  };

  if (isAdminPath(pathname)) {
    return <AdminPortal onBackToStore={navigateToStore} />;
  }

  const handleOpenScreenshot = (index: number) => {
    setScreenshotIndex(index);
    setActiveModal('screenshot');
  };

  const handleOpenReviews = (starFilter?: number) => {
    setReviewStarFilter(starFilter ?? null);
    setActiveModal('reviews');
  };

  return (
    <div className="min-h-screen bg-white text-[#1F1F1F] overflow-x-hidden sm:py-6 sm:px-4">
      <main className="mx-auto w-full max-w-[600px] bg-white px-4 py-5 sm:px-7 sm:py-7 sm:rounded-[28px] sm:border sm:border-slate-200/80 sm:shadow-[0_6px_30px_rgba(15,23,42,0.05)] space-y-5 sm:space-y-6">
        {/* 1. App Header */}
        <AppHeader />

        {/* 2. App Stats */}
        <AppStats />

        {/* 3. Buy Now and Live Demo */}
        <PurchaseActions onBuyNow={() => setActiveModal('buy')} />

        {/* 4. App Screenshots */}
        <AppScreenshots onSelectScreenshot={handleOpenScreenshot} />

        {/* 5. Video Demo / Review */}
        <VideoDemoSection onOpenVideo={() => setActiveModal('video')} />

        {/* 6. About this App */}
        <AboutAppSection />

        {/* 7. Ratings & Reviews */}
        <RatingsReviewsSection onOpenReviews={handleOpenReviews} />
      </main>

      <InteractiveModals
        activeModal={activeModal}
        screenshotIndex={screenshotIndex}
        reviewStarFilter={reviewStarFilter}
        onClose={() => setActiveModal(null)}
        onChangeScreenshot={setScreenshotIndex}
      />
    </div>
  );
}
