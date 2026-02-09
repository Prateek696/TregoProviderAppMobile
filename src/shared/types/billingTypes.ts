/**
 * Billing Types and Interfaces
 * TypeScript definitions for billing-related data structures
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

export interface Invoice {
    id: string;
    number: string;
    series: string;
    date: string;
    dueDate?: string;
    status: 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'VOID';
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

export interface Payment {
    id: string;
    invoiceId: string;
    invoiceNumber: string;
    date: string;
    amount: number;
    method: 'cash' | 'card' | 'mbway' | 'transfer' | 'multibanco' | 'other';
    reference?: string;
    notes?: string;
}

export interface Expense {
    id: string;
    supplier: string;
    nif?: string;
    date: string;
    amount: number;
    vat: number;
    category: 'Office' | 'Travel' | 'Materials' | 'Food' | 'Equipment';
    method: string;
    status: 'pending' | 'approved' | 'rejected';
    description?: string;
    imageUri?: string;
    jobId?: string;
    jobTitle?: string;
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

export interface Series {
    id: string;
    code: string;
    prefix: string;
    year: number;
    nextNumber: number;
    validationCode: string;
    active: boolean;
}

export interface EarningsSummary {
    monthIssued: number;
    monthPaid: number;
    outstanding: number;
    monthExpenses: number;
}

export type DocumentType =
    | 'expense'
    | 'commercial-proposal'
    | 'invoice'
    | 'simplified-invoice'
    | 'invoice-receipt'
    | 'credit-note'
    | 'receipt';

export type BillingView =
    | 'welcome'
    | 'home'
    | 'invoicing-dashboard'
    | 'invoices-list'
    | 'create-invoice'
    | 'create-expense'
    | 'create-commercial-proposal'
    | 'create-document'
    | 'invoice-detail'
    | 'expenses-list'
    | 'scan-expense'
    | 'commercial-proposals-list'
    | 'recurring-documents-list'
    | 'onboarding';

export type TimeFilter =
    | 'current-month'
    | 'last-month'
    | 'current-quarter'
    | 'current-year'
    | 'all-time'
    | 'custom';

export type DocumentTypeFilter =
    | 'all'
    | 'expense'
    | 'invoice'
    | 'simplified-invoice'
    | 'invoice-receipt'
    | 'credit-note'
    | 'receipt'
    | 'commercial-proposal';
