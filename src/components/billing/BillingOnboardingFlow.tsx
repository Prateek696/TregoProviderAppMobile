import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    TextInput,
    BackHandler,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Button } from '../ui/Button';
import { saveOnboardingStatus } from '../../shared/utils/billingStorage';

interface BillingOnboardingFlowFlowProps {
    onComplete: () => void;
    onCancel: () => void;
    orbColor?: string;
}

interface StepConfig {
    number: number;
    title: string;
    description: string;
    buttonText: string;
}

const STEP_CONFIGS: StepConfig[] = [
    {
        number: 1,
        title: 'Company Verification',
        description: 'Confirm your legal name, VAT number (NIF), and contact details.',
        buttonText: 'Start'
    },
    {
        number: 2,
        title: 'Fiscal Region & Mode',
        description: 'Select your country and invoicing certification type (e.g., SAFT-PT).',
        buttonText: 'Start'
    },
    {
        number: 3,
        title: 'Series & Document Settings',
        description: 'Set up your invoice numbering and ATCUD prefix.',
        buttonText: 'Start'
    },
    {
        number: 4,
        title: 'Payment & Bank Details',
        description: 'Add your IBAN, MB Way, or card details for client payments.',
        buttonText: 'Start'
    },
    {
        number: 5,
        title: 'Import Data',
        description: "Bring in your existing clients or items via CSV upload.",
        buttonText: 'Start'
    },
    {
        number: 6,
        title: 'Ready to Bill',
        description: 'Review everything and activate certified invoicing.',
        buttonText: 'Start'
    }
];

// --- Sub-Components (Moved outside) ---

// STEP 1: Business Info
interface Step1Props {
    nif: string;
    setNif: (t: string) => void;
    businessName: string;
    setBusinessName: (t: string) => void;
    address: string;
    setAddress: (t: string) => void;
    postalCode: string;
    setPostalCode: (t: string) => void;
    city: string;
    setCity: (t: string) => void;
    orbColor: string;
    onComplete: (step: number) => void;
}

