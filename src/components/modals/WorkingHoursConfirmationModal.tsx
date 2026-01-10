/**
 * Working Hours Confirmation Modal
 * Exact match with web version - Shows summary before confirming
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Button } from '../ui/Button';
import { WorkingHours, TimeBlock } from '../../screens/WorkingHoursScreen';

interface WorkingHoursConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onEdit: () => void;
  workingHours: WorkingHours;
  orbColor?: string;
}

const DAYS_FULL = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

function calculateTotalHours(workingHours: WorkingHours): number {
  let totalMinutes = 0;

  Object.values(workingHours).forEach(day => {
    if (day.active && day.blocks.length > 0) {
      day.blocks.forEach(block => {
        const [startHours, startMinutes] = block.start.split(':').map(Number);
        const [endHours, endMinutes] = block.end.split(':').map(Number);

        const startTotalMinutes = startHours * 60 + startMinutes;
        let endTotalMinutes = endHours * 60 + endMinutes;
        
        // Handle 24:00 as end of day
        if (block.end === '24:00') {
          endTotalMinutes = 24 * 60;
        }

        totalMinutes += endTotalMinutes - startTotalMinutes;
      });

      // Subtract lunch break if enabled
      if (day.hasLunchBreak) {
        const [lunchStartHours, lunchStartMinutes] = day.lunchStart.split(':').map(Number);
        const [lunchEndHours, lunchEndMinutes] = day.lunchEnd.split(':').map(Number);

        const lunchStartTotalMinutes = lunchStartHours * 60 + lunchStartMinutes;
        const lunchEndTotalMinutes = lunchEndHours * 60 + lunchEndMinutes;

        totalMinutes -= lunchEndTotalMinutes - lunchStartTotalMinutes;
      }
    }
  });

  return Math.round((totalMinutes / 60) * 10) / 10; // Round to 1 decimal place
}

export function WorkingHoursConfirmationModal({
  visible,
  onClose,
  onConfirm,
  onEdit,
  workingHours,
  orbColor = '#3b82f6',
}: WorkingHoursConfirmationModalProps) {
  const activeDays = Object.entries(workingHours).filter(([_, day]) => day.active);
  const totalHours = calculateTotalHours(workingHours);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.container}>
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={[styles.modal, { borderColor: `${orbColor}30` }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Text style={[styles.checkIcon, { color: orbColor }]}>✓</Text>
                <Text style={styles.title}>Your Working Hours</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>
              Review and confirm your weekly availability
            </Text>
            <Text style={styles.descriptionSecondary}>
              Review your availability schedule before continuing
            </Text>

            {/* Summary Stats */}
            <View style={[styles.summaryCard, { backgroundColor: `${orbColor}10` }]}>
              <Text style={[styles.totalHours, { color: orbColor }]}>
                {totalHours} hours/week
              </Text>
              <Text style={styles.activeDaysText}>
                Across {activeDays.length} active {activeDays.length === 1 ? 'day' : 'days'}
              </Text>
            </View>

            {/* Daily Schedule */}
            <View style={styles.availabilitySection}>
              <View style={styles.availabilityHeader}>
                <Text style={styles.clockIcon}>🕐</Text>
                <Text style={styles.availabilityLabel}>Your availability:</Text>
              </View>

              <ScrollView
                style={styles.availabilityScrollView}
                contentContainerStyle={styles.availabilityScrollContent}
                showsVerticalScrollIndicator={true}>
                {activeDays.map(([dayKey, day]) => (
                  <Animated.View
                    key={dayKey}
                    entering={FadeIn.duration(300).delay(activeDays.indexOf([dayKey, day]) * 50)}
                    style={styles.dayCard}>
                    <Text style={styles.dayName}>
                      {DAYS_FULL[dayKey as keyof typeof DAYS_FULL]}
                    </Text>

                    {/* Time blocks */}
                    <View style={styles.timeBlocksList}>
                      {day.blocks.map((block, index) => (
                        <Text key={block.id} style={styles.timeBlockText}>
                          • {formatTimeRange(block.start, block.end)}
                        </Text>
                      ))}

                      {/* Lunch break */}
                      {day.hasLunchBreak && (
                        <View style={styles.lunchBreakRow}>
                          <Text style={styles.coffeeIcon}>☕</Text>
                          <Text style={styles.lunchBreakText}>
                            Lunch: {formatTimeRange(day.lunchStart, day.lunchEnd)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Animated.View>
                ))}
              </ScrollView>
            </View>

            {/* Helper Text */}
            <View style={[styles.helperCard, { borderColor: `${orbColor}30` }]}>
              <Text style={[styles.helperText, { color: orbColor }]}>
                <Text style={styles.helperBold}>trego</Text> will only show you jobs during
                these hours. You can always update your availability later in Settings.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <Button
                title="Edit Hours"
                variant="outline"
                onPress={onEdit}
                style={styles.editButton}
                textStyle={styles.editButtonText}
              />
              <Button
                title="Looks Good!"
                onPress={onConfirm}
                style={[styles.confirmButton, { backgroundColor: orbColor }]}
                textStyle={styles.confirmButtonText}
              />
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  checkIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#f3f4f6',
    lineHeight: 20,
  },
  description: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 4,
  },
  descriptionSecondary: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  totalHours: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  activeDaysText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  availabilitySection: {
    marginBottom: 16,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  clockIcon: {
    fontSize: 16,
  },
  availabilityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },
  availabilityScrollView: {
    maxHeight: 200,
  },
  availabilityScrollContent: {
    gap: 8,
    paddingRight: 8,
  },
  dayCard: {
    padding: 12,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  dayName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f3f4f6',
    marginBottom: 8,
  },
  timeBlocksList: {
    gap: 4,
  },
  timeBlockText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  lunchBreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  coffeeIcon: {
    fontSize: 12,
  },
  lunchBreakText: {
    fontSize: 12,
    color: '#f59e0b',
  },
  helperCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    marginBottom: 16,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  helperBold: {
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    height: 44,
    borderColor: '#4b5563',
  },
  editButtonText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  confirmButton: {
    flex: 1,
    height: 44,
  },
  confirmButtonText: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '500',
  },
});





