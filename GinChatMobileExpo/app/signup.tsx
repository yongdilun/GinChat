import React, { useState } from 'react';
import { StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '../src/components/ThemedText';
import { ThemedView } from '../src/components/ThemedView';
import IconButton from '../src/components/IconButton';
import { authAPI } from '../src/services/api';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await authAPI.register(name, email, password);
      router.replace('/login');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Create an Account</ThemedText>
      
      {error ? <ThemedText type="error" style={styles.error}>{error}</ThemedText> : null}
      
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor="#9E9E9E"
        value={name}
        onChangeText={setName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#9E9E9E"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#9E9E9E"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#9E9E9E"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      
      <ThemedView style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="small" color="#2196F3" />
        ) : (
          <IconButton
            name="person-add-outline"
            size={24}
            color="#FFFFFF"
            style={styles.signupButton}
            onPress={handleSignup}
          />
        )}
      </ThemedView>
      
      <ThemedView style={styles.footer}>
        <ThemedText>Already have an account? </ThemedText>
        <ThemedText 
          type="link" 
          onPress={() => router.push('/login')}
        >
          Login
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  signupButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    marginBottom: 16,
    textAlign: 'center',
  },
  footer: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
  },
}); 