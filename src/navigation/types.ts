/**
 * Navigation types for React Navigation
 */

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Jobs: undefined;
  Schedule: undefined;
  Chat: undefined;
  Billing: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Dashboard: undefined;
  JobsList: undefined;
  JobDetail: { jobId: string };
  Contacts: undefined;
  ContactDetail: { contactId: string };
  Calendar: undefined;
  Schedule: undefined;
  Earnings: undefined;
  Settings: undefined;
  ChatList: undefined;
  ChatDetail: { chatId: string };
  CreateInvoice: undefined;
  InvoiceDetail: { invoiceId: string };
  Expenses: undefined;
  CreateExpense: undefined;
};

// Combine all param lists for type safety
export type AppParamList = RootStackParamList & MainTabParamList & MainStackParamList;


