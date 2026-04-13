/**
 * FeedbackButton — Playbook §5.10 "mic icon on every job card and in settings."
 *
 * Three interaction modes:
 *   • Tap thumbs-up   → quick positive feedback (one API call, done)
 *   • Tap thumbs-down → quick thumbs_down
 *   • Tap mic (long-press) → record voice feedback, release to upload
 *     (same hold-to-speak gesture providers already know from the bubble)
 */
import React, { useState, useRef } from 'react';
import {
  TouchableOpacity, View, StyleSheet, ActivityIndicator, Alert, Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { feedbackAPI, getAPIError } from '../services/api';
import { useTranslation } from 'react-i18next';

interface Props {
  jobId: string;
  size?: number;
  color?: string;
  showAll?: boolean; // if true, render thumbs-up + mic + thumbs-down row
}

// Single shared recorder across all feedback buttons
const recorder = new AudioRecorderPlayer();
let isRecording = false;

export default function FeedbackButton({ jobId, size = 18, color = '#94a3b8', showAll = true }: Props) {
  const { t } = useTranslation();
  const [sending, setSending] = useState<null | 'up' | 'down' | 'voice'>(null);
  const [sent, setSent] = useState<null | 'up' | 'down' | 'voice'>(null);
  const [recordingSec, setRecordingSec] = useState(0);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingPath = useRef<string>('');

  const flashSent = (kind: 'up' | 'down' | 'voice') => {
    setSent(kind);
    setTimeout(() => setSent(null), 2000);
  };

  const sendQuick = async (type: 'up' | 'down') => {
    setSending(type);
    try {
      if (type === 'down') await feedbackAPI.thumbsDown(jobId);
      else await feedbackAPI.text('text', 'thumbs_up', jobId); // positive signal
      flashSent(type);
    } catch (err) {
      Alert.alert(t('common.error'), getAPIError(err));
    } finally {
      setSending(null);
    }
  };

  const startVoice = async () => {
    if (isRecording) return;
    isRecording = true;
    try {
      const path = await recorder.startRecorder();
      recordingPath.current = path;
      setSending('voice');
      setRecordingSec(0);
      ticker.current = setInterval(() => setRecordingSec((s) => s + 1), 1000);
    } catch (e) {
      isRecording = false;
      setSending(null);
      Alert.alert(t('common.error'), t('voice.errorMic'));
    }
  };

  const stopVoice = async () => {
    if (!isRecording) return;
    isRecording = false;
    if (ticker.current) { clearInterval(ticker.current); ticker.current = null; }
    let path: string;
    try { path = await recorder.stopRecorder(); }
    catch { setSending(null); return; }
    const duration = recordingSec;
    setRecordingSec(0);

    if (duration < 1) {
      setSending(null);
      Alert.alert(t('common.error'), t('voice.tooShort'));
      return;
    }
    try {
      await feedbackAPI.voice(path || recordingPath.current, jobId);
      flashSent('voice');
    } catch (err) {
      Alert.alert(t('common.error'), getAPIError(err));
    } finally {
      setSending(null);
    }
  };

  // During an active recording, show a pulsing mic + countdown
  if (sending === 'voice' && isRecording) {
    return (
      <View style={[styles.btn, { backgroundColor: '#ef444420' }]}>
        <Icon name="microphone" size={size} color="#ef4444" />
      </View>
    );
  }

  if (sent) {
    return (
      <View style={[styles.btn, { backgroundColor: '#0f766e20' }]}>
        <Icon name="check" size={size} color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {showAll && (
        <TouchableOpacity
          style={styles.btn}
          onPress={() => sendQuick('up')}
          disabled={!!sending}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {sending === 'up' ? <ActivityIndicator size="small" color={color} /> :
            <Icon name="thumb-up-outline" size={size} color={color} />}
        </TouchableOpacity>
      )}
      {showAll && (
        <TouchableOpacity
          style={styles.btn}
          onPressIn={startVoice}
          onPressOut={stopVoice}
          disabled={!!sending && sending !== 'voice'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="microphone-outline" size={size} color={color} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.btn}
        onPress={() => sendQuick('down')}
        disabled={!!sending}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        {sending === 'down' ? <ActivityIndicator size="small" color={color} /> :
          <Icon name="thumb-down-outline" size={size} color={color} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  btn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
});