const Step1Form = ({
    nif, setNif,
    businessName, setBusinessName,
    address, setAddress,
    postalCode, setPostalCode,
    city, setCity,
    orbColor,
    onComplete
}: Step1Props) => {
    const [searching, setSearching] = useState(false);
    const [nifError, setNifError] = useState('');

    const handleSearchNIF = () => {
        if (nif.length !== 9) {
            setNifError('NIF must be exactly 9 digits');
            return;
        }
        setSearching(true);
        setNifError('');
        // Mock API
        setTimeout(() => {
            setBusinessName('Example Company Lda');
            setAddress('Rua Example, 123');
            setPostalCode('1000-100');
            setCity('Lisboa');
            setSearching(false);
            Alert.alert('Found', 'Company data loaded successfully');
        }, 1000);
    };

    const isValid = businessName && nif && address && postalCode && city;

    return (
        <View style={styles.cardContainer}>
            {/* Blue Orbital Icon */}
            <View style={[styles.iconCircle, { backgroundColor: orbColor }]}>
                <Icon name="briefcase" size={28} color="#fff" />
            </View>

            <Text style={styles.stepTitle}>Enter Your Company Details</Text>
            <Text style={styles.stepDesc}>Start with your <Text style={{ color: orbColor, fontWeight: '600' }}>NIF</Text> to auto-fill company information</Text>

            {/* NIF Section */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>NIF (Tax ID) *</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput
                        style={[styles.inputGray, { flex: 1, borderColor: nifError ? '#ef4444' : '#e5e7eb' }]}
                        value={nif}
                        onChangeText={(t) => { setNif(t); setNifError(''); }}
                        placeholder="9 digits"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        maxLength={9}
                    />
                    <TouchableOpacity
                        style={[styles.searchBtn, { backgroundColor: orbColor, opacity: searching ? 0.8 : 1 }]}
                        onPress={handleSearchNIF}
                        disabled={searching}
                    >
                        {searching ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="magnify" size={20} color="#fff" />}
                    </TouchableOpacity>
                </View>
                {nifError ? <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{nifError}</Text> :
                    <Text style={styles.helperText}>Enter your 9-digit NIF and click search to auto-fill company details</Text>}
            </View>

            {/* Company Name */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Legal Company Name *</Text>
                <TextInput
                    style={styles.inputGray}
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder="e.g., Your Company Lda"
                    placeholderTextColor="#9ca3af"
                />
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Street Address *</Text>
                <TextInput
                    style={styles.inputGray}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Street name and number"
                    placeholderTextColor="#9ca3af"
                />
            </View>

            {/* Postal Code & City */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, marginBottom: 20 }}>
                    <Text style={styles.label}>Postal Code *</Text>
                    <TextInput
                        style={styles.inputGray}
                        value={postalCode}
                        onChangeText={setPostalCode}
                        placeholder="0000-000"
                        placeholderTextColor="#9ca3af"
                    />
                </View>
                <View style={{ flex: 1, marginBottom: 20 }}>
                    <Text style={styles.label}>City *</Text>
                    <TextInput
                        style={styles.inputGray}
                        value={city}
                        onChangeText={setCity}
                        placeholder="City name"
                        placeholderTextColor="#9ca3af"
                    />
                </View>
            </View>

            {/* Territory (Visual Only) */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Territory *</Text>
                <View style={[styles.inputGray, { justifyContent: 'center' }]}>
                    <Text style={{ color: '#374151' }}>Mainland Portugal</Text>
                    <Icon name="chevron-down" size={16} color="#9ca3af" style={{ position: 'absolute', right: 12 }} />
                </View>
            </View>

            <Button
                title="Confirm"
                onPress={() => onComplete(1)}
                disabled={!isValid}
                style={{ backgroundColor: orbColor, height: 50, marginTop: 12 }}
                textStyle={{ fontSize: 16 }}
                icon="chevron-right"
            />
        </View>
    );
};

// STEP 2: Connect AT
interface Step2Props {
    onComplete: (step: number) => void;
}

const Step2Form = ({ onComplete }: Step2Props) => {
    const [connecting, setConnecting] = useState(false);

    const handleConnect = () => {
        setConnecting(true);
        setTimeout(() => {
            setConnecting(false);
            onComplete(2);
        }, 2000);
    };

    return (
        <View style={styles.cardContainer}>
            {/* Yellow Shield Icon */}
            <View style={[styles.iconCircle, { backgroundColor: '#facc15' }]}>
                <Icon name="shield" size={32} color="#fff" />
                <View style={{ position: 'absolute', bottom: 12, right: 12, backgroundColor: '#fff', borderRadius: 8, padding: 2 }}>
                    <Icon name="lock" size={12} color="#facc15" />
                </View>
            </View>

            <Text style={styles.stepTitle}>Link to the Portuguese Tax Authority</Text>
            <Text style={styles.stepDesc}>Secure connection for certified invoicing and ATCUD validation</Text>

            <View style={styles.benefitsList}>
                {[
                    'Automatic ATCUD generation for every invoice',
                    'QR code validation on all documents',
                    'Full legal compliance with Decree-Law No. 28/2019'
                ].map((item, i) => (
                    <View key={i} style={styles.benefitItem}>
                        <View style={styles.checkCircle}><Icon name="check" size={12} color="#fff" /></View>
                        <Text style={styles.benefitText}>{item}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.warningBox}>
                <Icon name="alert-circle" size={20} color="#ca8a04" />
                <Text style={styles.warningText}>Important: Without AT connection, your invoices won't be legally certified in Portugal.</Text>
            </View>

            <Button
                title={connecting ? "Connecting..." : "Connect to AT"}
                onPress={handleConnect}
                disabled={connecting}
                style={{ backgroundColor: '#facc15', height: 50, marginTop: 12 }}
                textStyle={{ color: '#111827', fontSize: 16, fontWeight: '600' }}
                icon={connecting ? undefined : "chevron-right"}
            />

            <TouchableOpacity onPress={() => onComplete(2)} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: '#6b7280', fontSize: 14 }}>Skip for now (not recommended)</Text>
            </TouchableOpacity>
        </View>
    );
};

// STEP 3: VAT Regime
interface Step3Props {
    vatRegime: string;
    setVatRegime: (t: string) => void;
    orbColor: string;
    onComplete: (step: number) => void;
}

const Step3Form = ({ vatRegime, setVatRegime, orbColor, onComplete }: Step3Props) => {
    const regimes = [
        { id: 'standard', title: 'Standard VAT', desc: 'Most common - 23% VAT on goods and services', recommended: true },
        { id: 'exempt', title: 'Exempt (Article 53)', desc: 'Small businesses under €13,500/year revenue', recommended: false },
        { id: 'reverse', title: 'Reverse Charge', desc: 'Customer pays VAT (B2B services)', recommended: false },
    ];

    return (
        <View style={styles.cardContainer}>
            <View style={[styles.iconCircle, { backgroundColor: orbColor }]}>
                <Icon name="percent" size={28} color="#fff" />
            </View>
            <Text style={styles.stepTitle}>Choose Your VAT Status</Text>
            <Text style={styles.stepDesc}>Select the VAT regime that applies to your business</Text>

            {regimes.map((r) => {
                const isSelected = vatRegime === r.id;
                return (
                    <TouchableOpacity
                        key={r.id}
                        style={[
                            styles.radioCard,
                            isSelected && { borderColor: orbColor, backgroundColor: '#eff6ff' }
                        ]}
                        onPress={() => setVatRegime(r.id)}
                    >
                        <View style={[styles.radioOuter, isSelected && { borderColor: orbColor }]}>
                            {isSelected && <View style={[styles.radioInner, { backgroundColor: orbColor }]} />}
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={[styles.radioTitle, isSelected && { color: '#0f172a' }]}>{r.title}</Text>
                                {r.recommended && <View style={styles.badge}><Text style={styles.badgeText}>Recommended</Text></View>}
                            </View>
                            <Text style={[styles.radioDesc, isSelected && { color: '#334155' }]}>{r.desc}</Text>
                        </View>
                    </TouchableOpacity>
                );
            })}

            <View style={styles.infoBox}>
                <Icon name="information" size={20} color={orbColor} />
                <Text style={styles.infoBoxText}>Need help? You can always change this later in Settings. Contact your accountant if unsure.</Text>
            </View>

            <Button
                title="Select Regime"
                onPress={() => onComplete(3)}
                disabled={!vatRegime}
                style={{ marginTop: 24, backgroundColor: orbColor, height: 50 }}
                textStyle={{ fontSize: 16 }}
                icon="chevron-right"
            />
        </View>
    );
};

// STEP 4: Payment Details
interface Step4Props {
    iban: string;
    setIban: (t: string) => void;
    mbway: string;
    setMbway: (t: string) => void;
    accountHolder: string;
    setAccountHolder: (t: string) => void;
    orbColor: string;
    onComplete: (step: number) => void;
}

const Step4Form = ({
    iban, setIban,
    mbway, setMbway,
    accountHolder, setAccountHolder,
    orbColor,
    onComplete
}: Step4Props) => (
    <View style={styles.cardContainer}>
        <View style={[styles.iconCircle, { backgroundColor: orbColor }]}>
            <Icon name="credit-card-outline" size={28} color="#fff" />
        </View>
        <Text style={styles.stepTitle}>Payment & Bank Details</Text>
        <Text style={styles.stepDesc}>Add your IBAN, MB Way, or card details for client payments</Text>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>IBAN <Text style={{ fontWeight: '400', color: '#6b7280' }}>(optional)</Text></Text>
            <TextInput
                style={styles.inputGray}
                value={iban}
                onChangeText={setIban}
                placeholder="PT50 0000 0000 0000 0000 0"
                placeholderTextColor="#9ca3af"
            />
            <Text style={styles.helperText}>Your international bank account number</Text>
        </View>
        <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Holder Name <Text style={{ fontWeight: '400', color: '#6b7280' }}>(optional)</Text></Text>
            <TextInput
                style={styles.inputGray}
                value={accountHolder}
                onChangeText={setAccountHolder}
                placeholder="Your Name or Business Name"
                placeholderTextColor="#9ca3af"
            />
        </View>
        <View style={styles.inputGroup}>
            <Text style={styles.label}>MB Way Number <Text style={{ fontWeight: '400', color: '#6b7280' }}>(optional)</Text></Text>
            <TextInput
                style={styles.inputGray}
                value={mbway}
                onChangeText={setMbway}
                placeholder="+351 900 000 000"
                keyboardType="phone-pad"
                placeholderTextColor="#9ca3af"
            />
            <Text style={styles.helperText}>Your Portuguese mobile payment number</Text>
        </View>

        <View style={styles.infoBox}>
            <Icon name="flash" size={20} color="#ca8a04" />
            <Text style={[styles.infoBoxText, { color: '#854d0e' }]}>Tip: These details will appear on your invoices so clients know where to send payments. You can add or update these later in Settings.</Text>
        </View>

        <Button
            title="Continue"
            onPress={() => onComplete(4)}
            style={{ marginTop: 24, backgroundColor: orbColor, height: 50 }}
            textStyle={{ fontSize: 16 }}
            icon="chevron-right"
        />

        <TouchableOpacity onPress={() => onComplete(4)} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: '#6b7280', fontSize: 14 }}>You can skip this step and add payment details later</Text>
        </TouchableOpacity>
    </View>
);

