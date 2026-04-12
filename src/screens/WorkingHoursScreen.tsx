/**
 * Working Hours Screen
 * Exact match with web version - Set your working hours
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { StartupOrb } from '../components/StartupOrb';
import { Button } from '../components/ui/Button';
import { Colors } from '../shared/constants/colors';
import { WorkingHoursConfirmationModal } from '../components/modals/WorkingHoursConfirmationModal';
import { useTranslation } from 'react-i18next';

export interface TimeBlock {
  id: string;
  start: string;
  end: string;
}

export interface DaySchedule {
  active: boolean;
  blocks: TimeBlock[];
  hasLunchBreak: boolean;
  lunchStart: string;
  lunchEnd: string;
}

export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface WorkingHoursScreenProps {
  orbColor?: string;
  onBack: () => void;
  onContinue: (workingHours: WorkingHours) => void;
  initialWorkingHours?: WorkingHours;
}

const DAY_KEYS = [
  { key: 'monday' as keyof WorkingHours, short: 'M', longKey: 'mondayLong' },
  { key: 'tuesday' as keyof WorkingHours, short: 'T', longKey: 'tuesdayLong' },
  { key: 'wednesday' as keyof WorkingHours, short: 'W', longKey: 'wednesdayLong' },
  { key: 'thursday' as keyof WorkingHours, short: 'T', longKey: 'thursdayLong' },
  { key: 'friday' as keyof WorkingHours, short: 'F', longKey: 'fridayLong' },
  { key: 'saturday' as keyof WorkingHours, short: 'S', longKey: 'saturdayLong' },
  { key: 'sunday' as keyof WorkingHours, short: 'S', longKey: 'sundayLong' },
];

const QUICK_RANGE_KEYS = [
  { nameKey: 'morning', start: '08:00', end: '12:00' },
  { nameKey: 'afternoon', start: '12:00', end: '18:00' },
  { nameKey: 'evening', start: '18:00', end: '22:00' },
  { nameKey: 'twentyFourHours', start: '00:00', end: '24:00' },
];

const generateTimeOptions = () => {
  const times: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      times.push(timeString);
    }
  }
  times.push('24:00');
  return times;
};

const DEFAULT_DAY_SCHEDULE: DaySchedule = {
  active: false,
  blocks: [],
  hasLunchBreak: false,
  lunchStart: '12:00',
  lunchEnd: '13:00',
};

const createDefaultWorkingHours = (): WorkingHours => ({
  monday: { ...DEFAULT_DAY_SCHEDULE },
  tuesday: { ...DEFAULT_DAY_SCHEDULE },
  wednesday: { ...DEFAULT_DAY_SCHEDULE },
  thursday: { ...DEFAULT_DAY_SCHEDULE },
  friday: { ...DEFAULT_DAY_SCHEDULE },
  saturday: { ...DEFAULT_DAY_SCHEDULE },
  sunday: { ...DEFAULT_DAY_SCHEDULE },
});

export default function WorkingHoursScreen({
  orbColor = '#3b82f6',
  onBack,
  onContinue,
  initialWorkingHours,
}: WorkingHoursScreenProps) {
  const { t } = useTranslation();
  const DAYS = DAY_KEYS.map(d => ({ ...d, full: t(`days.${d.longKey}` as any) }));
  const QUICK_RANGES = QUICK_RANGE_KEYS.map(r => ({ ...r, name: t(`workingHours.${r.nameKey}` as any) }));
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    initialWorkingHours || createDefaultWorkingHours()
  );
  const [selectedDay, setSelectedDay] = useState<keyof WorkingHours>('monday');
  const [lastTap, setLastTap] = useState<{ day: keyof WorkingHours; time: number } | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const timeOptions = generateTimeOptions();
  const currentDaySchedule = workingHours[selectedDay];
  const opacity = useSharedValue(currentDaySchedule.active ? 1 : 0.3);

  // Update opacity when active state changes
  React.useEffect(() => {
    opacity.value = withTiming(currentDaySchedule.active ? 1 : 0.3, { duration: 300 });
  }, [currentDaySchedule.active]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleDayPress = (day: keyof WorkingHours) => {
    const now = Date.now();
    if (lastTap && lastTap.day === day && now - lastTap.time < 300) {
      // Double tap - toggle day
      toggleDay(day);
      setLastTap(null);
    } else {
      // Single tap - select day
      setSelectedDay(day);
      setLastTap({ day, time: now });
      setTimeout(() => setLastTap(null), 300);
    }
  };

  const toggleDay = (day: keyof WorkingHours) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        active: !prev[day].active,
        blocks: !prev[day].active ? [{ id: '1', start: '08:00', end: '18:00' }] : [],
      },
    }));
  };

  const addTimeBlock = (day: keyof WorkingHours) => {
    const newId = Date.now().toString();
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        blocks: [...prev[day].blocks, { id: newId, start: '08:00', end: '18:00' }],
      },
    }));
  };

  const removeTimeBlock = (day: keyof WorkingHours, blockId: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        blocks: prev[day].blocks.filter(block => block.id !== blockId),
      },
    }));
  };

  const updateTimeBlock = (
    day: keyof WorkingHours,
    blockId: string,
    field: 'start' | 'end',
    value: string
  ) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        blocks: prev[day].blocks.map(block =>
          block.id === blockId ? { ...block, [field]: value } : block
        ),
      },
    }));
  };

  const applyQuickRange = (day: keyof WorkingHours, range: { name: string; start: string; end: string }) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        active: true,
        blocks: [{ id: '1', start: range.start, end: range.end }],
      },
    }));
  };

  const toggleLunchBreak = (day: keyof WorkingHours) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        hasLunchBreak: !prev[day].hasLunchBreak,
      },
    }));
  };

  const updateLunchBreak = (
    day: keyof WorkingHours,
    field: 'lunchStart' | 'lunchEnd',
    value: string
  ) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const isValid = () => {
    return Object.values(workingHours).some(
      day =>
        day.active &&
        day.blocks.length > 0 &&
        day.blocks.some(block => block.start && block.end && block.start < block.end)
    );
  };

  const handleContinue = () => {
    if (isValid()) {
      setShowConfirmationModal(true);
    }
  };

  const handleConfirmHours = () => {
    setShowConfirmationModal(false);
    onContinue(workingHours);
  };

  const handleEditHours = () => {
    setShowConfirmationModal(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}>
        {/* Orb at top */}
        <View style={styles.orbContainer}>
          <StartupOrb size="lg" intensity="normal" color={orbColor} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('workingHours.title')}</Text>
          <Text style={styles.subtitle}>{t('workingHours.subtitle')}</Text>
        </View>

        {/* Day Selector */}
        <View style={styles.daySelectorContainer}>
          <View style={styles.dayButtonsRow}>
            {DAYS.map(day => {
              const isActive = workingHours[day.key].active;
              const isSelected = selectedDay === day.key;
              return (
                <TouchableOpacity
                  key={day.key}
                  onPress={() => handleDayPress(day.key)}
                  style={[
                    styles.dayButton,
                    isActive && { backgroundColor: orbColor, borderColor: orbColor },
                    isSelected && !isActive && { borderColor: orbColor, borderWidth: 2 },
                    isSelected && isActive && styles.dayButtonSelected,
                  ]}>
                  <Text
                    style={[
                      styles.dayButtonText,
                      isActive && styles.dayButtonTextActive,
                      !isActive && { color: orbColor },
                    ]}>
                    {day.short}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.daySelectorHint}>
            {t('workingHours.selectorHint')}
          </Text>
        </View>

        {/* Hours Configuration for Selected Day */}
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={[styles.hoursCard, { borderColor: `${orbColor}30` }]}>
          <View style={styles.hoursCardHeader}>
            <View style={styles.hoursCardTitleRow}>
              <Text style={styles.clockIcon}>🕐</Text>
              <Text style={styles.hoursCardTitle}>
                {t('workingHours.hoursLabel', { day: DAYS.find(d => d.key === selectedDay)?.full })}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => toggleDay(selectedDay)}
              style={[
                styles.activeButton,
                currentDaySchedule.active && { backgroundColor: orbColor, borderColor: orbColor },
                !currentDaySchedule.active && { borderColor: orbColor },
              ]}>
              <Text
                style={[
                  styles.activeButtonText,
                  currentDaySchedule.active && styles.activeButtonTextActive,
                  !currentDaySchedule.active && { color: orbColor },
                ]}>
                {currentDaySchedule.active ? t('workingHours.active') : t('workingHours.inactive')}
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.hoursContent, animatedStyle]}>
            {/* Quick Ranges */}
            <View style={styles.quickRangesContainer}>
              <Text style={styles.quickRangesLabel}>{t('workingHours.quickRanges')}</Text>
              <View style={styles.quickRangesRow}>
                {QUICK_RANGES.map(range => (
                  <TouchableOpacity
                    key={range.name}
                    onPress={() => applyQuickRange(selectedDay, range)}
                    style={[styles.quickRangeButton, { borderColor: orbColor }]}
                    disabled={!currentDaySchedule.active}>
                    <Text
                      style={[
                        styles.quickRangeButtonText,
                        { color: currentDaySchedule.active ? '#9ca3af' : '#4b5563' },
                      ]}>
                      {range.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Time Blocks */}
            <View style={styles.timeBlocksContainer}>
              {currentDaySchedule.active && currentDaySchedule.blocks.length > 0 ? (
                currentDaySchedule.blocks.map((block, index) => (
                  <View key={block.id} style={styles.timeBlockRow}>
                    <View style={styles.timeBlockSelectors}>
                      <View style={styles.timePickerContainer}>
                        <Text style={styles.timePickerDisplayText}>{block.start}</Text>
                        <Picker
                          selectedValue={block.start}
                          onValueChange={value => updateTimeBlock(selectedDay, block.id, 'start', value)}
                          style={styles.timePicker}
                          itemStyle={styles.timePickerItem}>
                          {timeOptions.map(time => (
                            <Picker.Item key={time} label={time} value={time} />
                          ))}
                        </Picker>
                      </View>
                      <Text style={styles.timeArrow}>→</Text>
                      <View style={styles.timePickerContainer}>
                        <Text style={styles.timePickerDisplayText}>{block.end}</Text>
                        <Picker
                          selectedValue={block.end}
                          onValueChange={value => updateTimeBlock(selectedDay, block.id, 'end', value)}
                          style={styles.timePicker}
                          itemStyle={styles.timePickerItem}>
                          {timeOptions.map(time => (
                            <Picker.Item key={time} label={time} value={time} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                    {currentDaySchedule.blocks.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeTimeBlock(selectedDay, block.id)}
                        style={styles.removeTimeBlockButton}>
                        <Text style={styles.removeTimeBlockText}>−</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : (
                <View style={[styles.timeBlockRow, styles.timeBlockRowDisabled]}>
                  <View style={styles.timeBlockSelectors}>
                    <View style={[styles.timePickerContainer, styles.timePickerDisabled]}>
                      <Text style={styles.timePickerDisabledText}>08:00</Text>
                    </View>
                    <Text style={styles.timeArrow}>→</Text>
                    <View style={[styles.timePickerContainer, styles.timePickerDisabled]}>
                      <Text style={styles.timePickerDisabledText}>18:00</Text>
                    </View>
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={() => addTimeBlock(selectedDay)}
                disabled={!currentDaySchedule.active}
                style={[
                  styles.addTimeBlockButton,
                  { borderColor: orbColor },
                  !currentDaySchedule.active && styles.addTimeBlockButtonDisabled,
                ]}>
                <Text
                  style={[
                    styles.addTimeBlockText,
                    { color: currentDaySchedule.active ? orbColor : '#4b5563' },
                  ]}>
                  {t('workingHours.addTimeBlock')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Lunch Break */}
            <View style={styles.lunchBreakContainer}>
              <View style={styles.lunchBreakHeader}>
                <View style={styles.lunchBreakTitleRow}>
                  <Text style={styles.coffeeIcon}>☕</Text>
                  <Text style={styles.lunchBreakTitle}>{t('workingHours.lunchBreak')}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => toggleLunchBreak(selectedDay)}
                  disabled={!currentDaySchedule.active}
                  style={[
                    styles.lunchBreakToggle,
                    currentDaySchedule.hasLunchBreak && styles.lunchBreakToggleActive,
                    !currentDaySchedule.active && styles.lunchBreakToggleDisabled,
                  ]}>
                  <Text
                    style={[
                      styles.lunchBreakToggleText,
                      currentDaySchedule.hasLunchBreak && styles.lunchBreakToggleTextActive,
                    ]}>
                    {currentDaySchedule.hasLunchBreak ? t('workingHours.on') : t('workingHours.off')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.lunchBreakTimeRow,
                  !currentDaySchedule.hasLunchBreak && styles.lunchBreakTimeRowDisabled,
                ]}>
                <View style={styles.timePickerContainer}>
                  <Text style={styles.timePickerDisplayText}>{currentDaySchedule.lunchStart}</Text>
                  <Picker
                    selectedValue={currentDaySchedule.lunchStart}
                    onValueChange={value => updateLunchBreak(selectedDay, 'lunchStart', value)}
                    style={styles.timePicker}
                    enabled={currentDaySchedule.active && currentDaySchedule.hasLunchBreak}
                    itemStyle={styles.timePickerItem}>
                    {timeOptions.filter(time => time !== '24:00').map(time => (
                      <Picker.Item key={time} label={time} value={time} />
                    ))}
                  </Picker>
                </View>
                <Text style={styles.timeArrow}>→</Text>
                <View style={styles.timePickerContainer}>
                  <Text style={styles.timePickerDisplayText}>{currentDaySchedule.lunchEnd}</Text>
                  <Picker
                    selectedValue={currentDaySchedule.lunchEnd}
                    onValueChange={value => updateLunchBreak(selectedDay, 'lunchEnd', value)}
                    style={styles.timePicker}
                    enabled={currentDaySchedule.active && currentDaySchedule.hasLunchBreak}
                    itemStyle={styles.timePickerItem}>
                    {timeOptions.filter(time => time !== '24:00').map(time => (
                      <Picker.Item key={time} label={time} value={time} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Helper Text */}
        <View style={styles.helperTextContainer}>
          <Text style={styles.helperText}>
            {t('workingHours.helperText')}
          </Text>
        </View>
      </ScrollView>

      {/* Footer with Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={onBack} style={styles.backButtonTouchable}>
          <Text style={styles.backButtonText}>{t('workingHours.back')}</Text>
        </TouchableOpacity>
        <Button
          title={t('workingHours.continue')}
          onPress={handleContinue}
          disabled={!isValid()}
          style={[styles.continueButton, { backgroundColor: orbColor }]}
          textStyle={styles.continueButtonText}
        />
      </View>

      {/* Working Hours Confirmation Modal */}
      <WorkingHoursConfirmationModal
        visible={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleConfirmHours}
        onEdit={handleEditHours}
        workingHours={workingHours}
        orbColor={orbColor}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 140, // Extra padding to prevent content from being hidden behind footer
  },
  orbContainer: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  daySelectorContainer: {
    marginBottom: 24,
  },
  dayButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#4b5563',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    borderWidth: 2,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9ca3af',
  },
  dayButtonTextActive: {
    color: '#f3f4f6',
  },
  daySelectorHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  hoursCard: {
    backgroundColor: 'rgba(55, 65, 81, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  hoursCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hoursCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clockIcon: {
    fontSize: 16,
  },
  hoursCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f3f4f6',
  },
  activeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  activeButtonText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  activeButtonTextActive: {
    color: '#f3f4f6',
  },
  hoursContent: {
    gap: 12,
  },
  quickRangesContainer: {
    marginBottom: 12,
  },
  quickRangesLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9ca3af',
    marginBottom: 8,
  },
  quickRangesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  quickRangeButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  quickRangeButtonText: {
    fontSize: 12,
  },
  timeBlocksContainer: {
    gap: 8,
    marginBottom: 12,
  },
  timeBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  timeBlockRowDisabled: {
    opacity: 0.5,
  },
  timeBlockSelectors: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timePickerContainer: {
    flex: 1,
    height: 40,
    backgroundColor: '#374151',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4b5563',
    justifyContent: 'center',
    position: 'relative',
  },
  timePickerDisplayText: {
    position: 'absolute',
    left: 12,
    top: 10,
    fontSize: 12,
    color: '#f3f4f6',
    zIndex: 10,
    pointerEvents: 'none',
  },
  timePicker: {
    height: 40,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    opacity: 0.001,
  },
  timePickerItem: {
    color: '#f3f4f6',
    fontSize: 12,
  },
  timePickerDisabled: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  timePickerDisabledText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 10,
  },
  timeArrow: {
    fontSize: 12,
    color: '#9ca3af',
  },
  removeTimeBlockButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeTimeBlockText: {
    fontSize: 20,
    color: '#ef4444',
    fontWeight: 'bold',
  },
  addTimeBlockButton: {
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  addTimeBlockButtonDisabled: {
    opacity: 0.5,
  },
  addTimeBlockText: {
    fontSize: 12,
  },
  lunchBreakContainer: {
    borderTopWidth: 1,
    borderTopColor: '#4b5563',
    paddingTop: 12,
    gap: 8,
  },
  lunchBreakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lunchBreakTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coffeeIcon: {
    fontSize: 12,
  },
  lunchBreakTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#f3f4f6',
  },
  lunchBreakToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#4b5563',
    backgroundColor: 'transparent',
  },
  lunchBreakToggleActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  lunchBreakToggleDisabled: {
    opacity: 0.5,
  },
  lunchBreakToggleText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  lunchBreakToggleTextActive: {
    color: '#f3f4f6',
  },
  lunchBreakTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  lunchBreakTimeRowDisabled: {
    opacity: 0.3,
  },
  helperTextContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32, // Extra bottom padding for safe area
    alignItems: 'center',
    justifyContent: 'space-between', // Back on left, Continue on right
    gap: 12,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 50,
  },
  backButtonTouchable: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  continueButton: {
    flex: 1,
    maxWidth: 384,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '500',
  },
});

