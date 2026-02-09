/**
 * Billing Storage Utilities
 * AsyncStorage helpers for persisting billing data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, Invoice, Client, ItemData } from '../types/billingTypes';
import { mockExpenses, mockInvoices, mockClients, mockItems } from '../data/billingData';

// Storage keys
const KEYS = {
    EXPENSES: '@billing_expenses',
    INVOICES: '@billing_invoices',
    CLIENTS: '@billing_clients',
    ITEMS: '@billing_items',
    ONBOARDING_COMPLETE: '@billing_onboarding_complete',
    ONBOARDING_DATA: '@billing_onboarding_data',
};

// Expenses
export async function loadExpenses(): Promise<Expense[]> {
    try {
        const stored = await AsyncStorage.getItem(KEYS.EXPENSES);
        if (stored) {
            return JSON.parse(stored);
        }
        // Return mock data on first load
        await saveExpenses(mockExpenses);
        return mockExpenses;
    } catch (error) {
        console.error('Error loading expenses:', error);
        return mockExpenses;
    }
}

export async function saveExpenses(expenses: Expense[]): Promise<void> {
    try {
        await AsyncStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
    } catch (error) {
        console.error('Error saving expenses:', error);
    }
}

export async function saveExpense(expense: Expense): Promise<void> {
    try {
        const expenses = await loadExpenses();
        const existingIndex = expenses.findIndex(e => e.id === expense.id);

        if (existingIndex >= 0) {
            expenses[existingIndex] = expense;
        } else {
            expenses.push(expense);
        }

        await saveExpenses(expenses);
    } catch (error) {
        console.error('Error saving expense:', error);
    }
}

export async function deleteExpense(expenseId: string): Promise<void> {
    try {
        const expenses = await loadExpenses();
        const filtered = expenses.filter(e => e.id !== expenseId);
        await saveExpenses(filtered);
    } catch (error) {
        console.error('Error deleting expense:', error);
    }
}

// Invoices
export async function loadInvoices(): Promise<Invoice[]> {
    try {
        const stored = await AsyncStorage.getItem(KEYS.INVOICES);
        if (stored) {
            return JSON.parse(stored);
        }
        // Return mock data on first load
        await saveInvoices(mockInvoices);
        return mockInvoices;
    } catch (error) {
        console.error('Error loading invoices:', error);
        return mockInvoices;
    }
}

export async function saveInvoices(invoices: Invoice[]): Promise<void> {
    try {
        await AsyncStorage.setItem(KEYS.INVOICES, JSON.stringify(invoices));
    } catch (error) {
        console.error('Error saving invoices:', error);
    }
}

export async function saveInvoice(invoice: Invoice): Promise<void> {
    try {
        const invoices = await loadInvoices();
        const existingIndex = invoices.findIndex(i => i.id === invoice.id);

        if (existingIndex >= 0) {
            invoices[existingIndex] = invoice;
        } else {
            invoices.push(invoice);
        }

        await saveInvoices(invoices);
    } catch (error) {
        console.error('Error saving invoice:', error);
    }
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
    try {
        const invoices = await loadInvoices();
        const filtered = invoices.filter(i => i.id !== invoiceId);
        await saveInvoices(filtered);
    } catch (error) {
        console.error('Error deleting invoice:', error);
    }
}

// Clients
export async function loadClients(): Promise<Client[]> {
    try {
        const stored = await AsyncStorage.getItem(KEYS.CLIENTS);
        if (stored) {
            return JSON.parse(stored);
        }
        // Return mock data on first load
        await saveClients(mockClients);
        return mockClients;
    } catch (error) {
        console.error('Error loading clients:', error);
        return mockClients;
    }
}

export async function saveClients(clients: Client[]): Promise<void> {
    try {
        await AsyncStorage.setItem(KEYS.CLIENTS, JSON.stringify(clients));
    } catch (error) {
        console.error('Error saving clients:', error);
    }
}

export async function saveClient(client: Client): Promise<void> {
    try {
        const clients = await loadClients();
        const existingIndex = clients.findIndex(c => c.id === client.id);

        if (existingIndex >= 0) {
            clients[existingIndex] = client;
        } else {
            clients.push(client);
        }

        await saveClients(clients);
    } catch (error) {
        console.error('Error saving client:', error);
    }
}

// Items
export async function loadItems(): Promise<ItemData[]> {
    try {
        const stored = await AsyncStorage.getItem(KEYS.ITEMS);
        if (stored) {
            return JSON.parse(stored);
        }
        // Return mock data on first load
        await saveItems(mockItems);
        return mockItems;
    } catch (error) {
        console.error('Error loading items:', error);
        return mockItems;
    }
}

export async function saveItems(items: ItemData[]): Promise<void> {
    try {
        await AsyncStorage.setItem(KEYS.ITEMS, JSON.stringify(items));
    } catch (error) {
        console.error('Error saving items:', error);
    }
}

export async function saveItem(item: ItemData): Promise<void> {
    try {
        const items = await loadItems();
        const existingIndex = items.findIndex(i => i.id === item.id);

        if (existingIndex >= 0) {
            items[existingIndex] = item;
        } else {
            items.push(item);
        }

        await saveItems(items);
    } catch (error) {
        console.error('Error saving item:', error);
    }
}

// Onboarding
export async function loadOnboardingStatus(): Promise<boolean> {
    try {
        const stored = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETE);
        return stored === 'true';
    } catch (error) {
        console.error('Error loading onboarding status:', error);
        return false;
    }
}

export async function saveOnboardingStatus(complete: boolean): Promise<void> {
    try {
        await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETE, complete ? 'true' : 'false');
    } catch (error) {
        console.error('Error saving onboarding status:', error);
    }
}

export async function loadOnboardingData(): Promise<any> {
    try {
        const stored = await AsyncStorage.getItem(KEYS.ONBOARDING_DATA);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Error loading onboarding data:', error);
        return null;
    }
}

export async function saveOnboardingData(data: any): Promise<void> {
    try {
        await AsyncStorage.setItem(KEYS.ONBOARDING_DATA, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving onboarding data:', error);
    }
}

// Clear all billing data (for testing)
export async function clearAllBillingData(): Promise<void> {
    try {
        await AsyncStorage.multiRemove([
            KEYS.EXPENSES,
            KEYS.INVOICES,
            KEYS.CLIENTS,
            KEYS.ITEMS,
            KEYS.ONBOARDING_COMPLETE,
            KEYS.ONBOARDING_DATA,
        ]);
    } catch (error) {
        console.error('Error clearing billing data:', error);
    }
}
