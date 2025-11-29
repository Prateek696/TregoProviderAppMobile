/**
 * Mock contacts data for React Native app
 * Simplified version - can be expanded later
 */

import { Contact } from '../types/contact';

export const mockContacts: Contact[] = [
  {
    id: '1',
    type: 'Individual',
    name: 'Ana Silva',
    role: 'Client',
    phones: [
      { id: 'p1', label: 'mobile', number: '+351 912 345 678', hasTrego: true, hasWhatsApp: true }
    ],
    emails: [
      { id: 'e1', label: 'personal', email: 'ana.silva@gmail.com' }
    ],
    websites: [],
    addresses: [
      {
        id: 'a1',
        label: 'home',
        street: 'Rua das Flores, 45',
        city: 'Lisboa',
        postalCode: '1200-194',
        country: 'Portugal'
      }
    ],
    notes: 'Prefers morning appointments. Has a small dog.',
    relationship: 'Client',
    tags: ['VIP', 'Repeat Client'],
    syncStatus: 'synced',
    jobHistory: [
      {
        id: 'j1',
        title: 'Kitchen Renovation',
        date: '2025-09-15',
        status: 'completed',
        amount: '€450',
        location: 'Lisboa'
      }
    ],
    billingInfo: {
      paymentMethods: [
        { id: 'pm1', type: 'card', label: 'Visa', details: '****  4242', isDefault: true }
      ],
      paymentTerms: 'Due on receipt',
      currentBalance: 0
    },
    createdAt: '2025-08-01',
    updatedAt: '2025-10-01'
  },
  {
    id: '2',
    type: 'Business',
    name: 'ABC Construction Ltd',
    businessName: 'ABC Construction Ltd',
    role: 'Partner',
    phones: [
      { id: 'p2', label: 'work', number: '+351 21 123 4567', hasTrego: false, hasWhatsApp: true }
    ],
    emails: [
      { id: 'e2', label: 'work', email: 'info@abcconstruction.pt' }
    ],
    websites: [
      { id: 'w1', label: 'company', url: 'https://abcconstruction.pt' }
    ],
    addresses: [
      {
        id: 'a2',
        label: 'work',
        street: 'Av. da República, 123',
        city: 'Lisboa',
        postalCode: '1050-123',
        country: 'Portugal'
      }
    ],
    notes: 'Main construction partner. Always pays on time.',
    relationship: 'Partner',
    tags: ['Partner', 'Construction'],
    syncStatus: 'trego-only',
    jobHistory: [],
    subContacts: [
      {
        id: 'sc1',
        name: 'João Ferreira',
        role: 'Project Manager',
        phone: '+351 912 111 222',
        email: 'joao@abcconstruction.pt'
      }
    ],
    billingInfo: {
      paymentMethods: [
        { id: 'pm2', type: 'bank', label: 'Bank Transfer', details: 'IBAN ending in 9876', isDefault: true }
      ],
      taxId: 'PT123456789',
      companyRegistration: 'CRL-2024-001234',
      paymentTerms: 'Net 30',
      creditLimit: 50000,
      currentBalance: 12500
    },
    createdAt: '2025-07-15',
    updatedAt: '2025-09-25'
  },
  {
    id: '3',
    type: 'Individual',
    name: 'Bruno Alves',
    role: 'Supplier',
    phones: [
      { id: 'p3', label: 'mobile', number: '+351 913 456 789', hasTrego: false, hasWhatsApp: false }
    ],
    emails: [
      { id: 'e3', label: 'work', email: 'bruno@toolsupply.pt' }
    ],
    websites: [],
    addresses: [],
    notes: 'Tool supplier. 10% discount for bulk orders.',
    relationship: 'Supplier',
    tags: ['Supplier', 'Tools'],
    syncStatus: 'synced',
    jobHistory: [],
    createdAt: '2025-06-10',
    updatedAt: '2025-09-15'
  }
];


