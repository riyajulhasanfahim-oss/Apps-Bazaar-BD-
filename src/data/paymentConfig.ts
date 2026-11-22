import type { PaymentMethodName } from '../../shared/orderValidation';

export interface PublicPaymentMethod {
  id: PaymentMethodName;
  displayName: string;
  accountNumber: string;
  dialCode: string;
  brandColor: string;
  instructions: string[];
  isActive: boolean;
  updatedAt?: string;
}

export interface PaymentBrandTheme {
  id: PaymentMethodName;
  primaryHex: string;
  headerGradient: string;
  panelGradient: string;
  buttonGradient: string;
  softTintBg: string;
  softBorderHex: string;
  accentTextHex: string;
  badgeBgHex: string;
  shadowRgba: string;
}

export const PAYMENT_BRAND_THEMES: Record<PaymentMethodName, PaymentBrandTheme> = {
  bKash: {
    id: 'bKash',
    primaryHex: '#E2136E',
    headerGradient: 'linear-gradient(135deg, #E2136E 0%, #C20D5C 100%)',
    panelGradient: 'linear-gradient(180deg, #E2136E 0%, #BD0B59 100%)',
    buttonGradient: 'linear-gradient(135deg, #E2136E 0%, #C40E5E 100%)',
    softTintBg: '#FFF0F6',
    softBorderHex: '#F9B4D1',
    accentTextHex: '#C20D5C',
    badgeBgHex: '#FFE4F0',
    shadowRgba: 'rgba(226, 19, 110, 0.28)',
  },
  Nagad: {
    id: 'Nagad',
    primaryHex: '#F7941D',
    headerGradient: 'linear-gradient(135deg, #F7941D 0%, #EA580C 100%)',
    panelGradient: 'linear-gradient(180deg, #F7941D 0%, #E65100 100%)',
    buttonGradient: 'linear-gradient(135deg, #F7941D 0%, #EA580C 100%)',
    softTintBg: '#FFF6EB',
    softBorderHex: '#FDCC8A',
    accentTextHex: '#D95400',
    badgeBgHex: '#FFEDD5',
    shadowRgba: 'rgba(247, 148, 29, 0.30)',
  },
  Rocket: {
    id: 'Rocket',
    primaryHex: '#8C3494',
    headerGradient: 'linear-gradient(135deg, #8C3494 0%, #6D2275 100%)',
    panelGradient: 'linear-gradient(180deg, #8C3494 0%, #691F70 100%)',
    buttonGradient: 'linear-gradient(135deg, #8C3494 0%, #6D2275 100%)',
    softTintBg: '#FAF0FC',
    softBorderHex: '#DFB6E4',
    accentTextHex: '#7A2582',
    badgeBgHex: '#F4E2F7',
    shadowRgba: 'rgba(140, 52, 148, 0.28)',
  },
  Upay: {
    id: 'Upay',
    primaryHex: '#00A5A8',
    headerGradient: 'linear-gradient(135deg, #00A5A8 0%, #008285 100%)',
    panelGradient: 'linear-gradient(180deg, #00A5A8 0%, #007A7D 100%)',
    buttonGradient: 'linear-gradient(135deg, #00A5A8 0%, #008285 100%)',
    softTintBg: '#ECFCFC',
    softBorderHex: '#9CE3E5',
    accentTextHex: '#007B7E',
    badgeBgHex: '#D9F7F8',
    shadowRgba: 'rgba(0, 165, 168, 0.28)',
  },
};

export const PRICING_CONFIG = {
  brandName: 'Apps Bazaar',
  productName: 'Ad Earning',
  paymentForLabel: 'Ad Earning — Full App License',
  currentPrice: 999,
  previousPrice: 3000,
  currency: 'BDT',
  currencySymbol: '৳',
} as const;