// STEP 5: Import Data
interface Step5Props {
    orbColor: string;
    onComplete: (step: number) => void;
}

const Step5Form = ({ orbColor, onComplete }: Step5Props) => {
    const [uploading, setUploading] = useState(false);

    const handleUpload = () => {
        setUploading(true);
        setTimeout(() => {
            setUploading(false);
            onComplete(5);
        }, 1500);
    };

    return (
        <View style={styles.cardContainer}>
            <View style={[styles.iconCircle, { backgroundColor: orbColor }]}>
                <Icon name="upload-outline" size={28} color="#fff" />
            </View>
            <Text style={styles.stepTitle}>Bring in Your Existing Data</Text>
            <Text style={styles.stepDesc}>Optional CSV upload for clients or service items</Text>

            <TouchableOpacity style={styles.importOption} onPress={handleUpload} disabled={uploading}>
                <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}>
                    <Icon name="account-group" size={24} color="#16a34a" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.radioTitle}>Import Clients</Text>
                    <Text style={styles.radioDesc}>Name, NIF, email, address</Text>
                </View>
                {uploading && <ActivityIndicator size="small" color="#111827" />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.importOption} onPress={handleUpload} disabled={uploading}>
                <View style={[styles.iconBox, { backgroundColor: '#f3e8ff' }]}>
                    <Icon name="package-variant" size={24} color="#9333ea" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.radioTitle}>Import Service Items</Text>
                    <Text style={styles.radioDesc}>Description, unit price, VAT rate</Text>
                </View>
            </TouchableOpacity>

            <Button
                title="Skip Import"
                onPress={() => onComplete(5)}
                style={{ marginTop: 24, backgroundColor: orbColor, height: 50 }}
                textStyle={{ fontSize: 16 }}
                icon="chevron-right"
            />

            <TouchableOpacity onPress={() => onComplete(5)} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: '#6b7280', fontSize: 14 }}>Skip — I'll add manually</Text>
            </TouchableOpacity>
        </View>
    );
};

