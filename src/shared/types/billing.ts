/**
 * Billing Types (Invoices, Payments, Expenses)
 * Extracted from web app - React Native compatible
 */

export interface Client {
  id: string;
  name: string;
  nif: string;
  email?: string;
  phone?: string;
  address: {
    street: string;
    number?: string;
    floor?: string;
    postalCode: string;
    locality: string;
    district: string;
    country: string;
  };
}

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'VOID';

export interface Invoice {
  id: string;
  number: string;
  series: string;
  date: string;
  dueDate?: string;
  status: InvoiceStatus;
  client: Client;
  lines: InvoiceLine[];
  netTotal: number;
  vatTotal: number;
  total: number;
  atcud?: string;
  qrUrl?: string;
  notes?: string;
  pdfUrl?: string;
}

export type PaymentMethod = 'cash' | 'card' | 'mbway' | 'transfer' | 'multibanco' | 'other';

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface Series {
  id: string;
  code: string;
  prefix: string;
  year: number;
  nextNumber: number;
  validationCode: string;
  active: boolean;
}

export interface Expense {
  id: string;
  description: string;
  supplier: string;
  supplierNIF?: string;
  date: string;
  category: string;
  amount: number;
  vatAmount: number;
  vatRate: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: 'pending' | 'approved' | 'rejected';
  receiptNumber?: string;
  notes?: string;
  attachmentUrl?: string;
}

export interface ItemData {
  id: string;
  name: string;
  notes: string;
  unit: string;
  priceWithoutVAT: string;
  vatRate: string;
  withholdingTax: boolean;
}

export interface EarningsSummary {
  monthIssued: number;
  monthPaid: number;
  outstanding: number;
  monthExpenses: number;
}

export interface CommercialProposal {
  id: string;
  title: string;
  proposalNumber: string;
  client: Client;
  date: string;
  validUntil: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  introText: string;
  lines: InvoiceLine[];
  termsText: string;
  netTotal: number;
  vatTotal: number;
  total: number;
  notes?: string;
}

export interface DocumentTemplate {
  id: string;
  type: 'commercial-proposal' | 'invoice' | 'simplified-invoice' | 'invoice-receipt' | 'credit-note' | 'receipt' | 'expense';
  name: string;
  description?: string;
  category?: string;
  validDays?: string;
  introText?: string;
  termsText?: string;
  lines?: any[];
  createdAt: string;
  supplier?: string;
  amount?: number;
  vatRate?: number;
}

