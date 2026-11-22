import type { PaymentMethodName } from './orderValidation.ts';

export interface PaymentMethodConfigItem {
  id: PaymentMethodName;
  displayName: string;
  accountNumber: string;
  dialCode: string;
  brandColor: string;
  instructions: string[];
  isActive: boolean;
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfigItem[] = [
  {
    id: 'bKash',
    displayName: 'bKash Personal',
    accountNumber: '01864670673',
    dialCode: '*247#',
    brandColor: '#E2136E',
    instructions: [
      '*247# ডায়াল করে আপনার BKASH মোবাইল মেনুতে যান অথবা BKASH অ্যাপে যান।',
      '"Send Money" -এ ক্লিক করুন।',
      'প্রাপক নম্বর হিসেবে প্রদর্শিত নম্বরে টাকা পাঠান।',
      'সঠিক পরিমাণ (৳999.00) টাকা পাঠান।',
      'নিশ্চিত করতে এখন আপনার BKASH মোবাইল মেনু পিন লিখুন।',
      'সবকিছু ঠিক থাকলে, আপনি BKASH থেকে একটি নিশ্চিতকরণ বার্তা পাবেন।',
      'এখন উপরের বক্সে আপনার Transaction ID দিন এবং নিচের Request Now বাটনে ক্লিক করুন।',
    ],
    isActive: true,
  },
  {
    id: 'Nagad',
    displayName: 'Nagad Personal',
    accountNumber: '01864670673',
    dialCode: '*167#',
    brandColor: '#F7941D',
    instructions: [
      '*167# ডায়াল করে আপনার NAGAD মোবাইল মেনুতে যান অথবা NAGAD অ্যাপে যান।',
      '"Send Money" -এ ক্লিক করুন।',
      'প্রাপক নম্বর হিসেবে প্রদর্শিত নম্বরে টাকা পাঠান।',
      'সঠিক পরিমাণ (৳999.00) টাকা পাঠান।',
      'নিশ্চিত করতে এখন আপনার NAGAD মোবাইল মেনু পিন লিখুন।',
      'সবকিছু ঠিক থাকলে, আপনি NAGAD থেকে একটি নিশ্চিতকরণ বার্তা পাবেন।',
      'এখন উপরের বক্সে আপনার Transaction ID দিন এবং নিচের Request Now বাটনে ক্লিক করুন।',
    ],
    isActive: true,
  },
  {
    id: 'Rocket',
    displayName: 'Rocket Personal',
    accountNumber: '01864670673',
    dialCode: '*322#',
    brandColor: '#8C3494',
    instructions: [
      '*322# ডায়াল করে আপনার ROCKET মোবাইল মেনুতে যান অথবা ROCKET অ্যাপে যান।',
      '"Send Money" -এ ক্লিক করুন।',
      'প্রাপক নম্বর হিসেবে প্রদর্শিত নম্বরে টাকা পাঠান।',
      'সঠিক পরিমাণ (৳999.00) টাকা পাঠান।',
      'নিশ্চিত করতে এখন আপনার ROCKET মোবাইল মেনু পিন লিখুন।',
      'সবকিছু ঠিক থাকলে, আপনি ROCKET থেকে একটি নিশ্চিতকরণ বার্তা পাবেন।',
      'এখন উপরের বক্সে আপনার Transaction ID দিন এবং নিচের Request Now বাটনে ক্লিক করুন।',
    ],
    isActive: true,
  },
  {
    id: 'Upay',
    displayName: 'Upay Personal',
    accountNumber: '01864670673',
    dialCode: '*268#',
    brandColor: '#00A5A8',
    instructions: [
      '*268# ডায়াল করে আপনার UPAY মোবাইল মেনুতে যান অথবা UPAY অ্যাপে যান।',
      '"Send Money" -এ ক্লিক করুন।',
      'প্রাপক নম্বর হিসেবে প্রদর্শিত নম্বরে টাকা পাঠান।',
      'সঠিক পরিমাণ (৳999.00) টাকা পাঠান।',
      'নিশ্চিত করতে এখন আপনার UPAY মোবাইল মেনু পিন লিখুন।',
      'সবকিছু ঠিক থাকলে, আপনি UPAY থেকে একটি নিশ্চিতকরণ বার্তা পাবেন।',
      'এখন উপরের বক্সে আপনার Transaction ID দিন এবং নিচের Request Now বাটনে ক্লিক করুন।',
    ],
    isActive: true,
  },
];