// STEP 6: Setup Complete
interface Step6Props {
    orbColor: string;
    onFinish: () => void;
}

const Step6Form = ({ orbColor, onFinish }: Step6Props) => {
    return (
        <View style={styles.cardContainer}>
            <View style={{ alignItems: 'center', marginVertical: 32 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                    <Icon name="check" size={40} color="#16a34a" />
                    <View style={{ position: 'absolute', top: -5, right: -5 }}><Icon name="star" size={20} color="#eab308" /></View>
                </View>
                <Text style={styles.stepTitle}>Setup Complete!</Text>
                <Text style={[styles.stepDesc, { textAlign: 'center' }]}>Your invoices are now officially certified with ATCUD + QR validation</Text>
            </View>

            {/* Certified Documents Card */}
            <View style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', gap: 16 }}>
                <View style={{ width: 64, height: 64, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8 }}>
                    <Icon name="view-grid" size={32} color="#0f172a" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 4 }}>Certified Documents</Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>Every invoice includes:</Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>• Unique ATCUD code</Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>• QR code for instant validation</Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>• Full legal compliance</Text>
                </View>
            </View>

            {/* Legal Note */}
            <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                <Icon name="check" size={14} color="#64748b" />
                <Text style={{ fontSize: 11, color: '#64748b', textAlign: 'center' }}>Certified under Decree-Law No. 28/2019</Text>
            </View>

            {/* Checklist */}
            <View style={{ marginBottom: 32, gap: 12 }}>
                {[
                    'Business information configured',
                    'Connected to Portuguese Tax Authority',
                    'VAT regime selected',
                    'Invoice layout customized',
                    'Ready to issue certified documents'
                ].map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="check" size={10} color="#fff" />
                        </View>
                        <Text style={{ fontSize: 13, color: '#475569' }}>{item}</Text>
                    </View>
                ))}
            </View>

            <Button
                title="Create First Invoice"
                onPress={onFinish}
                size="lg"
                style={{ backgroundColor: orbColor, height: 50 }}
                textStyle={{ fontSize: 16 }}
                icon="file-document-outline"
            />
        </View>
    );
};

