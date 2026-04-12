/**
 * VoiceBubble — Floating draggable bubble visible across all screens.
 * Hold to speak, release to submit. 3-second redo window. Text input fallback.
 * Draggable — snaps to screen edges when released.
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Modal, TextInput,
  ActivityIndicator, PanResponder, Dimensions, DeviceEventEmitter,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import NetInfo from '@react-native-community/netinfo';
import { jobsAPI, getAPIError } from '../services/api';
import { offlineQueue } from '../services/offlineQueue';
import { useTranslation } from 'react-i18next';

const recorder = new AudioRecorderPlayer();
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BUBBLE_SIZE = 56;
const MIN_RECORDING_SECONDS = 1.5;
const REDO_WINDOW_SECONDS = 3;
const SNAP_MARGIN = 16;
const TAB_BAR_HEIGHT = 70;

type BubbleState = 'idle' | 'recording' | 'reviewing' | 'uploading' | 'done' | 'error';

interface VoiceBubbleProps {
  onJobCreated?: (job: any) => void;
  prefilledClient?: string;
}

export default function VoiceBubble({ onJobCreated, prefilledClient }: VoiceBubbleProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<BubbleState>('idle');
  const [error, setError] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [redoCountdown, setRedoCountdown] = useState(REDO_WINDOW_SECONDS);
  const [textInput, setTextInput] = useState(prefilledClient ? `Client: ${prefilledClient} ` : '');
  const [showTextModal, setShowTextModal] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Timer cleanup
  const pendingTimers = useRef<NodeJS.Timeout[]>([]);
  const safeTimeout = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    pendingTimers.current.push(id);
    return id;
  };
  useEffect(() => () => { pendingTimers.current.forEach(clearTimeout); }, []);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isDragging = useRef(false); // kept for compat with existing press handlers

  // ── Notification bar event listeners ───────────────────────────────────────
  useEffect(() => {
    const subVoice = DeviceEventEmitter.addListener('TregoOpenVoice', () => {
      if (state === 'idle') handlePressIn();
    });
    const subText = DeviceEventEmitter.addListener('TregoOpenText', () => {
      setShowTextModal(true);
    });
    return () => { subVoice.remove(); subText.remove(); };
  }, [state]);

  // ── Recording refs ─────────────────────────────────────────────────────────
  const recordingPath = useRef('');
  const recordingSeconds = useRef(0);
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const redoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPulse = useCallback(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.25, duration: 500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
    ])).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const clearRedoTimers = () => {
    if (redoTimer.current) { clearInterval(redoTimer.current); redoTimer.current = null; }
  };

  // ── Submit recording ───────────────────────────────────────────────────────
  const submitRecording = useCallback(async (path: string) => {
    setState('uploading');
    const net = await NetInfo.fetch();
    if (!(net.isConnected && net.isInternetReachable)) {
      await offlineQueue.enqueue(path);
      setOfflineSaved(true);
      setState('done');
      safeTimeout(() => setState('idle'), 2500);
      return;
    }
    try {
      const res = await jobsAPI.uploadVoice(path);
      setState('done');
      onJobCreated?.(res.data.job);
      safeTimeout(() => setState('idle'), 1500);
    } catch (err) {
      setError(getAPIError(err));
      setState('error');
      safeTimeout(() => setState('idle'), 3000);
    }
  }, [onJobCreated]);

  // ── Press handlers ─────────────────────────────────────────────────────────
  const handlePressIn = useCallback(async () => {
    if (state !== 'idle') return;
    setError('');
    setOfflineSaved(false);
    setExpanded(true);
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
    } catch {
      setError(t('voice.errorMic'));
      setState('error');
      safeTimeout(() => { setState('idle'); setExpanded(false); }, 2500);
    }
  }, [state, startPulse, t]);

  const handlePressOut = useCallback(async () => {
    if (state !== 'recording') return;
    stopPulse();
    if (durationInterval.current) { clearInterval(durationInterval.current); durationInterval.current = null; }
    const duration = recordingSeconds.current;
    setRecordingDuration(0);
    await recorder.stopRecorder();

    if (duration < MIN_RECORDING_SECONDS) {
      setError(t('voice.tooShort'));
      setState('error');
      safeTimeout(() => { setState('idle'); setExpanded(false); }, 2500);
      return;
    }

    setRedoCountdown(REDO_WINDOW_SECONDS);
    setState('reviewing');
    let countdown = REDO_WINDOW_SECONDS;
    redoTimer.current = setInterval(() => {
      countdown--;
      setRedoCountdown(countdown);
      if (countdown <= 0) {
        clearRedoTimers();
        submitRecording(recordingPath.current);
        safeTimeout(() => setExpanded(false), 2000);
      }
    }, 1000);
  }, [state, stopPulse, submitRecording]);

  const handleRedo = useCallback(() => {
    clearRedoTimers();
    setState('idle');
    setExpanded(false);
    setRedoCountdown(REDO_WINDOW_SECONDS);
  }, []);

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) return;
    setShowTextModal(false);
    setState('uploading');
    setExpanded(true);
    const net = await NetInfo.fetch();
    if (!(net.isConnected && net.isInternetReachable)) {
      await offlineQueue.enqueueText(textInput.trim());
      setOfflineSaved(true);
      setState('done');
      setTextInput('');
      safeTimeout(() => { setState('idle'); setExpanded(false); }, 2500);
      return;
    }
    try {
      const res = await jobsAPI.createText(textInput.trim());
      setState('done');
      onJobCreated?.(res.data.job);
      setTextInput('');
      safeTimeout(() => { setState('idle'); setExpanded(false); }, 1500);
    } catch (err) {
      // Network error during send — queue for later
      await offlineQueue.enqueueText(textInput.trim());
      setOfflineSaved(true);
      setState('done');
      setTextInput('');
      safeTimeout(() => { setState('idle'); setExpanded(false); }, 2500);
    }
  }, [textInput, onJobCreated]);

  // ── UI helpers ─────────────────────────────────────────────────────────────
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
      case 'recording': return t('voice.recordingLabel', { seconds: recordingDuration });
      case 'reviewing': return t('voice.submittingLabel', { countdown: redoCountdown });
      case 'uploading': return t('voice.processing');
      case 'done': return offlineSaved ? t('voice.savedOffline') : t('voice.jobCreated');
      case 'error': return error || t('common.error');
      default: return '';
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <View style={s.container}>

        {/* Expanded info (label + redo) — shown above bubble during active states */}
        {expanded && state !== 'idle' && (
          <View style={s.expandedPanel}>
            <Text style={s.label}>{getLabel()}</Text>
            {state === 'reviewing' && (
              <TouchableOpacity style={s.redoBtn} onPress={handleRedo}>
                <Icon name="refresh" size={14} color="#fff" />
                <Text style={s.redoText}>{t('voice.redo')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Main bubble */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[s.bubble, { backgroundColor: getBubbleColor() }]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
            disabled={state === 'uploading' || state === 'reviewing'}>
            {state === 'uploading' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Icon name={getIcon()} size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Text shortcut dot */}
        {state === 'idle' && (
          <TouchableOpacity
            style={s.textDot}
            onPress={() => setShowTextModal(true)}>
            <Icon name="keyboard-outline" size={12} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Text input modal */}
      <Modal visible={showTextModal} transparent animationType="slide" onRequestClose={() => setShowTextModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{t('voice.typeJob')}</Text>
            <TextInput
              style={s.textInputField}
              value={textInput}
              onChangeText={setTextInput}
              placeholder={t('voice.jobPlaceholder')}
              placeholderTextColor="#9ca3af"
              multiline
              autoFocus
            />
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowTextModal(false)}>
                <Text style={s.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalSubmit, !textInput.trim() && s.disabledBtn]}
                onPress={handleTextSubmit}
                disabled={!textInput.trim()}>
                <Text style={s.modalSubmitText}>{t('common.submit')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  expandedPanel: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 8,
    alignItems: 'center',
    gap: 6,
    maxWidth: 200,
  },
  label: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  redoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  redoText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 12,
  },
  textDot: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#1f2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, gap: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#f9fafb' },
  textInputField: { backgroundColor: '#374151', borderRadius: 10, padding: 14, color: '#f9fafb', fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#4b5563' },
  modalCancelText: { color: '#9ca3af', fontSize: 15 },
  modalSubmit: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: '#10b981' },
  modalSubmitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  disabledBtn: { opacity: 0.4 },
});
