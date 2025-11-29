/**
 * Contact Types
 * Extracted from web app - React Native compatible
 */

export type RelationshipType = 'Client' | 'Supplier' | 'Partner' | 'Internal';
export type ContactType = 'Individual' | 'Business';
export type SyncStatus = 'not-synced' | 'trego-only' | 'synced';

export interface ContactAddress {
  id: string;
  label: string; // home, work, other
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface ContactPhone {
  id: string;
  label: string; // mobile, work, home
  number: string;
  hasTrego?: boolean;
  hasWhatsApp?: boolean;
}

export interface ContactEmail {
  id: string;
  label: string; // work, personal, other
  email: string;
}

export interface ContactWebsite {
  id: string;
  label: string;
  url: string;
}

export interface JobHistoryItem {
  id: string;
  title: string;
  date: string;
  status: 'completed' | 'upcoming' | 'cancelled';
  amount?: string;
  location?: string;
}

export interface SubContact {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  avatar?: string;
}

export interface BillingInformation {
  paymentMethods: Array<{
    id: string;
    type: 'card' | 'bank' | 'cash' | 'other';
    label: string;
    details?: string;
    isDefault?: boolean;
  }>;
  billingAddress?: ContactAddress;
  taxId?: string;
  nif?: string;
  companyRegistration?: string;
  paymentTerms?: string;
  creditLimit?: number;
  currentBalance?: number;
  notes?: string;
}

export interface Contact {
  id: string;
  type: ContactType;
  name: string;
  businessName?: string;
  role?: string;
  avatar?: string;
  phones: ContactPhone[];
  emails: ContactEmail[];
  websites: ContactWebsite[];
  addresses: ContactAddress[];
  notes: string;
  relationship: RelationshipType;
  tags: string[];
  syncStatus: SyncStatus;
  jobHistory: JobHistoryItem[];
  subContacts?: SubContact[];
  billingInfo?: BillingInformation;
  nif?: string;
  createdAt: string;
  updatedAt: string;
}