export default function BillingOnboardingFlow({
    onComplete,
    onCancel,
    orbColor = '#1E6FF7',
}: BillingOnboardingFlowFlowProps) {
    const [view, setView] = useState<'overview' | 'step'>('overview');
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

    // --- Shared State ---
    const [nif, setNif] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [address, setAddress] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [territory, setTerritory] = useState('mainland');

    // Step 3
    const [vatRegime, setVatRegime] = useState('standard');

    // Step 4
    const [iban, setIban] = useState('');
    const [mbway, setMbway] = useState('');
    const [accountHolder, setAccountHolder] = useState('');

    const handleStepStart = (stepNumber: number) => {
        setCurrentStep(stepNumber);
        setView('step');
    };

    const handleStepComplete = (stepNumber: number) => {
        if (!completedSteps.includes(stepNumber)) {
            const newCompleted = [...completedSteps, stepNumber];
            setCompletedSteps(newCompleted);
        }
        setView('overview');
    };

    // Hardware Back Button Handler
    useEffect(() => {
        const backAction = () => {
            if (view === 'step') {
                setView('overview');
                return true; // Prevent default behavior
            } else if (view === 'overview') {
                onCancel();
                return true; // Handle back in overview (cancel flow)
            }
            return false; // Let default behavior happen (exit app or nav back)
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [view, onCancel]);

    const handleFinish = async () => {
        try {
            await saveOnboardingStatus(true);
            onComplete();
        } catch (error) {
            console.error('Error saving onboarding status:', error);
            Alert.alert('Error', 'Failed to save setup. Please try again.');
        }
    };

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <Step1Form
                        nif={nif}
                        setNif={setNif}
                        businessName={businessName}
                        setBusinessName={setBusinessName}
                        address={address}
                        setAddress={setAddress}
                        postalCode={postalCode}
                        setPostalCode={setPostalCode}
                        city={city}
                        setCity={setCity}
                        orbColor={orbColor}
                        onComplete={handleStepComplete}
                    />
                );
            case 2:
                return <Step2Form onComplete={handleStepComplete} />;
            case 3:
                return (
                    <Step3Form
                        vatRegime={vatRegime}
                        setVatRegime={setVatRegime}
                        orbColor={orbColor}
                        onComplete={handleStepComplete}
                    />
                );
            case 4:
                return (
                    <Step4Form
                        iban={iban}
                        setIban={setIban}
                        mbway={mbway}
                        setMbway={setMbway}
                        accountHolder={accountHolder}
                        setAccountHolder={setAccountHolder}
                        orbColor={orbColor}
                        onComplete={handleStepComplete}
                    />
                );
            case 5:
                return <Step5Form orbColor={orbColor} onComplete={handleStepComplete} />;
            case 6:
                return <Step6Form orbColor={orbColor} onFinish={handleFinish} />;
            default:
                return <View />;
        }
    };

    // --- Overview View ---
    if (view === 'overview') {
        const allDone = completedSteps.length >= 6;

        return (
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
                <View style={styles.progressHeader}>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${(Math.min(completedSteps.length + 1, 6) / 6) * 100}%`, backgroundColor: orbColor }]} />
                    </View>
                    <Text style={styles.progressText}>Set up Invoicing - Step {Math.min(completedSteps.length + 1, 6)} of 6</Text>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
                    <Text style={[styles.headerTitle, { color: orbColor }]}>Complete these six steps</Text>

                    {allDone && (
                        <View style={styles.successBanner}>
                            <Icon name="check-circle-outline" size={20} color="#059669" />
                            <Text style={styles.successText}>Certified invoicing is ready.</Text>
                            <TouchableOpacity onPress={handleFinish} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' }}>
                                <Text style={{ color: orbColor, fontWeight: '600', marginRight: 4 }}>Finish</Text>
                                <Icon name="arrow-right" size={16} color={orbColor} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {STEP_CONFIGS.map((step) => {
                        const isCompleted = completedSteps.includes(step.number);
                        const isCurrent = !isCompleted && step.number === Math.min(completedSteps.length + 1, 6);

                        return (
                            <View
                                key={step.number}
                                style={[
                                    styles.stepCard,
                                    isCompleted && { borderColor: '#10b981' },
                                    isCurrent && { borderColor: `${orbColor}80`, borderWidth: 2 }
                                ]}
                            >
                                <View style={styles.stepHeader}>
                                    <View style={[
                                        styles.stepIcon,
                                        { backgroundColor: isCompleted ? '#10b981' : `${orbColor}15` }
                                    ]}>
                                        {isCompleted ? (
                                            <Icon name="check" size={14} color="#fff" />
                                        ) : (
                                            <Text style={{ color: orbColor, fontWeight: 'bold', fontSize: 12 }}>{step.number}</Text>
                                        )}
                                    </View>
                                    <Text style={styles.stepCardTitle}>{step.title}</Text>
                                </View>

                                <Text style={styles.stepCardDesc}>{step.description}</Text>

                                <View style={styles.stepFooter}>
                                    <TouchableOpacity
                                        onPress={() => handleStepStart(step.number)}
                                        disabled={isCompleted && step.number !== 6}
                                        style={[
                                            styles.stepButton,
                                            isCompleted ? styles.stepButtonDone : { backgroundColor: orbColor }
                                        ]}
                                    >
                                        <Text style={[styles.stepButtonText]}>
                                            {isCompleted ? 'Done' : 'Start'}
                                        </Text>
                                        {!isCompleted && <Icon name="chevron-right" size={14} color="#fff" />}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            </SafeAreaView >
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={styles.progressHeader}>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${(currentStep / 6) * 100}%`, backgroundColor: orbColor }]} />
                    </View>
                    <Text style={styles.progressText}>Set up Invoicing - Step {currentStep} of 6</Text>
                </View>
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={{ paddingBottom: 350 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {renderCurrentStep()}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' }, // Dark background
    content: { flex: 1, padding: 16 },
    progressHeader: {
        backgroundColor: '#1e293b', // Dark header
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        alignItems: 'center',
    },
    progressBarBg: { height: 4, width: '100%', backgroundColor: '#334155', borderRadius: 2, marginBottom: 8 },
    progressBarFill: { height: '100%', borderRadius: 2 },
    progressText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },

    headerTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 16, color: '#f8fafc' },

    stepCard: {
        backgroundColor: '#1e293b', // Dark card
        borderRadius: 12,
        padding: 14, // Reduced padding
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#334155',
        // Removed elevation (shadow) for flatter dark mode look, or use standard
    },
    stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    stepIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    stepCardTitle: { fontSize: 14, fontWeight: '600', color: '#f8fafc' },
    stepCardDesc: { fontSize: 12, color: '#94a3b8', marginBottom: 10, paddingLeft: 34 },
    stepFooter: { flexDirection: 'row', justifyContent: 'flex-end' },
    stepButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, gap: 4 },
    stepButtonDone: { backgroundColor: '#10b981', borderWidth: 0 },
    stepButtonText: { fontSize: 12, fontWeight: '600', color: '#fff' },

    successBanner: { backgroundColor: '#064e3b', borderWidth: 1, borderColor: '#059669', borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    successText: { color: '#a7f3d0', fontWeight: '500', flex: 1, fontSize: 13 },

    // Detail / Form Styles
    detailHeader: { flexDirection: 'row', padding: 16, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' }, // Keep logic but handled by hardware back
    backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 }, // Optional if we keep it
    backText: { fontSize: 14, color: '#94a3b8' },

    // Updated Card Container for Dark Mode
    cardContainer: {
        backgroundColor: '#1e293b', // Dark Card
        borderRadius: 16,
        padding: 20, // Reduced from 24
        // Dark Mode Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 4,
        marginHorizontal: 0, // removed margin horizontal
    },
    iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 }, // Reduced size
    stepTitle: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc', marginBottom: 6, textAlign: 'center' }, // Reduced size
    stepDesc: { fontSize: 14, color: '#94a3b8', marginBottom: 24, textAlign: 'center' }, // Reduced size

    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '500', color: '#e2e8f0', marginBottom: 6 },

    // Dark Mode Input
    inputGray: {
        backgroundColor: '#334155', // Darker input bg
        borderWidth: 1,
        borderColor: '#475569',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: '#f8fafc', // Light text
        height: 44, // Reduced height
    },
    helperText: { fontSize: 11, color: '#94a3b8', marginTop: 4 },

    // Step 2 Specials (Dark)
    benefitsList: { backgroundColor: '#0f172a', padding: 12, borderRadius: 12, marginBottom: 16 },
    benefitItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    checkCircle: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    benefitText: { fontSize: 13, color: '#e2e8f0', flex: 1, lineHeight: 18 },
    warningBox: { flexDirection: 'row', gap: 12, padding: 12, backgroundColor: '#422006', borderColor: '#854d0e', borderWidth: 1, borderRadius: 8, marginBottom: 20 }, // Dark yellow/orange
    warningText: { flex: 1, fontSize: 12, color: '#fde047' },

    // Step 3 Specials (Dark)
    radioCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderWidth: 1, borderColor: '#334155', borderRadius: 12, marginBottom: 10, gap: 12, backgroundColor: '#1e293b' },
    radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#475569', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    radioInner: { width: 8, height: 8, borderRadius: 4 },
    radioTitle: { fontSize: 14, fontWeight: '600', color: '#f8fafc' },
    radioDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    badge: { backgroundColor: '#064e3b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, marginLeft: 6 },
    badgeText: { fontSize: 10, fontWeight: '600', color: '#4ade80' },

    // Step 5 Specials (Dark)
    importOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#334155', borderRadius: 12, marginBottom: 10, gap: 12, backgroundColor: '#1e293b' },
    iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

    searchBtn: {
        width: 44,
        height: 44,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoBox: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#1e3a8a', // Dark blue
        borderWidth: 1,
        borderColor: '#1d4ed8',
        borderRadius: 8,
        marginTop: 16,
        gap: 12,
    },
    infoBoxText: {
        flex: 1,
        fontSize: 12,
        color: '#bfdbfe',
        lineHeight: 16,
    },
    miniBtn: { width: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, color: '#111827' }, // Legacy need to update or remove if unused, keeping for safety but not using
});
