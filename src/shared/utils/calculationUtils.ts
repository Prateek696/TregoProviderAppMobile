/**
 * Calculation utilities for invoices, expenses, and billing
 */

/**
 * Calculate amounts for invoice line (net, VAT, total)
 */
export interface InvoiceLineAmounts {
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export const calculateInvoiceLineAmounts = (
  quantity: number,
  unitPrice: number,
  vatRate: number
): InvoiceLineAmounts => {
  const netAmount = quantity * unitPrice;
  const vatAmount = netAmount * (vatRate / 100);
  const totalAmount = netAmount + vatAmount;
  
  return {
    netAmount: Math.round(netAmount * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100
  };
};

/**
 * Calculate subtotal from invoice lines
 */
export const calculateSubtotal = (lines: Array<{ quantity: number; unitPrice: number }>): number => {
  return lines.reduce((sum, line) => sum + (line.unitPrice * line.quantity), 0);
};

/**
 * Calculate total VAT from invoice lines
 */
export const calculateTotalVAT = (lines: Array<{ quantity: number; unitPrice: number; vatRate: number }>): number => {
  return lines.reduce((sum, line) => {
    const netAmount = line.unitPrice * line.quantity;
    const vatAmount = netAmount * (line.vatRate / 100);
    return sum + vatAmount;
  }, 0);
};

/**
 * Calculate total to pay (subtotal + VAT)
 */
export const calculateTotalToPay = (lines: Array<{ quantity: number; unitPrice: number; vatRate: number }>): number => {
  const subtotal = calculateSubtotal(lines);
  const vat = calculateTotalVAT(lines);
  return subtotal + vat;
};

/**
 * Calculate VAT amount from total amount and VAT rate
 */
export const calculateVAT = (amount: number, vatRate: number): number => {
  return (amount * vatRate) / 100;
};

/**
 * Calculate total including VAT
 */
export const calculateTotalWithVAT = (amount: number, vatRate: number): number => {
  return amount + calculateVAT(amount, vatRate);
};

/**
 * Calculate total from expense data
 */
export const calculateExpenseTotal = (amount: number, vat: number): number => {
  return amount + vat;
};


