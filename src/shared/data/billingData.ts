/**
 * Mock Billing Data
 * Sample data for development and testing
 */

import { Client, Invoice, Payment, Expense, ItemData, Series, EarningsSummary } from '../types/billingTypes';

// Mock Clients
export const mockClients: Client[] = [
    {
        id: 'c1',
        name: 'João Silva',
        nif: '123456789',
        email: 'joao.silva@example.pt',
        phone: '+351 912 345 678',
        address: {
            street: 'Rua das Flores',
            number: '42',
            floor: '3º Esq',
            postalCode: '1200-001',
            locality: 'Lisboa',
            district: 'Lisboa',
            country: 'Portugal'
        }
    },
    {
        id: 'c2',
        name: 'Maria Santos',
        nif: '234567890',
        email: 'maria.santos@example.pt',
        phone: '+351 923 456 789',
        address: {
            street: 'Avenida da Liberdade',
            number: '100',
            postalCode: '1250-001',
            locality: 'Lisboa',
            district: 'Lisboa',
            country: 'Portugal'
        }
    },
    {
        id: 'c3',
        name: 'António Costa',
        nif: '345678901',
        email: 'antonio.costa@example.pt',
        phone: '+351 934 567 890',
        address: {
            street: 'Rua de Santa Catarina',
            number: '250',
            postalCode: '4000-001',
            locality: 'Porto',
            district: 'Porto',
            country: 'Portugal'
        }
    }
];

// Mock Invoices
export const mockInvoices: Invoice[] = [
    {
        id: 'inv1',
        number: 'FT-2025/1',
        series: 'FT-2025-A',
        date: '2025-01-15',
        dueDate: '2025-02-15',
        status: 'PAID',
        client: mockClients[0],
        lines: [
            {
                id: 'l1',
                description: 'Instalação de Canalizações',
                quantity: 1,
                unit: 'serviço',
                unitPrice: 150.00,
                vatRate: 23,
                netAmount: 150.00,
                vatAmount: 34.50,
                totalAmount: 184.50
            },
            {
                id: 'l2',
                description: 'Material (Tubagens)',
                quantity: 5,
                unit: 'm',
                unitPrice: 8.50,
                vatRate: 23,
                netAmount: 42.50,
                vatAmount: 9.78,
                totalAmount: 52.28
            }
        ],
        netTotal: 192.50,
        vatTotal: 44.28,
        total: 236.78,
        atcud: 'ATCUD1234567890',
        qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PT:FT-2025/1',
        notes: 'Pagamento efetuado via MBWay'
    },
    {
        id: 'inv2',
        number: 'FT-2025/2',
        series: 'FT-2025-A',
        date: '2025-01-20',
        dueDate: '2025-02-20',
        status: 'ISSUED',
        client: mockClients[1],
        lines: [
            {
                id: 'l3',
                description: 'Reparação de Torneira',
                quantity: 1,
                unit: 'serviço',
                unitPrice: 80.00,
                vatRate: 23,
                netAmount: 80.00,
                vatAmount: 18.40,
                totalAmount: 98.40
            }
        ],
        netTotal: 80.00,
        vatTotal: 18.40,
        total: 98.40,
        atcud: 'ATCUD0987654321',
        qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PT:FT-2025/2'
    },
    {
        id: 'inv3',
        number: 'FT-2025/3',
        series: 'FT-2025-A',
        date: '2025-01-10',
        dueDate: '2025-01-25',
        status: 'OVERDUE',
        client: mockClients[2],
        lines: [
            {
                id: 'l4',
                description: 'Limpeza de Esgotos',
                quantity: 1,
                unit: 'serviço',
                unitPrice: 120.00,
                vatRate: 23,
                netAmount: 120.00,
                vatAmount: 27.60,
                totalAmount: 147.60
            }
        ],
        netTotal: 120.00,
        vatTotal: 27.60,
        total: 147.60,
        atcud: 'ATCUD1122334455',
        qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PT:FT-2025/3'
    }
];

// Mock Payments
export const mockPayments: Payment[] = [
    {
        id: 'p1',
        invoiceId: 'inv1',
        invoiceNumber: 'FT-2025/1',
        date: '2025-01-16',
        amount: 236.78,
        method: 'mbway',
        reference: '912345678',
        notes: 'Pagamento recebido'
    }
];

// Mock Expenses
export const mockExpenses: Expense[] = [
    {
        id: 'exp1',
        supplier: 'Office Supplies Ltd',
        nif: '123456789',
        date: '2025-01-15',
        amount: 45.80,
        vat: 10.53,
        category: 'Office',
        method: 'Card',
        status: 'approved',
        description: 'Office supplies purchase'
    },
    {
        id: 'exp2',
        supplier: 'Fuel Station',
        nif: '234567890',
        date: '2025-01-14',
        amount: 65.00,
        vat: 14.95,
        category: 'Travel',
        method: 'Cash',
        status: 'pending',
        description: 'Fuel for work vehicle'
    },
    {
        id: 'exp3',
        supplier: 'Hardware Store',
        nif: '345678901',
        date: '2025-01-12',
        amount: 128.50,
        vat: 29.56,
        category: 'Materials',
        method: 'Card',
        status: 'approved',
        description: 'Tools and materials'
    }
];

// Mock Items
export const mockItems: ItemData[] = [
    {
        id: 'item1',
        name: 'Pipe Installation',
        notes: 'Standard PVC pipe installation service',
        unit: 'meter',
        priceWithoutVAT: '15.00',
        vatRate: '23%',
        withholdingTax: false
    },
    {
        id: 'item2',
        name: 'Faucet Repair',
        notes: 'Repair or replacement of faucet',
        unit: 'service',
        priceWithoutVAT: '80.00',
        vatRate: '23%',
        withholdingTax: false
    },
    {
        id: 'item3',
        name: 'Drain Cleaning',
        notes: 'Professional drain cleaning service',
        unit: 'service',
        priceWithoutVAT: '120.00',
        vatRate: '23%',
        withholdingTax: false
    },
    {
        id: 'item4',
        name: 'Water Heater Installation',
        notes: 'Complete water heater installation',
        unit: 'service',
        priceWithoutVAT: '200.00',
        vatRate: '23%',
        withholdingTax: false
    },
    {
        id: 'item5',
        name: 'Emergency Call-Out',
        notes: 'After-hours emergency service',
        unit: 'service',
        priceWithoutVAT: '150.00',
        vatRate: '23%',
        withholdingTax: false
    }
];

// Mock Series
export const mockSeries: Series[] = [
    {
        id: 's1',
        code: 'FT-2025-A',
        prefix: 'FT',
        year: 2025,
        nextNumber: 5,
        validationCode: 'ABCD-1234',
        active: true
    }
];

// Mock Earnings Summary
export const mockEarningsSummary: EarningsSummary = {
    monthIssued: 456.68,
    monthPaid: 286.78,
    outstanding: 147.60,
    monthExpenses: 42.50
};

// Helper functions
export function getRecentInvoices(limit: number = 5): Invoice[] {
    return mockInvoices
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
}

export function getRecentPayments(limit: number = 5): Payment[] {
    return mockPayments
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
}
