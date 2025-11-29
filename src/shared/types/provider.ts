/**
 * Provider Profile Types
 * Extracted from web app - React Native compatible
 */

export type PersonalityMode = 'precision' | 'encouragement' | 'hustler' | 'quiet';
export type OrbPattern = 'solid' | 'breathing' | 'pulsing' | 'rotating';

export interface BaseLocation {
  id: string;
  address: string;
  city: string;
  zipCode: string;
  nickname: string;
  lat?: number;
  lng?: number;
  name?: string; // Alternative field name
  serviceRadius?: number;
}

export interface ProviderProfile {
  firstName: string;
  lastName?: string;
  assistantName: string;
  orbColor: string;
  orbPattern: string;
  personalityMode: PersonalityMode;
  profilePhoto?: string;
  services: string[];
  coverageRadius: number;
  hasCoverageArea?: boolean;
  workingHours: { start: string; end: string };
  calendarConnected: boolean;
  baseLocations: BaseLocation[];
  
  // Business Information
  vatNif?: string;
  citizenshipStatus?: 'portuguese' | 'non-portuguese';
  documentUploads?: {
    citizenCardFront?: string;
    citizenCardBack?: string;
    passport?: string;
    residenceCertificate?: string;
    residencePermit?: string;
  };
  documentVerification?: {
    residency_status: 'portuguese' | 'non-portuguese' | '';
    files: {
      criminalRecord?: any; // File type - will be handled differently in RN
      proofOfAddress?: any;
      citizenCardFront?: any;
      citizenCardBack?: any;
      passport?: any;
      residencePermitFront?: any;
      residencePermitBack?: any;
      translation?: any;
    };
    metadata: {
      criminalRecordIssueDate: string;
      criminalRecordCountry: string;
      criminalRecordLanguage: string;
      proofOfAddressDate: string;
      proofOfAddressSource: 'financas' | 'utility' | 'bank' | '';
      optionalComment: string;
    };
    has_translation: boolean;
    consents: {
      authentic: boolean;
      privacy: boolean;
    };
    status_flag: 'pending_upload' | 'awaiting_criminal_record' | 'pending_review_auto' | 'pending_human_review' | 'verified' | 'rejected';
  };
}

export interface ProviderAppProps {
  skipToMain?: boolean;
  testingData?: {
    firstName: string;
    assistantName: string;
    orbColor: string;
    orbPattern: string;
    personalityMode: PersonalityMode;
    serviceArea?: string;
    skipToChat?: boolean;
  } | null;
  debugMode?: boolean;
}

export type Screen = 'auth' | 'onboarding' | 'main' | 'setup' | 'dashboard' | 'jobs' | 'contacts' | 'calendar' | 'calendar-monthly';

