/**
 * VoiceBubble
 * Floating button that records voice, uploads to backend, creates a job.
 * When offline: saves audio locally, queues for sync.
 *
 * Edge cases implemented:
 *   4.1 — Redo button: 3-second review window after recording before submitting
 *   4.5 — Min audio length: recordings < 1.5s are discarded
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import NetInfo from '@react-native-community/netinfo';
import { jobsAPI, getAPIError } from '../services/api';
import { offlineQueue } from '../services/offlineQueue';

const recorder = new AudioRecorderPlayer();

const MIN_RECORDING_SECONDS = 1.5;
const REDO_WINDOW_SECONDS = 3;

type BubbleState = 'idle' | 'recording' | 'reviewing' | 'uploading' | 'done' | 'error' | 'text-input';

interface VoiceBubbleProps {
  onJobCreated?: (job: any) => void;
  prefilledClient?: string; // for post-call prompt
}

export default function VoiceBubble({ onJobCreated, prefilledClient }: VoiceBubbleProps) {
  const [state, setState] = useState<BubbleState>('idle');
  const [error, setError] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [redoCountdown, setRedoCountdown] = useState(REDO_WINDOW_SECONDS);
  const [textInput, setTextInput] = useState(prefilledClient ? `Client: ${prefilledClient} ` : '');
  const [showTextModal, setShowTextModal] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingPath = useRef<string>('');
  const recordingSeconds = useRef(0);
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const redoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const redoAutoSubmitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const clearRedoTimers = () => {
    if (redoTimer.current) { clearInterval(redoTimer.current); redoTimer.current = null; }
    if (redoAutoSubmitTimer.current) { clearTimeout(redoAutoSubmitTimer.current); redoAutoSubmitTimer.current = null; }
  };

  const submitRecording = useCallback(async (path: string) => {
    setState('uploading');

    const net = await NetInfo.fetch();
    const isOnline = net.isConnected && net.isInternetReachable;

    if (!isOnline) {
      await offlineQueue.enqueue(path);
      setOfflineSaved(true);
      setState('done');
      setTimeout(() => setState('idle'), 2500);
      return;
    }

    try {
      const res = await jobsAPI.uploadVoice(path);
      setState('done');
      onJobCreated?.(res.data.job);
      setTimeout(() => setState('idle'), 1500);
    } catch (err) {
      setError(getAPIError(err));
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }, [onJobCreated]);

  const handlePressIn = useCallback(async () => {
    if (state !== 'idle') return;
    setError('');
    setOfflineSaved(false);

    try {
      const path = await recorder.startRecorder();
      recordingPath.current = path;
      recordingSeconds.current = 0;
      setState('recording');
      startPulse();

      let secs = 0;
      durationInterval.current = setInterval(() => {
        secs++;
        recordingSeconds.current = secs;
        setRecordingDuration(secs);
      }, 1000);
    } catch (err) {
      setError('Could not access microphone');
    }
  }, [state, startPulse]);

  const handlePressOut = useCallback(async () => {
    if (state !== 'recording') return;

    stopPulse();
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }

    const duration = recordingSeconds.current;
    setRecordingDuration(0);

    const path = recordingPath.current;
    await recorder.stopRecorder();

    // 4.5 — Minimum audio length check
    if (duration < MIN_RECORDING_SECONDS) {
      setError('Too short — hold longer and describe the job');
      setState('error');
      setTimeout(() => setState('idle'), 2500);
      return;
    }

    // 4.1 — Redo window: show 3-second countdown before submitting
    setRedoCountdown(REDO_WINDOW_SECONDS);
    setState('reviewing');

    let countdown = REDO_WINDOW_SECONDS;
    redoTimer.current = setInterval(() => {
      countdown--;
      setRedoCountdown(countdown);
      if (countdown <= 0) {
        clearRedoTimers();
        submitRecording(path);
      }
    }, 1000);
  }, [state, stopPulse, submitRecording]);

  const handleRedo = useCallback(async () => {
    clearRedoTimers();
    setState('idle');
    setRedoCountdown(REDO_WINDOW_SECONDS);
  }, []);

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) return;
    setShowTextModal(false);
    setState('uploading');

    const net = await NetInfo.fetch();
    const isOnline = net.isConnected && net.isInternetReachable;

    if (!isOnline) {
      setError('No internet. Use voice to record offline.');
      setState('error');
      setTimeout(() => setState('idle'), 3000);
      return;
    }

    try {
      const res = await jobsAPI.createText(textInput.trim());
      setState('done');
      onJobCreated?.(res.data.job);
      setTextInput('');
      setTimeout(() => setState('idle'), 1500);
    } catch (err) {
      setError(getAPIError(err));
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }, [textInput, onJobCreated]);

  const getBubbleColor = () => {
    switch (state) {
      case 'recording': return '#ef4444';
      case 'reviewing': return '#f59e0b';
      case 'uploading': return '#f59e0b';
      case 'done': return offlineSaved ? '#8b5cf6' : '#10b981';
      case 'error': return '#ef4444';
      default: return '#1E6FF7';
    }
  };

  const getIcon = () => {
    switch (state) {
      case 'recording': return 'microphone';
      case 'reviewing': return 'check-circle-outline';
      case 'uploading': return 'cloud-upload';
      case 'done': return offlineSaved ? 'clock-outline' : 'check';
      case 'error': return 'alert';
      default: return 'microphone-outline';
    }
  };

  const getLabel = () => {
    switch (state) {
      case 'recording': return `${recordingDuration}s — Release to submit`;
      case 'reviewing': return `Submitting in ${redoCountdown}s...`;
      case 'uploading': return 'Processing...';
      case 'done': return offlineSaved ? 'Saved offline' : 'Job created!';
      case 'error': return error || 'Error';
      default: return 'Hold to speak';
    }
  };

  return (
    <>
      <View style={styles.container}>
        {/* Label above bubble */}
        {state !== 'idle' && (
          <View style={styles.labelContainer}>
            <Text style={styles.label}>{getLabel()}</Text>
          </View>
        )}

        {/* Redo button — visible during 3-second review window (4.1) */}
        {state === 'reviewing' && (
          <TouchableOpacity style={styles.redoButton} onPress={handleRedo}>
            <Icon name="refresh" size={16} color="#fff" />
            <Text style={styles.redoText}>Redo</Text>
          </TouchableOpacity>
        )}

        {/* Text input button */}
        {state === 'idle' && (
          <TouchableOpacity
            style={styles.textButton}
            onPress={() => setShowTextModal(true)}>
            <Icon name="keyboard" size={16} color="#6b7280" />
          </TouchableOpacity>
        )}

        {/* Main bubble */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.bubble, { backgroundColor: getBubbleColor() }]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
            disabled={state === 'uploading' || state === 'reviewing'}>
            {state === 'uploading' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Icon name={getIcon()} size={28} color="#fff" />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Text input fallback modal */}
      <Modal
        visible={showTextModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTextModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Type a job</Text>
            <TextInput
              style={styles.textInputField}
              value={textInput}
              onChangeText={setTextInput}
              placeholder="e.g. Fix leaking pipe, Rua Augusta, Friday 21h, João Silva"
              placeholderTextColor="#9ca3af"
              multiline
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowTextModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, !textInput.trim() && styles.disabledBtn]}
                onPress={handleTextSubmit}
                disabled={!textInput.trim()}>
                <Text style={styles.modalSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  labelContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  label: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  redoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#374151',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  redoText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  textButton: {
    position: 'absolute',
    right: -40,
    bottom: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  bubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
  },
  textInputField: {
    backgroundColor: '#374151',
    borderRadius: 10,
    padding: 14,
    color: '#f9fafb',
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  modalCancelText: {
    color: '#9ca3af',
    fontSize: 15,
  },
  modalSubmit: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#10b981',
  },
  modalSubmitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.4,
  },
});
