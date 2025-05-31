import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { GoldTheme } from '../../../constants/GoldTheme';

interface AudioRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onCancel: () => void;
  isVisible: boolean;
}

export function AudioRecorder({
  onRecordingComplete,
  onCancel,
  isVisible
}: AudioRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRecording) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start wave animation
      Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();

      // Start duration timer
      const timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      return () => {
        clearInterval(timer);
        pulseAnim.stopAnimation();
        waveAnim.stopAnimation();
      };
    } else {
      pulseAnim.setValue(1);
      waveAnim.setValue(0);
      setRecordingDuration(0);
    }
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      if (permissionResponse?.status !== 'granted') {
        console.log('Requesting permission..');
        const permission = await requestPermission();
        if (permission.status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant microphone permission to record audio.');
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording..');
    if (!recording) return;

    setIsRecording(false);
    setRecording(null);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = recording.getURI();
      if (uri) {
        console.log('Recording stopped and stored at', uri);
        onRecordingComplete(uri, recordingDuration);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to save recording. Please try again.');
    }
  };

  const cancelRecording = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      } catch (error) {
        console.error('Error canceling recording:', error);
      }
    }
    setIsRecording(false);
    setRecording(null);
    setRecordingDuration(0);
    onCancel();
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[GoldTheme.background.card, GoldTheme.background.secondary]}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {isRecording ? 'Recording...' : 'Voice Message'}
          </Text>
          <TouchableOpacity onPress={cancelRecording} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={GoldTheme.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.recordingArea}>
          {isRecording && (
            <View style={styles.waveContainer}>
              {[...Array(5)].map((_, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.waveBar,
                    {
                      transform: [{
                        scaleY: waveAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 1 + Math.random() * 0.5],
                        })
                      }],
                      opacity: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      })
                    }
                  ]}
                />
              ))}
            </View>
          )}

          <Animated.View style={[styles.recordButton, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity
              onPress={isRecording ? stopRecording : startRecording}
              style={styles.recordButtonTouchable}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isRecording ? ['#FF6B6B', '#FF5252'] : GoldTheme.gradients.goldButton}
                style={styles.recordButtonGradient}
              >
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={32}
                  color={GoldTheme.text.inverse}
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {isRecording && (
            <Text style={styles.duration}>
              {formatDuration(recordingDuration)}
            </Text>
          )}
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            {isRecording 
              ? 'Tap the stop button to finish recording'
              : 'Tap the microphone to start recording'
            }
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  gradient: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: GoldTheme.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  recordingArea: {
    alignItems: 'center',
    marginBottom: 30,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    marginBottom: 20,
  },
  waveBar: {
    width: 4,
    height: 30,
    backgroundColor: GoldTheme.gold.primary,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  recordButton: {
    marginBottom: 15,
  },
  recordButtonTouchable: {
    borderRadius: 40,
    overflow: 'hidden',
  },
  recordButtonGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  duration: {
    fontSize: 24,
    fontWeight: 'bold',
    color: GoldTheme.gold.primary,
    fontFamily: 'monospace',
  },
  instructions: {
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: GoldTheme.text.secondary,
    textAlign: 'center',
  },
});
