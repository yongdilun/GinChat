import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';

export interface AudioRecording {
  uri: string;
  duration: number;
  size?: number;
  name: string;
}

export function useAudioRecorder() {
  const [isRecorderVisible, setIsRecorderVisible] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<AudioRecording | null>(null);

  const showRecorder = useCallback(() => {
    setIsRecorderVisible(true);
  }, []);

  const hideRecorder = useCallback(() => {
    setIsRecorderVisible(false);
  }, []);

  const handleRecordingComplete = useCallback((uri: string, duration: number) => {
    const timestamp = new Date().getTime();
    const audioRecording: AudioRecording = {
      uri,
      duration,
      name: `voice_message_${timestamp}.m4a`,
    };
    
    console.log('[AudioRecorder] Recording completed:', audioRecording);
    setRecordedAudio(audioRecording);
    setIsRecorderVisible(false);
  }, []);

  const handleRecordingCancel = useCallback(() => {
    console.log('[AudioRecorder] Recording cancelled');
    setIsRecorderVisible(false);
  }, []);

  const clearRecording = useCallback(() => {
    setRecordedAudio(null);
  }, []);

  const checkPermissions = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant microphone permission to record audio messages.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('[AudioRecorder] Permission check failed:', error);
      Alert.alert('Error', 'Failed to check microphone permissions.');
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    const hasPermission = await checkPermissions();
    if (hasPermission) {
      showRecorder();
    }
  }, [checkPermissions, showRecorder]);

  return {
    isRecorderVisible,
    recordedAudio,
    showRecorder: startRecording,
    hideRecorder,
    handleRecordingComplete,
    handleRecordingCancel,
    clearRecording,
  };
}
