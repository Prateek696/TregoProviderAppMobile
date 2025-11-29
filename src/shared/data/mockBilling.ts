/**
 * Mock billing data for React Native app
 * Simplified version - can be expanded later
 */

import { Client, Invoice, InvoiceLine, Payment, Expense, ItemData } from '../types/billing';

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
  }
];

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
  }
];

export const mockPayments: Payment[] = [
  {
    id: 'pay1',
    invoiceId: 'inv1',
    invoiceNumber: 'FT-2025/1',
    date: '2025-01-16',
    amount: 236.78,
    method: 'mbway',
    reference: 'MB-2025-001',
    notes: 'Payment received via MBWay'
  }
];

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

export const mockExpenses: Expense[] = [
  {
    id: 'exp1',
    description: 'Plumbing Materials - PVC Pipes',
    supplier: 'Leroy Merlin',
    supplierNIF: '500100144',
    date: '2025-01-05',
    category: 'Materials',
    amount: 85.50,
    vatAmount: 19.67,
    vatRate: 23,
    totalAmount: 105.17,
    paymentMethod: 'card',
    status: 'approved',
    receiptNumber: 'LM-2025-00124',
    notes: 'Materials for job on Rua das Flores'
  },
  {
    id: 'exp2',
    description: 'Fuel for Service Van',
    supplier: 'Galp Energia',
    supplierNIF: '504499777',
    date: '2025-01-08',
    category: 'Fuel',
    amount: 65.00,
    vatAmount: 14.95,
    vatRate: 23,
    totalAmount: 79.95,
    paymentMethod: 'card',
    status: 'approved',
    receiptNumber: 'GALP-20250108-4521'
  },
  {
    id: 'exp3',
    description: 'Tools - Adjustable Wrench',
    supplier: 'Brico Depot',
    supplierNIF: '980123456',
    date: '2025-01-12',
    category: 'Tools',
    amount: 28.00,
    vatAmount: 6.44,
    vatRate: 23,
    totalAmount: 34.44,
    paymentMethod: 'card',
    status: 'approved',
    receiptNumber: 'BD-2025-8745'
  }
];


