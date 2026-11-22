export interface ScreenshotAsset {
  id: string;
  title: string;
  alt: string;
  imageUrl: string;
}

export interface ReviewItem {
  id: number;
  reviewerName: string;
  rating: number;
  date: string;
  label: string;
  text: string;
}

export interface RatingBar {
  stars: number;
  percent: number;
}

export interface AppContentConfig {
  appInfo: {
    name: string;
    developer: string;
    verifiedLabel: string;
    price: string;
    oldPrice: string;
    rating: string;
    soldCount: string;
    totalDownloadsLabel: string;
    liveDemoUrl: string;
    shortTagline: string;
  };
  screenshots: ScreenshotAsset[];
  videoDemo: {
    sectionTitle: string;
    title: string;
    description: string;
    badgeLabel: string;
    /** Set a real MP4 or embed video URL here when ready. Leave empty until configured. */
    videoUrl: string;
  };
  about: {
    shortDescription: string;
    howItWorks: string;
    features: string[];
    withdrawalInfo: string;
    metaLine: string;
  };
  reviews: {
    overallRating: string;
    totalDownloadsLabel: string;
    sampleNotice: string;
    distribution: RatingBar[];
    items: ReviewItem[];
  };
}

export function isSafeMediaUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const APP_CONTENT: AppContentConfig = {
  appInfo: {
    name: 'Ad Earning',
    developer: 'Apps Bazaar',
    verifiedLabel: 'Verified Developer · In-app purchases',
    price: '৳999',
    oldPrice: '৳3000',
    rating: '4.9',
    soldCount: '10K+',
    totalDownloadsLabel: '(100K+ Total Downloads)',
    liveDemoUrl: 'https://apps-bazaar-ad-earning.vercel.app/',
    shortTagline: 'Dark-blue mobile earning app UI with ad viewer, points dashboard, and wallet screens.',
  },
  screenshots: [
    {
      id: 'dashboard',
      title: 'Earnings Dashboard',
      alt: 'Ad Earning dark-blue dashboard screen showing points balance and watch ads actions',
      imageUrl: '/src/assets/images/screenshot_home_dashboard_1795309897037.jpg',
    },
    {
      id: 'referral',
      title: 'Referral Program',
      alt: 'Ad Earning dark-blue referral screen showing invite code and friend bonus stats',
      imageUrl: '/src/assets/images/screenshot_referral_program_1795309897166.jpg',
    },
    {
      id: 'wallet',
      title: 'My Wallet',
      alt: 'Ad Earning dark-blue wallet screen showing balance summary and payout gateway options',
      imageUrl: '/src/assets/images/screenshot_my_wallet_1795309897227.jpg',
    },
    {
      id: 'tasks',
      title: 'Daily Tasks',
      alt: 'Ad Earning dark-blue daily tasks screen showing goal progress and activity checklist',
      imageUrl: '/src/assets/images/screenshot_daily_tasks_1795309897669.jpg',
    },
  ],
  videoDemo: {
    sectionTitle: 'Video Demo / Review',
    title: 'Ad Earning — Full App Walkthrough',
    description:
      'Watch a quick tour of the dark-blue interface, ad viewing flow, points dashboard, and wallet layout.',
    badgeLabel: 'Watch Video',
    videoUrl: '',
  },
  about: {
    shortDescription:
      'Ad Earning is a mobile earning application designed with a clean dark-blue interface, smooth ad viewing flow, and an organized earnings dashboard. Users can browse rewarded ad tasks, track daily points, and manage referral activity in one place.',
    howItWorks:
      'How it works: Users sign in to view available ad placements, complete daily check-ins or task checklists, and monitor their accumulated points balance directly inside the real-time earnings dashboard.',
    features: [
      'User-friendly dark-blue mobile interface built for fast navigation',
      'Structured ad viewing experience for rewarded video and banner formats',
      'Live earnings dashboard with daily activity logs and task progress',
      'Built-in referral code sharing and friend invitation tracking',
    ],
    withdrawalInfo:
      'Withdrawal Information (Informational): The app includes a structured wallet and withdrawal request interface displaying common payout method fields. Actual withdrawal availability, minimum thresholds, and payout processing are managed independently by the app operator.',
    metaLine: 'Version 3.2 · Updated November 2026 · Mobile App Package',
  },
  reviews: {
    overallRating: '4.9',
    totalDownloadsLabel: '(100K+ Total Downloads)',
    sampleNotice: 'Sample / placeholder reviews shown for layout preview — replace with verified user reviews.',
    distribution: [
      { stars: 5, percent: 91 },
      { stars: 4, percent: 14 },
      { stars: 3, percent: 4 },
      { stars: 2, percent: 2 },
      { stars: 1, percent: 2 },
    ],
    items: [
      {
        id: 1,
        reviewerName: 'Sample Reviewer 01',
        rating: 5,
        date: 'Nov 18, 2026',
        label: 'Sample Review',
        text: 'Clean dark-blue UI layout and easy-to-follow navigation between the ad viewer, daily tasks, and wallet dashboard.',
      },
      {
        id: 2,
        reviewerName: 'Sample Reviewer 02',
        rating: 5,
        date: 'Nov 14, 2026',
        label: 'Sample Review',
        text: 'Smooth mobile responsiveness and well-organized referral and points tracking screens for app operators.',
      },
      {
        id: 3,
        reviewerName: 'Sample Reviewer 03',
        rating: 4,
        date: 'Nov 09, 2026',
        label: 'Demo Placeholder',
        text: 'Clear typography and Play Store-style layout structure. Ready to customize with live app content.',
      },
    ],
  },
};
