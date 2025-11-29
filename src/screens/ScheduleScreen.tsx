/**
 * Schedule Screen
 * Placeholder - will be implemented later
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function ScheduleScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.subtitle}>Manage your schedule</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
});


