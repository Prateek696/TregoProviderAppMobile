/**
 * Onboarding Screen
 * Simplified version migrated from web app's ProviderOnboardingFlow
 */

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent } from '../components/ui/Card';
import { Colors } from '../shared/constants/colors';
import { jsonStorage, STORAGE_KEYS } from '../shared/storage';
import { StartupOrb } from '../components/StartupOrb';
import WorkingHoursScreen, { WorkingHours } from './WorkingHoursScreen';
import PersonalInformationScreen from './PersonalInformationScreen';
import BillingInformationScreen from './BillingInformationScreen';
import CalendarSyncScreen from './CalendarSyncScreen';
import CompleteSetupScreen from './CompleteSetupScreen';

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const COLOR_OPTIONS = [
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Green', color: '#10b981' },
  { name: 'Purple', color: '#8b5cf6' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Teal', color: '#14b8a6' },
  { name: 'Indigo', color: '#6366f1' },
];

// Service categories matching web version EXACTLY (16 categories)
const SERVICE_CATEGORIES = [
  'Home & Property',
  'Trades & Construction',
  'Auto & Transport',
  'Outdoor & Garden',
  'Wellness & Care',
  'Beauty & Personal',
  'Pets & Animals',
  'Events & Entertainment',
  'Food & Hospitality',
  'Education & Tutoring',
  'Business & Office',
  'Tech & Digital',
  'Design & Creative',
  'Finance & Legal',
  'Logistics & Delivery',
  'Other',
];

// Service domains - EXACT match with web version (all sub-services included)
const SERVICE_DOMAINS: { [key: string]: string[] } = {
  'Home & Property': [
    'Regular Cleaning', 'Deep Cleaning', 'Move-In/Out Cleaning', 'Window Cleaning', 'Carpet Cleaning',
    'Electrical Wiring', 'Lighting Installation', 'Smart Home Setup', 'EV Chargers',
    'Leak Repair', 'Toilet Installation', 'Water Heater', 'Drain Cleaning', 'Pipe Replacement',
    'Cabinet Installation', 'Door Installation', 'Custom Furniture', 'Furniture Repair',
    'Interior Painting', 'Exterior Painting', 'Wallpaper Installation',
    'Dishwasher Repair', 'Fridge Repair', 'Washer/Dryer Repair', 'Oven Repair',
    'Air Conditioning', 'Heating Installation', 'Duct Cleaning',
    'Solar Installation', 'Battery Installation', 'Energy Audits',
    'Security Cameras', 'Alarm Systems', 'Smart Locks',
    'Window Installation', 'Door Repair', 'Window Tinting', 'Insulation',
    'Termite Control', 'Rodent Control', 'Disinfection',
    'Home Inspection', 'Energy Inspection', 'Structural Inspection',
    'General Repairs', 'Furniture Assembly', 'TV Mounting', 'Odd Jobs'
  ],
  'Trades & Construction': [
    'Roof Installation', 'Roof Leak Repair', 'Tile Replacement',
    'Tile Flooring', 'Vinyl Flooring', 'Hardwood Flooring', 'Laminate Flooring', 'Floor Polishing',
    'Driveway Installation', 'Patio Construction', 'Foundation Work',
    'Wood Fencing', 'Metal Fencing', 'Automatic Gates',
    'Structural Welding', 'Decorative Metalwork',
    'Drywall Installation', 'Drywall Repair', 'Soundproofing', 'Insulation Installation',
    'Chimney Cleaning', 'Chimney Repair', 'Gutter Cleaning', 'Gutter Installation',
    'Window Replacement', 'Glass Tinting', 'Glazing',
    'Partial Demolition', 'Full Demolition', 'Debris Removal'
  ],
  'Auto & Transport': [
    'Engine Repair', 'Brake Service', 'Transmission Repair', 'Diagnostics',
    'Car Wash', 'Interior Detailing', 'Exterior Detailing', 'Ceramic Coating',
    'Towing', 'Battery Jump Start', 'Tire Change', 'Roadside Assistance',
    'Local Carpools', 'Airport Shuttle', 'School Transportation',
    'Motorcycle Tune-Up', 'Motorcycle Maintenance', 'Motorcycle Customization',
    'Boat Cleaning', 'Boat Repair', 'RV Maintenance', 'RV Storage'
  ],
  'Outdoor & Garden': [
    'Landscape Design', 'Landscape Installation', 'Landscape Maintenance',
    'Lawn Mowing', 'Fertilizing', 'Weed Control',
    'Tree Trimming', 'Tree Removal', 'Stump Grinding',
    'Pool Cleaning', 'Pool Maintenance', 'Spa Repair',
    'Sprinkler Installation', 'Drip Systems', 'Drainage Solutions',
    'Pathway Lighting', 'Security Lighting', 'Garden Lighting'
  ],
  'Wellness & Care': [
    'Deep Tissue Massage', 'Sports Massage', 'Relaxation Massage', 'Couples Massage',
    'Personal Training', 'Yoga Classes', 'Pilates', 'CrossFit',
    'Therapy', 'Counseling', 'Life Coaching',
    'Elder Home Care', 'Companionship', 'Medical Assistance',
    'Babysitting', 'Nanny Services', 'After-School Care',
    'In-Home Nursing', 'Post-Surgery Care', 'Medication Assistance'
  ],
  'Beauty & Personal': [
    'Haircuts', 'Hair Coloring', 'Hair Styling', 'Hair Extensions',
    'Wedding Makeup', 'Event Makeup', 'Makeup Tutorials',
    'Manicure', 'Pedicure', 'Acrylic Nails', 'Gel Nails',
    'Facials', 'Waxing', 'Laser Treatment',
    'Tattoo Design', 'Piercing', 'Tattoo Aftercare',
    'Wardrobe Consulting', 'Image Consulting', 'Personal Shopping'
  ],
  'Pets & Animals': [
    'Pet Feeding', 'Dog Walking', 'Pet Sitting',
    'Pet Bathing', 'Pet Trimming', 'Pet Styling',
    'Obedience Training', 'Behavioral Training',
    'Vaccinations', 'Pet Checkups', 'Emergency Vet Care',
    'Pet Photography', 'Pet Event Photography',
    'Pet Relocation', 'Airport Pet Pickup'
  ],
  'Events & Entertainment': [
    'Wedding Photography', 'Corporate Photography', 'Real Estate Photography', 'Event Videography',
    'Catering Services', 'Private Chef', 'Bartending', 'Mixology',
    'Wedding Planning', 'Birthday Planning', 'Corporate Events',
    'Live Bands', 'DJ Services', 'Equipment Rental',
    'Flower Arrangements', 'Event Furniture', 'Event Staging',
    'Chair Rentals', 'Tent Rentals', 'Audio-Visual Rentals',
    'Magicians', 'Event Hosts', 'Performers'
  ],
  'Food & Hospitality': [
    'Corporate Catering', 'Private Catering', 'Outdoor Catering',
    'Weekly Meal Prep', 'Healthy Meal Plans',
    'At-Home Dining', 'Private Events',
    'Custom Cakes', 'Pastries', 'Specialty Desserts',
    'Event Bartenders', 'Professional Mixologists',
    'Online Cooking Classes', 'In-Person Cooking Classes'
  ],
  'Education & Tutoring': [
    'Math Tutoring', 'Science Tutoring', 'Language Tutoring', 'History Tutoring',
    'SAT Prep', 'IELTS Prep', 'GMAT Prep', 'College Exam Prep',
    'Piano Lessons', 'Guitar Lessons', 'Drawing Lessons', 'Dance Classes',
    'Business Skills', 'Communication Skills', 'Accounting Training',
    'Programming', 'AI Training', 'Data Science', 'Web Development',
    'Learning Support', 'Dyslexia Coaching',
    'English Lessons', 'Portuguese Lessons', 'French Lessons', 'Spanish Lessons', 'German Lessons'
  ],
  'Business & Office': [
    'Virtual Assistant', 'Scheduling', 'Data Entry',
    'Bookkeeping', 'Payroll', 'Invoicing',
    'Recruiting', 'HR Policy Setup', 'Benefits Administration',
    'Strategy Consulting', 'Management Consulting', 'Marketing Consulting',
    'Remote Customer Support', 'Chat Support',
    'Business Incorporation', 'Licensing', 'VAT Registration'
  ],
  'Tech & Digital': [
    'Computer Repair', 'Virus Removal', 'Network Setup',
    'App Development', 'Website Development', 'API Development',
    'Workflow Automation', 'Custom AI Models',
    'Cloud Setup', 'Cloud Migration', 'Security Setup',
    'Penetration Testing', 'Security Hardening', 'Security Monitoring',
    'Smart Device Setup', 'Troubleshooting', 'IoT Integration'
  ],
  'Design & Creative': [
    'Logo Design', 'Branding', 'Print Design',
    'UI Design', 'UX Design', 'Website Design', 'App Design', 'Prototypes',
    '3D Rendering', 'Floor Plans', 'Product Design',
    'Video Editing', 'Motion Graphics', '3D Animation',
    'Blog Writing', 'Ad Copywriting', 'Product Descriptions',
    'Marketing Campaigns', 'SEO', 'Ads Management'
  ],
  'Finance & Legal': [
    'Tax Preparation', 'VAT Filing', 'Bookkeeping',
    'Budget Planning', 'Investment Advice', 'Retirement Planning',
    'Health Insurance', 'Auto Insurance', 'Property Insurance',
    'Mortgage Assistance', 'Debt Counseling',
    'Contract Review', 'Property Law', 'Immigration Law', 'Family Law',
    'Document Certification', 'Apostille', 'Legal Translation'
  ],
  'Logistics & Delivery': [
    'Local Moving', 'Long Distance Moving', 'Packing Services',
    'Same-Day Delivery', 'Scheduled Delivery', 'Food Delivery', 'Package Delivery',
    'Document Courier', 'Urgent Item Delivery',
    'Freight Transport', 'Pallet Transport', 'Large Item Transport',
    'Temporary Storage', 'Long-Term Storage', 'Secure Storage',
    'Grocery Shopping', 'Pickup & Drop-off Services'
  ],
  'Other': []  // Special category for custom services
};

export default function OnboardingScreen() {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(0);
  const [firstName, setFirstName] = useState('');
  const [assistantName, setAssistantName] = useState('');
  const [orbColor, setOrbColor] = useState('#3b82f6'); // Default: Blue Dots
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [showServiceHelp, setShowServiceHelp] = useState(false);
  const [showEnhancedCustomization, setShowEnhancedCustomization] = useState(false);
  const [customServiceInput, setCustomServiceInput] = useState('');
  const [typingMessage, setTypingMessage] = useState('');
  const typingCompleteRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 4: Base Location & Coverage state
  const [newBaseNickname, setNewBaseNickname] = useState('');
  const [newBaseLocation, setNewBaseLocation] = useState('');
  const [newBaseCity, setNewBaseCity] = useState('');
  const [newBaseZipCode, setNewBaseZipCode] = useState('');
  const [baseLocations, setBaseLocations] = useState<Array<{
    id: string;
    address: string;
    city: string;
    zipCode: string;
    nickname: string;
  }>>([]);
  const [coverageMode, setCoverageMode] = useState<'distance' | 'city'>('distance');
  const [coverageRadius, setCoverageRadius] = useState(20);
  const [hasUnlimitedCoverage, setHasUnlimitedCoverage] = useState(false);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [showCoverageInfo, setShowCoverageInfo] = useState(false);

  // Step 5: Working Hours state
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null);

  // Step 6: Personal Information state
  const [personalInfo, setPersonalInfo] = useState<{
    firstName: string;
    lastName: string;
    countryCode: string;
    vatNif: string;
  } | null>(null);

  // Step 7: Billing Information state
  const [billingInfo, setBillingInfo] = useState<{
    usePersonalInfo: boolean;
    name?: string;
    vat?: string;
    address?: string;
    city?: string;
    postalCode?: string;
  } | null>(null);

  // Step 8: Calendar Sync state
  const [calendarSync, setCalendarSync] = useState<{
    calendarConnected: boolean;
    calendarProvider?: 'google' | 'outlook' | 'apple' | 'other';
  } | null>(null);

  const handleServiceToggle = (service: string) => {
    const currentServices = selectedServices || [];

    // If trying to add and already at max (3), don't add
    if (!currentServices.includes(service) && currentServices.length >= 3) {
      // Show error (you can add toast later)
      return;
    }

    const updatedServices = currentServices.includes(service)
      ? currentServices.filter(s => s !== service)
      : [...currentServices, service];
    setSelectedServices(updatedServices);
  };

  const addCustomService = (customService: string) => {
    if (customService.trim() && !selectedServices.includes(customService.trim())) {
      const currentServices = selectedServices || [];

      // If already at max (3), don't add
      if (currentServices.length >= 3) {
        return;
      }

      setSelectedServices([...currentServices, customService.trim()]);
      setCustomServiceInput('');
      setSelectedCategory(null);
    }
  };

  // Filter items based on search and selected category
  const filteredItems = useMemo(() => {
    if (selectedCategory) {
      const services = SERVICE_DOMAINS[selectedCategory] || [];
      if (serviceSearchQuery.trim()) {
        return services.filter(service =>
          service.toLowerCase().includes(serviceSearchQuery.toLowerCase())
        );
      }
      return services;
    }

    // Filter categories
    if (serviceSearchQuery.trim()) {
      return SERVICE_CATEGORIES.filter(cat =>
        cat.toLowerCase().includes(serviceSearchQuery.toLowerCase())
      );
    }
    return SERVICE_CATEGORIES;
  }, [selectedCategory, serviceSearchQuery]);

  const handleNext = () => {
    if (currentStep < 9) {
      setCurrentStep((currentStep + 1) as OnboardingStep);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((currentStep - 1) as OnboardingStep);
    }
  };

  const handleComplete = async () => {
    try {
      // Save profile data
      const profile = {
        firstName,
        assistantName,
        orbColor,
        services: selectedServices,
        baseLocations,
        coverageRadius,
        hasCoverageArea: !hasUnlimitedCoverage,
        selectedCities: coverageMode === 'city' ? selectedCities : [],
        workingHours: workingHours || undefined,
        personalInfo: personalInfo || undefined,
        billingInfo: billingInfo || undefined,
        calendarSync: calendarSync || undefined,
        onboardingComplete: true,
      };

      await jsonStorage.setItem(STORAGE_KEYS.PROVIDER_PROFILE, profile);
      await jsonStorage.setItem(STORAGE_KEYS.ORB_COLOR, orbColor);
      if (workingHours) {
        await jsonStorage.setItem('trego-provider-working-hours', JSON.stringify(workingHours));
      }
      await jsonStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, true);

      // Navigate to main app
      navigation.replace('Main');
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return firstName.trim().length >= 1; // At least 1 character (matching web)
      case 1:
        return assistantName.trim().length > 0;
      case 2:
        return true; // Color always selected
      case 3:
        return selectedServices.length > 0;
      case 4:
        const hasValidBase = baseLocations.length > 0;
        const hasValidCoverage = coverageMode === 'distance'
          ? (hasUnlimitedCoverage || coverageRadius > 0)
          : selectedCities.length > 0;
        return (hasValidBase && hasValidCoverage) || hasUnlimitedCoverage;
      case 5:
        // Validate working hours - at least one day must be active with valid blocks
        if (!workingHours) return false;
        return Object.values(workingHours).some(
          day =>
            day.active &&
            day.blocks.length > 0 &&
            day.blocks.some((block: any) => block.start && block.end && block.start < block.end)
        );
      case 6:
        // Validate personal information - firstName and lastName required
        return personalInfo !== null &&
          personalInfo.firstName.trim().length > 0 &&
          personalInfo.lastName.trim().length > 0;
      case 7:
        // Validate billing information
        if (!billingInfo) return false;
        if (billingInfo.usePersonalInfo) {
          return billingInfo.name && billingInfo.vat && billingInfo.address;
        } else {
          return billingInfo.name && billingInfo.vat && billingInfo.address && billingInfo.city && billingInfo.postalCode;
        }
      case 8:
        // Calendar sync is optional - just need a selection
        return calendarSync !== null;
      case 9:
        // Complete setup screen - always can proceed (auto-completes)
        return true;
      default:
        return false;
    }
  };

  const renderStep0 = () => (
    <View style={styles.stepContainer}>
      {/* Orb at top - matching web version */}
      <View style={styles.orbContainer}>
        <StartupOrb size="lg" intensity="normal" color="#0088cc" />
      </View>

      {/* Title */}
      <Text style={styles.stepTitle}>What would you like to be called?</Text>

      {/* Input Section */}
      <View style={styles.nameInputContainer}>
        <Label style={styles.nameLabel}>Nickname/First Name</Label>
        <View style={styles.inputWrapper}>
          <Icon name="account-outline" size={24} color="#9ca3af" style={styles.userIcon} />
          <Input
            placeholder="Enter your name…"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            style={styles.nameInput}
            autoFocus
          />
          <Icon name="check" size={20} color={Colors.emerald600} style={styles.checkIcon} />
        </View>
      </View>

      {/* Helper text */}
      <Text style={styles.helperText}>
        This is just how I'll address you in chat and what clients will see on their end — we'll ask for legal details later for compliance.
      </Text>
    </View>
  );

  // Typing animation for greeting message (step 1)
  useEffect(() => {
    if (currentStep !== 1) {
      typingCompleteRef.current = false;
      setTypingMessage('');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      return;
    }

    // Reset when step changes
    typingCompleteRef.current = false;
    setTypingMessage('');

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const fullMessage = `Hello ${firstName}, nice to meet you. Now it's time to set me up. What would you like to call me?`;
    const segments = [
      { text: `Hello ${firstName},`, pauseAfter: 800 },
      { text: ' nice to meet you.', pauseAfter: 600 },
      { text: ` Now it's time to set me up.`, pauseAfter: 600 },
      { text: ' What would you like to call me?', pauseAfter: 0 }
    ];

    let currentText = '';
    let segmentIndex = 0;
    let charIndex = 0;
    const typingSpeed = 30;

    const typeCharacter = () => {
      if (typingCompleteRef.current) return;

      const currentSegment = segments[segmentIndex];
      if (!currentSegment) {
        typingCompleteRef.current = true;
        return;
      }

      if (charIndex < currentSegment.text.length) {
        currentText += currentSegment.text[charIndex];
        setTypingMessage(currentText);
        charIndex++;
        typingTimeoutRef.current = setTimeout(typeCharacter, typingSpeed);
      } else {
        segmentIndex++;
        charIndex = 0;
        if (currentSegment.pauseAfter > 0) {
          typingTimeoutRef.current = setTimeout(typeCharacter, currentSegment.pauseAfter);
        } else {
          typeCharacter();
        }
      }
    };

    typingTimeoutRef.current = setTimeout(typeCharacter, 300);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentStep, firstName]);

  const renderStep1 = () => {
    const presetNames = ['Sage', 'Scout', 'Moxie', 'Bolt', 'Atlas', 'Nova', 'Ranger', 'Pixel'];

    return (
      <View style={styles.stepContainer}>
        {/* Orb at top - matching web version */}
        <View style={styles.orbContainer}>
          <StartupOrb size="lg" intensity="normal" color="#0088cc" />
        </View>

        {/* Typing message */}
        <Text style={styles.greetingMessage}>
          {typingMessage || `Hello ${firstName}, nice to meet you. Now it's time to set me up. What would you like to call me?`}
          {!typingCompleteRef.current && typingMessage && <Text style={styles.cursor}>|</Text>}
        </Text>

        {/* Preset names grid - 2x4 matching web */}
        <View style={styles.presetNamesGrid}>
          {presetNames.map((name) => (
            <TouchableOpacity
              key={name}
              style={[
                styles.presetNameButton,
                assistantName === name && styles.presetNameButtonSelected,
              ]}
              onPress={() => setAssistantName(name)}>
              <Text
                style={[
                  styles.presetNameText,
                  assistantName === name && styles.presetNameTextSelected,
                ]}>
                {name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom name input */}
        <View style={styles.customNameContainer}>
          <Label style={styles.customNameLabel}>Or type a name you prefer</Label>
          <View style={styles.customInputWrapper}>
            <Input
              placeholder="Custom name"
              value={assistantName}
              onChangeText={setAssistantName}
              autoCapitalize="words"
              style={styles.customNameInput}
            />
            <Icon name="check" size={20} color="#10b981" style={styles.checkIcon} />
          </View>
        </View>

        {/* Dynamic feedback */}
        {assistantName && assistantName.trim() && (
          <Text style={styles.feedbackText}>
            Great, I'll go by <Text style={styles.feedbackBold}>{assistantName}</Text>.
          </Text>
        )}
      </View>
    );
  };

  const renderStep2 = () => {
    const orbAvatars = [
      { color: '#3b82f6', pattern: 'dots', label: 'Blue Dots' },
      { color: '#8b5cf6', pattern: 'rings', label: 'Purple Rings' },
      { color: '#06b6d4', pattern: 'hexagon', label: 'Cyan Hexagon' },
      { color: '#10b981', pattern: 'triangle', label: 'Green Triangle' },
      { color: '#f59e0b', pattern: 'cross', label: 'Orange Cross' },
      { color: '#ef4444', pattern: 'diamond', label: 'Red Diamond' },
      { color: '#ec4899', pattern: 'star', label: 'Pink Star' },
      { color: '#6b7280', pattern: 'wave', label: 'Gray Wave' }
    ];

    // Set default if not set
    if (!orbColor) {
      setOrbColor(orbAvatars[0].color);
    }

    return (
      <View style={styles.stepContainer}>
        {/* Orb at top with selected color - matching web version */}
        <View style={styles.orbContainer}>
          <StartupOrb size="lg" intensity="normal" color={orbColor} />
        </View>

        {/* Title - Assistant name */}
        <Text style={styles.assistantNameTitle}>{assistantName || 'Assistant'}</Text>

        {/* Subtitle */}
        <Text style={styles.orbSubtitle}>Let's pick how I look.</Text>

        {/* Hint text */}
        <Text style={styles.orbHint}>You can change this anytime in Settings.</Text>

        {/* Color grid - 4x2 matching web version */}
        <View style={styles.orbAvatarGrid}>
          {orbAvatars.map((avatar) => {
            const isSelected = orbColor === avatar.color;
            return (
              <TouchableOpacity
                key={avatar.label}
                style={[
                  styles.orbAvatarButton,
                  isSelected && styles.orbAvatarButtonSelected,
                ]}
                onPress={() => setOrbColor(avatar.color)}>
                <View
                  style={[
                    styles.orbAvatarCircle,
                    { backgroundColor: avatar.color },
                  ]}
                />
                {isSelected && (
                  <View style={styles.orbAvatarCheckmark}>
                    <Icon name="check" size={14} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Feedback text */}
        <Text style={styles.orbFeedbackText}>This is me now. Like it?</Text>
      </View>
    );
  };

  const renderStep3 = () => {
    return (
      <View style={styles.step3Container}>
        {/* Orb at top - matching web version */}
        <View style={styles.orbContainer}>
          <StartupOrb size="lg" intensity="normal" color={orbColor} />
        </View>

        {/* Title */}
        <Text style={styles.servicesTitle}>
          {selectedCategory && selectedCategory !== '✨ Other'
            ? selectedCategory
            : selectedCategory === '✨ Other'
              ? 'Describe your service'
              : 'What kind of services do you provide?'}
        </Text>

        {/* Instructions */}
        <Text style={styles.servicesInstructions}>
          {selectedCategory
            ? `Choose up to 3 to start (${selectedServices.length}/3)`
            : 'Choose up to 3 services to start with.'}
        </Text>

        {/* Help Section */}
        {!selectedCategory && (
          <TouchableOpacity
            onPress={() => setShowServiceHelp(!showServiceHelp)}
            style={styles.helpButton}>
            <Text style={styles.helpButtonText}><Icon name="information-outline" size={16} /> I don't know what type of services I provide</Text>
          </TouchableOpacity>
        )}

        {/* Search bar */}
        {!selectedCategory && (
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color="#9ca3af" style={styles.searchIcon} />
            <Input
              placeholder="Search categories..."
              value={serviceSearchQuery}
              onChangeText={setServiceSearchQuery}
              style={styles.searchInput}
            />
          </View>
        )}

        {selectedCategory && selectedCategory !== '✨ Other' && (
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color="#9ca3af" style={styles.searchIcon} />
            <Input
              placeholder="Search services..."
              value={serviceSearchQuery}
              onChangeText={setServiceSearchQuery}
              style={styles.searchInput}
            />
          </View>
        )}

        {/* Selected services chips */}
        {selectedServices.length > 0 && (
          <View style={styles.selectedServicesContainer}>
            <Text style={styles.selectedServicesLabel}>
              Selected ({selectedServices.length}/3):
            </Text>
            <View style={styles.selectedServicesChips}>
              {selectedServices.map((service) => (
                <View key={service} style={styles.serviceChip}>
                  <Text style={styles.serviceChipText}>{service}</Text>
                  <TouchableOpacity
                    onPress={() => handleServiceToggle(service)}
                    style={styles.serviceChipRemove}>
                    <Icon name="close" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Back button when viewing category services */}
        {selectedCategory && (
          <TouchableOpacity
            onPress={() => {
              setSelectedCategory(null);
              setServiceSearchQuery('');
            }}
            style={styles.backToCategoriesButton}>
            <Text style={styles.backToCategoriesText}><Icon name="arrow-left" size={16} /> Back to categories</Text>
          </TouchableOpacity>
        )}

        {/* Grid of categories or services - Scrollable */}
        <ScrollView
          style={styles.servicesScrollView}
          contentContainerStyle={styles.servicesScrollContent}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          bounces={true}>
          <View style={styles.servicesGrid}>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const isCategory = !selectedCategory;
                const isSelected = selectedServices.includes(item);

                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.serviceItemButton,
                      isSelected && styles.serviceItemButtonSelected,
                    ]}
                    onPress={() => {
                      if (isCategory) {
                        // Clicking a category - show its services
                        setSelectedCategory(item);
                        setServiceSearchQuery('');
                      } else {
                        // Clicking a service - toggle selection
                        handleServiceToggle(item);
                      }
                    }}>
                    <Text
                      style={[
                        styles.serviceItemText,
                        isSelected && styles.serviceItemTextSelected,
                        isCategory && styles.serviceCategoryText,
                      ]}>
                      {item}
                    </Text>
                    {isCategory && (
                      <Icon name="chevron-right" size={20} color="#9ca3af" />
                    )}
                    {!isCategory && isSelected && (
                      <Icon name="check" size={20} color="#10b981" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.noResultsText}>
                {serviceSearchQuery.trim()
                  ? 'No results found. Try a different search term.'
                  : 'No services available.'}
              </Text>
            )}
          </View>
        </ScrollView>

        {/* Custom service input for "Other" */}
        {selectedCategory === '✨ Other' && (
          <View style={styles.customServiceContainer}>
            <Text style={styles.customServiceLabel}>Type your custom service below:</Text>
            <View style={styles.customServiceInputRow}>
              <Input
                placeholder="e.g., Mobile Car Detailing..."
                value={customServiceInput}
                onChangeText={setCustomServiceInput}
                style={styles.customServiceInput}
                onSubmitEditing={() => {
                  if (customServiceInput.trim().length >= 2) {
                    addCustomService(customServiceInput.trim());
                  }
                }}
                autoFocus
              />
              {customServiceInput.trim().length >= 2 && (
                <TouchableOpacity
                  onPress={() => addCustomService(customServiceInput.trim())}
                  style={styles.addServiceButton}>
                  <Text style={styles.addServiceButtonText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Learn more section */}
        <TouchableOpacity
          onPress={() => setShowEnhancedCustomization(!showEnhancedCustomization)}
          style={[styles.learnMoreContainer, { borderColor: `${orbColor}66` }]}>
          <View style={styles.learnMoreHeader}>
            <View style={[styles.learnMoreIcon, { backgroundColor: `${orbColor}4D` }]}>
              <Icon name="sparkles" size={16} color={orbColor} />
            </View>
            <Text style={[styles.learnMoreText, { color: orbColor }]}>Learn more about this</Text>
            <Icon
              name={showEnhancedCustomization ? "chevron-down" : "chevron-right"}
              size={20}
              color={orbColor}
            />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep4 = () => {
    const addBaseLocation = () => {
      if (newBaseLocation.trim() && newBaseCity.trim() && newBaseZipCode.trim() && newBaseNickname.trim()) {
        const newBase = {
          id: Date.now().toString(),
          address: newBaseLocation.trim(),
          city: newBaseCity.trim(),
          zipCode: newBaseZipCode.trim(),
          nickname: newBaseNickname.trim(),
        };
        setBaseLocations([newBase]);
        setNewBaseLocation('');
        setNewBaseCity('');
        setNewBaseZipCode('');
        setNewBaseNickname('');
      }
    };

    const editBaseLocation = () => {
      const existingBase = baseLocations[0];
      if (existingBase) {
        setNewBaseLocation(existingBase.address);
        setNewBaseCity(existingBase.city);
        setNewBaseZipCode(existingBase.zipCode);
        setNewBaseNickname(existingBase.nickname);
        setBaseLocations([]);
      }
    };

    const removeBaseLocation = () => {
      setBaseLocations([]);
    };

    const getCurrentLocation = () => {
      // Mock getting current location
      setNewBaseLocation('Rua da Liberdade, 123');
      setNewBaseCity('Lisboa');
      setNewBaseZipCode('1250-146');
    };

    const addCitySelection = (city: string) => {
      if (!selectedCities.includes(city)) {
        setSelectedCities(prev => [...prev, city]);
      }
    };

    const removeCitySelection = (city: string) => {
      setSelectedCities(prev => prev.filter(c => c !== city));
    };

    return (
      <View style={styles.stepContainer}>
        {/* Orb at top */}
        <View style={styles.orbContainer}>
          <StartupOrb size="lg" intensity="normal" color={orbColor} />
        </View>

        {/* Title */}
        <Text style={styles.servicesTitle}>Where's your base and how far do you travel?</Text>
        <Text style={styles.servicesInstructions}>
          Your base and coverage radius help us match you with the right jobs.
        </Text>

        <ScrollView
          style={styles.step4ScrollView}
          contentContainerStyle={styles.step4ScrollContent}
          showsVerticalScrollIndicator={true}>

          {/* Base Address Section */}
          <View style={styles.baseSection}>
            <Label style={styles.sectionLabel}>Base Address</Label>

            {/* Existing base location */}
            {baseLocations.length > 0 && (
              <View style={styles.existingBaseContainer}>
                <View style={styles.existingBaseCard}>
                  <View style={styles.existingBaseInfo}>
                    <Text style={styles.existingBaseNickname}>{baseLocations[0].nickname}</Text>
                    <Text style={styles.existingBaseAddress}>
                      {baseLocations[0].address}, {baseLocations[0].zipCode} {baseLocations[0].city}
                    </Text>
                  </View>
                  <View style={styles.existingBaseActions}>
                    <TouchableOpacity onPress={editBaseLocation} style={styles.editButton}>
                      <Icon name="pencil" size={16} color="#4b5563" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={removeBaseLocation} style={styles.removeButton}>
                      <Icon name="close" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Add base location form */}
            {baseLocations.length === 0 && (
              <View style={styles.addBaseForm}>
                <Input
                  placeholder="Nickname (e.g., Main Office)"
                  value={newBaseNickname}
                  onChangeText={setNewBaseNickname}
                  style={styles.baseInput}
                />

                <View style={styles.addressRow}>
                  <View style={styles.addressInputWrapper}>
                    <Icon name="map-marker" size={18} color="#9ca3af" style={styles.mapPinIcon} />
                    <Input
                      placeholder="Street address"
                      value={newBaseLocation}
                      onChangeText={setNewBaseLocation}
                      style={[styles.baseInput, styles.addressInput]}
                    />
                  </View>
                  <TouchableOpacity onPress={getCurrentLocation} style={styles.locationButton}>
                    <Icon name="crosshairs-gps" size={18} color={orbColor} />
                  </TouchableOpacity>
                </View>

                <View style={styles.zipCityRow}>
                  <Input
                    placeholder="ZIP Code"
                    value={newBaseZipCode}
                    onChangeText={setNewBaseZipCode}
                    style={[styles.baseInput, styles.halfWidth]}
                  />
                  <Input
                    placeholder="City"
                    value={newBaseCity}
                    onChangeText={setNewBaseCity}
                    style={[styles.baseInput, styles.halfWidth]}
                  />
                </View>

                <Button
                  title="Add"
                  onPress={addBaseLocation}
                  disabled={!newBaseLocation.trim() || !newBaseCity.trim() || !newBaseZipCode.trim() || !newBaseNickname.trim()}
                  style={styles.addBaseButton}
                  textStyle={styles.addBaseButtonText}
                />
              </View>
            )}
          </View>

          {/* Coverage Options */}
          <View style={styles.coverageSection}>
            <Label style={styles.sectionLabel}>How far do you travel?</Label>

            {/* Coverage Mode Toggle */}
            <View style={styles.coverageModeToggle}>
              <TouchableOpacity
                onPress={() => setCoverageMode('distance')}
                style={[
                  styles.coverageModeButton,
                  coverageMode === 'distance' && styles.coverageModeButtonActive,
                ]}>
                <Text
                  style={[
                    styles.coverageModeText,
                    coverageMode === 'distance' && styles.coverageModeTextActive,
                  ]}>
                  By distance
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCoverageMode('city')}
                style={[
                  styles.coverageModeButton,
                  coverageMode === 'city' && styles.coverageModeButtonActive,
                ]}>
                <Text
                  style={[
                    styles.coverageModeText,
                    coverageMode === 'city' && styles.coverageModeTextActive,
                  ]}>
                  By city
                </Text>
              </TouchableOpacity>
            </View>

            {/* Distance Mode */}
            {coverageMode === 'distance' && (
              <View style={styles.distanceModeContainer}>
                {!hasUnlimitedCoverage && (
                  <View style={styles.distanceSliderContainer}>
                    <View style={styles.distanceHeader}>
                      <Text style={styles.distanceLabel}>Travel Distance:</Text>
                      <View style={styles.distanceValueContainer}>
                        <Text style={[styles.distanceValue, { color: orbColor }]}>
                          {coverageRadius}
                        </Text>
                        <Text style={styles.distanceUnit}>km</Text>
                      </View>
                    </View>

                    {/* Simple Slider using buttons */}
                    <View style={styles.sliderContainer}>
                      <View style={styles.sliderTrack}>
                        <View
                          style={[
                            styles.sliderFill,
                            { width: `${((coverageRadius - 5) / 95) * 100}%`, backgroundColor: orbColor },
                          ]}
                        />
                        <View
                          style={[
                            styles.sliderThumb,
                            { left: `${((coverageRadius - 5) / 95) * 100}%`, backgroundColor: orbColor },
                          ]}
                        />
                      </View>
                      <View style={styles.sliderMarkers}>
                        <Text style={styles.sliderMarkerText}>5 km</Text>
                        <Text style={styles.sliderMarkerText}>50 km</Text>
                        <Text style={styles.sliderMarkerText}>100 km</Text>
                      </View>
                    </View>

                    {/* Distance adjustment buttons */}
                    <View style={styles.distanceButtons}>
                      {[5, 10, 15, 20, 30, 50, 100].map((value) => (
                        <TouchableOpacity
                          key={value}
                          onPress={() => setCoverageRadius(value)}
                          style={[
                            styles.distanceButton,
                            coverageRadius === value && { backgroundColor: orbColor + '20', borderColor: orbColor },
                          ]}>
                          <Text
                            style={[
                              styles.distanceButtonText,
                              coverageRadius === value && { color: orbColor },
                            ]}>
                            {value}km
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Unlimited checkbox */}
                <TouchableOpacity
                  onPress={() => setHasUnlimitedCoverage(!hasUnlimitedCoverage)}
                  style={styles.unlimitedContainer}>
                  <View style={[
                    styles.checkboxContainer,
                    hasUnlimitedCoverage && { backgroundColor: orbColor, borderColor: orbColor }
                  ]}>
                    {hasUnlimitedCoverage && (
                      <Text style={[styles.checkboxChecked, { color: '#f3f4f6' }]}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.unlimitedLabel}>Unlimited / Remote work</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* City Mode */}
            {coverageMode === 'city' && (
              <View style={styles.cityModeContainer}>
                <Text style={styles.cityModeLabel}>
                  Select areas in Greater Lisbon where you want to work:
                </Text>

                {/* Selected cities */}
                {selectedCities.length > 0 && (
                  <View style={styles.selectedCitiesContainer}>
                    {selectedCities.map((city) => (
                      <View key={city} style={[styles.cityChip, { backgroundColor: orbColor + '20' }]}>
                        <Text style={[styles.cityChipText, { color: orbColor }]}>{city}</Text>
                        <TouchableOpacity
                          onPress={() => removeCitySelection(city)}
                          style={styles.cityChipRemove}>
                          <Text style={styles.cityChipRemoveText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* City selection grid */}
                <ScrollView
                  style={styles.citiesScrollView}
                  contentContainerStyle={styles.citiesScrollContent}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}>
                  <View style={styles.citiesSection}>
                    <Text style={styles.citiesSectionTitle}>🏛️ Central Lisbon</Text>
                    <View style={styles.citiesGrid}>
                      {['Lisboa', 'Oeiras', 'Amadora', 'Odivelas'].map((city) => (
                        <TouchableOpacity
                          key={city}
                          onPress={() => selectedCities.includes(city) ? removeCitySelection(city) : addCitySelection(city)}
                          style={[
                            styles.cityButton,
                            selectedCities.includes(city) && { backgroundColor: orbColor, borderColor: orbColor },
                          ]}>
                          <Text
                            style={[
                              styles.cityButtonText,
                              selectedCities.includes(city) && styles.cityButtonTextSelected,
                            ]}>
                            {city}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.citiesSection}>
                    <Text style={styles.citiesSectionTitle}>🌊 South Bank</Text>
                    <View style={styles.citiesGrid}>
                      {['Almada', 'Seixal', 'Barreiro', 'Moita', 'Montijo', 'Alcochete'].map((city) => (
                        <TouchableOpacity
                          key={city}
                          onPress={() => selectedCities.includes(city) ? removeCitySelection(city) : addCitySelection(city)}
                          style={[
                            styles.cityButton,
                            selectedCities.includes(city) && { backgroundColor: orbColor, borderColor: orbColor },
                          ]}>
                          <Text
                            style={[
                              styles.cityButtonText,
                              selectedCities.includes(city) && styles.cityButtonTextSelected,
                            ]}>
                            {city}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.citiesSection}>
                    <Text style={styles.citiesSectionTitle}>🏔️ Sintra & Cascais</Text>
                    <View style={styles.citiesGrid}>
                      {['Sintra', 'Cascais', 'Mafra', 'Torres Vedras'].map((city) => (
                        <TouchableOpacity
                          key={city}
                          onPress={() => selectedCities.includes(city) ? removeCitySelection(city) : addCitySelection(city)}
                          style={[
                            styles.cityButton,
                            selectedCities.includes(city) && { backgroundColor: orbColor, borderColor: orbColor },
                          ]}>
                          <Text
                            style={[
                              styles.cityButtonText,
                              selectedCities.includes(city) && styles.cityButtonTextSelected,
                            ]}>
                            {city}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.citiesSection}>
                    <Text style={styles.citiesSectionTitle}>🔗 North Extension</Text>
                    <View style={styles.citiesGrid}>
                      {['Loures', 'Vila Franca de Xira', 'Arruda dos Vinhos', 'Alenquer'].map((city) => (
                        <TouchableOpacity
                          key={city}
                          onPress={() => selectedCities.includes(city) ? removeCitySelection(city) : addCitySelection(city)}
                          style={[
                            styles.cityButton,
                            selectedCities.includes(city) && { backgroundColor: orbColor, borderColor: orbColor },
                          ]}>
                          <Text
                            style={[
                              styles.cityButtonText,
                              selectedCities.includes(city) && styles.cityButtonTextSelected,
                            ]}>
                            {city}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.citiesSection}>
                    <Text style={styles.citiesSectionTitle}>❓❓❓❓ Setúbal Peninsula</Text>
                    <View style={styles.citiesGrid}>
                      {['Setúbal', 'Palmela', 'Sesimbra', 'Grândola'].map((city) => (
                        <TouchableOpacity
                          key={city}
                          onPress={() => selectedCities.includes(city) ? removeCitySelection(city) : addCitySelection(city)}
                          style={[
                            styles.cityButton,
                            selectedCities.includes(city) && { backgroundColor: orbColor, borderColor: orbColor },
                          ]}>
                          <Text
                            style={[
                              styles.cityButtonText,
                              selectedCities.includes(city) && styles.cityButtonTextSelected,
                            ]}>
                            {city}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </ScrollView>

                <Text style={styles.cityModeHint}>
                  💡 Select multiple areas to maximize your job opportunities across Greater Lisbon
                </Text>
              </View>
            )}
          </View>

          {/* Learn more section */}
          <TouchableOpacity
            onPress={() => setShowCoverageInfo(!showCoverageInfo)}
            style={styles.learnMoreButton}>
            <Text style={styles.learnMoreButtonText}>
              Learn more about how this works...
            </Text>
            <Text style={styles.learnMoreChevron}>{showCoverageInfo ? '⌄' : '›'}</Text>
          </TouchableOpacity>

          {showCoverageInfo && (
            <View style={styles.coverageInfoContainer}>
              <Text style={styles.coverageInfoText}>
                Define your coverage by radius or by city. Choosing specific cities helps us send you more accurate jobs. You can adjust this anytime in your profile.
              </Text>
              <Text style={styles.coverageInfoText}>
                trego will automatically triangulate your active jobs, offer you opportunities in between them, and provide time estimates so you can maximize your workload while keeping your provider status elevated.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderStep5 = () => {
    return (
      <WorkingHoursScreen
        orbColor={orbColor}
        onBack={handleBack}
        onContinue={(hours) => {
          setWorkingHours(hours);
          handleNext();
        }}
        initialWorkingHours={workingHours || undefined}
      />
    );
  };

  const renderStep6 = () => {
    return (
      <PersonalInformationScreen
        orbColor={orbColor}
        onBack={handleBack}
        onContinue={(info) => {
          setPersonalInfo(info);
          handleNext();
        }}
        initialData={personalInfo || undefined}
      />
    );
  };

  const renderStep7 = () => {
    // Get base location from step 4
    const primaryBase = baseLocations && baseLocations.length > 0 ? baseLocations[0] : undefined;

    return (
      <BillingInformationScreen
        orbColor={orbColor}
        onBack={handleBack}
        onContinue={(info) => {
          setBillingInfo(info);
          handleNext();
        }}
        personalInfo={personalInfo ? {
          firstName: personalInfo.firstName,
          lastName: personalInfo.lastName,
          vatNif: personalInfo.vatNif,
        } : undefined}
        baseLocation={primaryBase ? {
          address: primaryBase.address,
          city: primaryBase.city,
          zipCode: primaryBase.zipCode,
        } : undefined}
      />
    );
  };

  const renderStep8 = () => {
    return (
      <CalendarSyncScreen
        orbColor={orbColor}
        onBack={handleBack}
        onContinue={(data) => {
          setCalendarSync(data);
          handleNext();
        }}
      />
    );
  };

  const renderStep9 = () => {
    // Complete Setup screen - shows success animation
    return (
      <CompleteSetupScreen
        orbColor={orbColor}
        firstName={personalInfo?.firstName || 'Provider'}
        assistantName={assistantName || 'Bolt'}
        onComplete={handleComplete}
      />
    );
  };

  const renderContent = () => {
    switch (currentStep) {
      case 0:
        return renderStep0();
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      case 7:
        return renderStep7();
      case 8:
        return renderStep8();
      case 9:
        return renderStep9();
      default:
        return renderStep0();
    }
  };

  const progress = ((currentStep + 1) / 10) * 100;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Background gradient - matching web version */}
      <View style={styles.backgroundGradient} />

      {/* Subtle decorative dots - matching web version */}
      <View style={styles.decorativeDot1} />
      <View style={styles.decorativeDot2} />
      <View style={styles.decorativeDot3} />

      {/* Hide header for step 0 to match web version */}
      {currentStep > 0 && (
        <View style={styles.header}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%`, backgroundColor: orbColor },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            Step {currentStep + 1} of 10
          </Text>
        </View>
      )}

      {currentStep === 5 || currentStep === 6 || currentStep === 7 || currentStep === 8 || currentStep === 9 ? (
        renderContent()
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}>
            {renderContent()}
          </ScrollView>

          <View style={styles.footer}>
            {currentStep > 0 ? (
              <TouchableOpacity
                onPress={handleBack}
                style={styles.backButtonTouchable}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.backButtonTouchable} /> // Spacer when no back button
            )}
            <Button
              title={(currentStep as number) === 0 ? 'Continue' : (currentStep as number) === 9 ? 'Complete Setup' : 'Continue'}
              onPress={handleNext}
              disabled={!canProceed()}
              style={[styles.nextButton, currentStep === 0 && styles.nextButtonFullWidth]}
              textStyle={styles.nextButtonText}
            />
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0a0a', // Dark background matching web version (oklch(0.145 0 0))
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.muted,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 160, // Extra padding to prevent content from being hidden behind footer (80px footer + 80px spacing)
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'flex-start', // Changed from center to allow scrolling
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  step3Container: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 100, // Extra padding for footer (footer is now at bottom: 0 with padding)
  },
  orbContainer: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInputContainer: {
    width: '100%',
    maxWidth: 260,
    alignItems: 'center',
    marginBottom: 16,
  },
  nameLabel: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 14,
    color: '#f3f4f6', // Light text for dark theme
  },
  inputWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  userIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
    fontSize: 16,
    color: Colors.mutedForeground,
  },
  nameInput: {
    paddingLeft: 40,
    paddingRight: 40,
    textAlign: 'center',
    height: 44, // h-11 matching web
    backgroundColor: '#374151', // bg-input-background in dark mode
    borderColor: '#4b5563', // border-border in dark mode
    color: '#f3f4f6', // Light text
  },
  checkIcon: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
    fontSize: 16,
    color: '#10b981',
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 12,
    color: '#9ca3af', // text-muted-foreground for dark theme
    textAlign: 'center',
    paddingHorizontal: 0,
    maxWidth: 400,
    lineHeight: 18,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconEmoji: {
    fontSize: 40,
  },
  stepTitle: {
    fontSize: 20, // text-xl matching web
    fontWeight: '600',
    color: '#f3f4f6', // Light text for dark theme
    textAlign: 'center',
    marginBottom: 12, // mb-3 matching web
  },
  stepDescription: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  inputGroup: {
    width: '100%',
    gap: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: Colors.foreground,
    transform: [{ scale: 1.1 }],
  },
  colorCheckmark: {
    fontSize: 24,
    color: Colors.primaryForeground,
    fontWeight: 'bold',
  },
  colorName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
  },
  serviceOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  serviceOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.foreground,
  },
  hint: {
    fontSize: 12,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0, // Fixed at bottom
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32, // Extra bottom padding for safe area
    alignItems: 'center',
    justifyContent: 'space-between', // Back on left, Continue on right
    gap: 12,
    backgroundColor: '#0a0a0a', // Match background to prevent transparency issues
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)', // Subtle border
    zIndex: 50,
  },
  backButton: {
    flex: 1,
    maxWidth: 150,
  },
  backButtonTouchable: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: '#9ca3af', // text-muted-foreground
  },
  nextButton: {
    flex: 1, // Flex to take available space when back button exists
    maxWidth: 384, // max-w-sm matching web
    height: 48, // h-12 matching web
    borderRadius: 24, // rounded-2xl matching web
    backgroundColor: '#374151', // Dark gray button matching web (bg-primary in dark = dark gray)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonFullWidth: {
    maxWidth: '100%', // Full width when no back button
  },
  nextButtonText: {
    color: '#f3f4f6', // White text for dark button
    fontSize: 16, // text-base matching web
    fontWeight: '500',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a', // Dark background
    // Gradient effect simulated with subtle overlay
  },
  decorativeDot1: {
    position: 'absolute',
    top: '25%',
    left: 32,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(96, 165, 250, 0.3)', // bg-blue-400/30
  },
  decorativeDot2: {
    position: 'absolute',
    bottom: '33%',
    left: 64,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.5)', // bg-blue-500/50
  },
  decorativeDot3: {
    position: 'absolute',
    bottom: '25%',
    right: 32,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(103, 232, 249, 0.35)', // bg-cyan-300/35
  },
  greetingMessage: {
    fontSize: 16,
    color: '#9ca3af', // text-muted-foreground
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
    minHeight: 48, // Reserve space to prevent layout shift
  },
  cursor: {
    color: '#9ca3af',
    opacity: 1,
  },
  presetNamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 300,
    marginBottom: 24,
  },
  presetNameButton: {
    width: '45%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563', // border-border in dark
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetNameButtonSelected: {
    backgroundColor: '#374151', // bg-primary in dark
    borderColor: '#374151',
  },
  presetNameText: {
    fontSize: 14,
    color: '#f3f4f6', // text-foreground
    fontWeight: '500',
  },
  presetNameTextSelected: {
    color: '#f3f4f6', // text-primary-foreground
  },
  customNameContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    marginBottom: 16,
  },
  customNameLabel: {
    fontSize: 14,
    color: '#f3f4f6',
    textAlign: 'center',
    marginBottom: 8,
  },
  customInputWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  customNameInput: {
    width: '100%',
    textAlign: 'center',
    height: 44,
    backgroundColor: '#374151',
    borderColor: '#4b5563',
    color: '#f3f4f6',
  },
  feedbackText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  feedbackBold: {
    fontWeight: 'bold',
    color: '#f3f4f6',
  },
  assistantNameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f3f4f6', // text-black in dark mode = light text
    textAlign: 'center',
    marginBottom: 12,
  },
  orbSubtitle: {
    fontSize: 16,
    color: '#9ca3af', // text-muted-foreground
    textAlign: 'center',
    marginBottom: 8,
  },
  orbHint: {
    fontSize: 12,
    color: '#9ca3af', // text-muted-foreground
    textAlign: 'center',
    marginBottom: 24,
  },
  orbAvatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 320,
    marginBottom: 16,
  },
  orbAvatarButton: {
    width: 70,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4b5563', // border-border
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    position: 'relative',
  },
  orbAvatarButtonSelected: {
    borderColor: '#374151', // border-primary
    backgroundColor: 'rgba(55, 65, 81, 0.1)', // bg-primary/10
  },
  orbAvatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  orbAvatarCheckmark: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#374151', // bg-primary
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbAvatarCheckmarkText: {
    fontSize: 10,
    color: '#f3f4f6', // text-primary-foreground
    fontWeight: 'bold',
  },
  orbFeedbackText: {
    fontSize: 14,
    color: '#9ca3af', // text-muted-foreground
    textAlign: 'center',
    marginTop: 8,
  },
  servicesTitle: {
    fontSize: 18, // text-lg matching web
    fontWeight: '600',
    color: '#f3f4f6',
    textAlign: 'center',
    marginBottom: 4,
  },
  servicesInstructions: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 12,
  },
  helpButton: {
    alignItems: 'center',
    marginBottom: 12,
  },
  helpButtonText: {
    fontSize: 12,
    color: '#0088cc', // text-primary
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 8,
    width: '100%',
    maxWidth: 400,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
    fontSize: 14,
  },
  searchInput: {
    paddingLeft: 36,
    height: 36, // h-9 matching web
    fontSize: 14,
    width: '100%',
  },
  selectedServicesContainer: {
    width: '100%',
    marginBottom: 8,
  },
  selectedServicesLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
  },
  selectedServicesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(55, 65, 81, 0.1)', // bg-primary/10
    borderRadius: 12,
    gap: 6,
  },
  serviceChipText: {
    fontSize: 12,
    color: '#0088cc', // text-primary
  },
  serviceChipRemove: {
    padding: 2,
  },
  serviceChipRemoveText: {
    fontSize: 16,
    color: '#0088cc',
    fontWeight: 'bold',
  },
  backToCategoriesButton: {
    marginBottom: 8,
  },
  backToCategoriesText: {
    fontSize: 12,
    color: '#0088cc',
  },
  servicesScrollView: {
    width: '100%',
    maxHeight: 450, // Fixed height to ensure scrolling works
    minHeight: 200,
  },
  servicesScrollContent: {
    paddingBottom: 50, // Extra padding for scrolling
    flexGrow: 0, // Don't grow, just scroll
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  serviceItemButton: {
    width: '48%',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563', // border-border
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceItemButtonSelected: {
    backgroundColor: 'rgba(55, 65, 81, 0.1)', // bg-primary/10
    borderColor: '#0088cc', // border-primary
  },
  serviceItemText: {
    fontSize: 14,
    color: '#f3f4f6',
    flex: 1,
  },
  serviceItemTextSelected: {
    color: '#0088cc', // text-primary
  },
  serviceCategoryText: {
    fontWeight: '500',
  },
  chevronIcon: {
    fontSize: 16,
    color: '#9ca3af',
  },
  customServiceContainer: {
    width: '100%',
    padding: 12,
    backgroundColor: 'rgba(55, 65, 81, 0.1)', // bg-muted/30
    borderRadius: 8,
    marginTop: 8,
  },
  customServiceLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  customServiceInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  customServiceInput: {
    flex: 1,
    height: 36,
  },
  addServiceButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0088cc', // bg-primary
    borderRadius: 8,
  },
  addServiceButtonText: {
    fontSize: 12,
    color: '#f3f4f6', // text-primary-foreground
    fontWeight: '500',
  },
  learnMoreContainer: {
    marginTop: 16,
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: 'rgba(0, 136, 204, 0.08)', // bg with orbColor opacity
  },
  learnMoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  learnMoreIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  learnMoreIconText: {
    fontSize: 12,
  },
  learnMoreText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  learnMoreChevron: {
    fontSize: 16,
  },
  noResultsText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    padding: 20,
    width: '100%',
  },
  // Step 4: Base Location & Coverage styles
  step4ScrollView: {
    flex: 1,
    width: '100%',
  },
  step4ScrollContent: {
    paddingBottom: 120,
  },
  baseSection: {
    width: '100%',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#f3f4f6',
    marginBottom: 12,
    fontWeight: '500',
  },
  existingBaseContainer: {
    marginBottom: 12,
  },
  existingBaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'rgba(55, 65, 81, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  existingBaseInfo: {
    flex: 1,
  },
  existingBaseNickname: {
    fontSize: 12,
    fontWeight: '500',
    color: '#f3f4f6',
    marginBottom: 4,
  },
  existingBaseAddress: {
    fontSize: 12,
    color: '#9ca3af',
  },
  existingBaseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  editButtonText: {
    fontSize: 16,
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 20,
    color: '#ef4444',
  },
  addBaseForm: {
    padding: 14,
    backgroundColor: 'rgba(55, 65, 81, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
    gap: 12,
  },
  baseInput: {
    height: 44,
    backgroundColor: '#374151',
    borderColor: '#4b5563',
    color: '#f3f4f6',
    fontSize: 14,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addressInputWrapper: {
    flex: 1,
    position: 'relative',
  },
  mapPinIcon: {
    position: 'absolute',
    left: 12,
    top: 14,
    zIndex: 1,
    fontSize: 16,
  },
  addressInput: {
    paddingLeft: 40,
  },
  locationButton: {
    width: 44,
    height: 44,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButtonText: {
    fontSize: 18,
  },
  zipCityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  halfWidth: {
    flex: 1,
  },
  addBaseButton: {
    height: 40,
    backgroundColor: '#0088cc',
  },
  addBaseButtonText: {
    color: '#f3f4f6',
    fontSize: 14,
  },
  coverageSection: {
    width: '100%',
    marginBottom: 24,
  },
  coverageModeToggle: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    backgroundColor: 'rgba(55, 65, 81, 0.3)',
    borderRadius: 8,
    marginBottom: 12,
  },
  coverageModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  coverageModeButtonActive: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  coverageModeText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  coverageModeTextActive: {
    color: '#f3f4f6',
    fontWeight: '500',
  },
  distanceModeContainer: {
    gap: 12,
  },
  distanceSliderContainer: {
    padding: 14,
    backgroundColor: 'rgba(55, 65, 81, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  distanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  distanceLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  distanceValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  distanceValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  distanceUnit: {
    fontSize: 14,
    color: '#9ca3af',
  },
  sliderContainer: {
    marginBottom: 8,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#4b5563',
    borderRadius: 2,
    position: 'relative',
    marginBottom: 8,
  },
  sliderFill: {
    height: '100%',
    borderRadius: 2,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    top: -8,
    borderWidth: 2,
    borderColor: '#f3f4f6',
  },
  sliderMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderMarkerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  distanceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  distanceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4b5563',
    backgroundColor: 'transparent',
  },
  distanceButtonText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  unlimitedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 8,
  },
  checkboxContainer: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: '#9ca3af',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  unlimitedLabel: {
    fontSize: 14,
    color: '#f3f4f6',
    flex: 1,
  },
  cityModeContainer: {
    gap: 12,
  },
  cityModeLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  selectedCitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cityChipRemove: {
    padding: 2,
  },
  cityChipRemoveText: {
    fontSize: 16,
    color: '#ef4444',
  },
  citiesScrollView: {
    maxHeight: 500,
    marginBottom: 8,
  },
  citiesScrollContent: {
    paddingBottom: 16,
  },
  citiesSection: {
    marginBottom: 16,
  },
  citiesSectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9ca3af',
    marginBottom: 8,
  },
  citiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    width: '100%',
  },
  cityButton: {
    width: '48%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4b5563',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityButtonText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  cityButtonTextSelected: {
    color: '#f3f4f6',
    fontWeight: '500',
  },
  cityModeHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  learnMoreButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(55, 65, 81, 0.3)',
    borderRadius: 8,
    marginTop: 8,
  },
  learnMoreButtonText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  coverageInfoContainer: {
    padding: 12,
    backgroundColor: 'rgba(55, 65, 81, 0.2)',
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  coverageInfoText: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 18,
  },
});
