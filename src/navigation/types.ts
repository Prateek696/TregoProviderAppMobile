/**
 * Navigation types for React Navigation
 */

export type RootStackParamList = {
  Intro: undefined;
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Contacts: undefined;
  Jobs: undefined;
  Schedule: undefined;
  Billing: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  Dashboard: undefined;
  JobsList: undefined;
  JobDetail: { jobId: string; pendingAccept?: boolean };
  JobEdit: { jobId: string };
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
  ProfileCompletion: undefined;
  ClientDetail: { contact: { id: string; name: string; phone?: string; email?: string; nif?: string; notes?: string } };
};

// Combine all param lists for type safety
export type AppParamList = RootStackParamList & MainTabParamList & MainStackParamList;


