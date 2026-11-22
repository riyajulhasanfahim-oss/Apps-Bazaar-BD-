import type { PaymentMethodName } from '../../shared/orderValidation';

export interface PaymentMethodConfig {
  id: PaymentMethodName;
  name: PaymentMethodName;
  accountNumber: string;
  accountType: string;
  badgeColor: string;
  accentBorder: string;
  instructions: string[];
}

/**
 * Centralized payment account numbers & instructions.
 * Update accountNumber values here without touching any UI or backend files.
 */
export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'bKash',
    name: 'bKash',
    accountNumber: '01700-000001',
    accountType: 'Personal (Send Money)',
    badgeColor: 'bg-[#E2136E] text-white',
    accentBorder: 'border-[#E2136E]',
    instructions: [
      'Open your bKash app or dial *247# and choose Send Money.',
      'Enter the bKash Personal number below and send exact ৳999.',
      'Copy the Transaction ID (TrxID) from your bKash confirmation SMS and fill out the form.',
    ],
  },
  {
    id: 'Nagad',
    name: 'Nagad',
    accountNumber: '01800-000002',
    accountType: 'Personal (Send Money)',
    badgeColor: 'bg-[#F26522] text-white',
    accentBorder: 'border-[#F26522]',
    instructions: [
      'Open your Nagad app or dial *167# and choose Send Money.',
      'Enter the Nagad Personal number below and send exact ৳999.',
      'Copy the Transaction ID (TrxID) from Nagad and submit the form below.',
    ],
  },
  {
    id: 'Rocket',
    name: 'Rocket',
    accountNumber: '01900-000003',
    accountType: 'Personal (Send Money)',
    badgeColor: 'bg-[#8C3494] text-white',
    accentBorder: 'border-[#8C3494]',
    instructions: [
      'Open your Rocket app or dial *322# and select Send Money.',
      'Enter the Rocket Personal number below and transfer exact ৳999.',
      'Enter your sender Rocket number and TrxID in the order form.',
    ],
  },
  {
    id: 'Upay',
    name: 'Upay',
    accountNumber: '01600-000004',
    accountType: 'Personal (Send Money)',
    badgeColor: 'bg-[#0072BC] text-white',
    accentBorder: 'border-[#0072BC]',
    instructions: [
      'Open your Upay app or dial *268# and select Send Money.',
      'Enter the Upay Personal number below and send exact ৳999.',
      'Copy your Upay Transaction ID (TrxID) and complete the form below.',
    ],
  },
];

export const PRICING_CONFIG = {
  productName: 'Ad Earning',
  currentPrice: 999,
  previousPrice: 3000,
  currency: 'BDT',
  currencySymbol: '৳',
} as const;
