import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import BillingWelcomeScreen from '../components/billing/BillingWelcomeScreen';
import BillingOnboardingFlow from '../components/billing/BillingOnboardingFlow';
import BillingDashboard from '../components/billing/BillingDashboard';
import ExpensesList from '../components/billing/ExpensesList';
import CreateExpense from '../components/billing/CreateExpense';
import ScanExpense from '../components/billing/ScanExpense';
import InvoicesList from '../components/billing/InvoicesList';
import CreateInvoice from '../components/billing/CreateInvoice';
import DocumentTypeDrawer from '../components/billing/DocumentTypeDrawer';
import { loadOnboardingStatus } from '../shared/utils/billingStorage';

type BillingView =
  | 'welcome'
  | 'onboarding'
  | 'home'
  | 'expenses-list'
  | 'create-expense'
  | 'scan-expense'
  | 'invoices-list'
  | 'create-invoice'
  | 'commercial-proposals-list'
  | 'recurring-documents-list'
  | 'contacts'
  | 'items'
  | 'document-type-drawer';

export default function BillingScreen() {
  const [currentView, setCurrentView] = useState<BillingView>('home');
  const [viewData, setViewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);

  React.useEffect(() => {
    checkOnboarding();
  }, [currentView]); // Re-check on view changes in case onboarding completes

  const checkOnboarding = async () => {
    try {
      const isComplete = await loadOnboardingStatus();
      setIsOnboarded(isComplete);

      // Only redirect checking on initial load or if we are accidentally in home state without onboarding
      if (!loading && !isComplete && currentView !== 'welcome' && currentView !== 'onboarding') {
        setCurrentView('welcome');
      }
    } catch (error) {
      console.error('Error checking onboarding:', error);
    } finally {
      if (loading) setLoading(false);
    }
  };

  const handleNavigate = (view: string, data?: any) => {

    if (view === 'document-type-drawer') {
      setIsDrawerOpen(true);
      return;
    }

    setCurrentView(view as BillingView);
    setViewData(data || null);
  };

  const handleBack = () => {
    if (currentView === 'onboarding') {
      setCurrentView('welcome');
      return;
    }
    setCurrentView('home');
    setViewData(null);
  };

  const handleBackToExpenses = () => {
    setCurrentView('expenses-list');
  };

  const handleBackToInvoices = () => {
    setCurrentView('invoices-list');
  };

  const handleOnboardingComplete = () => {
    setIsOnboarded(true);
    setCurrentView('home');
  };

  const handleDrawerSelect = (type: string) => {
    if (type === 'create-expense') {
      setCurrentView('create-expense');
    } else if (type === 'create-invoice') {
      setCurrentView('create-invoice');
    } else {
      handlePlaceholder('This document type');
    }
  };

  // Placeholder handlers for not-yet-implemented features
  const handlePlaceholder = (feature: string) => {
    Alert.alert(
      'Coming Soon',
      `${feature} will be available in a future update.`,
      [{ text: 'OK' }]
    );
    // Don't reset view, just stay where we are
  };

  // Render current view
  const renderView = () => {
    if (loading) {
      return null;
    }

    switch (currentView) {
      case 'welcome':
        return (
          <BillingWelcomeScreen
            onStartSetup={() => setCurrentView('onboarding')}
            onSkip={() => setCurrentView('home')}
          />
        );

      case 'onboarding':
        return (
          <BillingOnboardingFlow
            onComplete={handleOnboardingComplete}
            onCancel={() => setCurrentView('welcome')}
          />
        );

      case 'expenses-list':
        return (
          <ExpensesList
            onBack={handleBack}
            onCreateExpense={() => setCurrentView('create-expense')}
            onScanExpense={() => setCurrentView('scan-expense')}
          />
        );

      case 'create-expense':
        return <CreateExpense onBack={handleBackToExpenses} />;

      case 'scan-expense':
        return (
          <ScanExpense
            onBack={handleBackToExpenses}
            onManualEntry={() => setCurrentView('create-expense')}
          />
        );

      case 'invoices-list':
        return (
          <InvoicesList
            onBack={handleBack}
            onCreateInvoice={() => setCurrentView('create-invoice')}
            filter={viewData?.filter || 'all'}
          />
        );

      case 'create-invoice':
        return <CreateInvoice onBack={handleBackToInvoices} />;

      case 'commercial-proposals-list':
        handlePlaceholder('Commercial Proposals');
        return <BillingDashboard onNavigate={handleNavigate} />;

      case 'recurring-documents-list':
        handlePlaceholder('Recurring Documents');
        return <BillingDashboard onNavigate={handleNavigate} />;

      case 'contacts':
        handlePlaceholder('Contacts Management');
        return <BillingDashboard onNavigate={handleNavigate} />;

      case 'items':
        handlePlaceholder('Items Catalog');
        return <BillingDashboard onNavigate={handleNavigate} />;

      case 'home':
      default:
        return <BillingDashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderView()}
      <DocumentTypeDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelect={handleDrawerSelect}
        isInvoiceEnabled={isOnboarded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});


