import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/contexts/AuthContext';
import { GoldButton } from '../src/components/GoldButton';
import { GoldInput } from '../src/components/GoldInput';
import { GoldTheme } from '../constants/GoldTheme';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, login } = useAuth();

  const validateForm = () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Register the user
      await register(name, email, password);

      // Show success message
      Alert.alert(
        'Welcome to GinChat!',
        'Your premium account has been created successfully.',
        [
          {
            text: 'Get Started',
            onPress: async () => {
              try {
                // Auto login after registration
                await login(email, password);
              } catch (err: any) {
                console.error('Auto login failed:', err);
                router.push('/login');
              }
            },
          },
        ]
      );
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[GoldTheme.background.primary, GoldTheme.background.secondary]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
                  style={styles.backButtonGradient}
      >
                  <Ionicons name="arrow-back" size={24} color={GoldTheme.gold.primary} />
                </LinearGradient>
      </TouchableOpacity>
            </View>

            {/* Logo Section */}
            <View style={styles.logoSection}>
              <LinearGradient
                colors={GoldTheme.gradients.goldShimmer}
                style={styles.logoContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <ThemedText style={styles.logoText}>G</ThemedText>
              </LinearGradient>
              
              <ThemedText style={styles.welcomeTitle}>Join the Elite</ThemedText>
              <ThemedText style={styles.welcomeSubtitle}>
                Create your premium messaging account
              </ThemedText>
      </View>

            {/* Form Section */}
            <View style={styles.formSection}>
        {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color={GoldTheme.status.error} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
        ) : null}

              <GoldInput
                label="Full Name"
                placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
                autoComplete="name"
                icon={<Ionicons name="person-outline" size={20} color={GoldTheme.gold.primary} />}
        />

              <GoldInput
                label="Email Address"
                placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
                autoComplete="email"
                icon={<Ionicons name="mail-outline" size={20} color={GoldTheme.gold.primary} />}
        />

              <GoldInput
                label="Password"
                placeholder="Create a secure password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
                autoComplete="new-password"
                icon={<Ionicons name="lock-closed-outline" size={20} color={GoldTheme.gold.primary} />}
        />

              <GoldInput
                label="Confirm Password"
                placeholder="Confirm your password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
                autoComplete="new-password"
                icon={<Ionicons name="shield-checkmark-outline" size={20} color={GoldTheme.gold.primary} />}
              />

              <View style={styles.termsContainer}>
                <ThemedText style={styles.termsText}>
                  By creating an account, you agree to our{' '}
                  <ThemedText style={styles.termsLink}>Terms of Service</ThemedText>
                  {' '}and{' '}
                  <ThemedText style={styles.termsLink}>Privacy Policy</ThemedText>
                </ThemedText>
              </View>

              <GoldButton
                title={loading ? "Creating Account..." : "Create Account"}
          onPress={handleSignup}
          disabled={loading}
                size="large"
                style={styles.signupButton}
              />

              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={GoldTheme.gold.primary} />
                </View>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <ThemedText style={styles.dividerText}>or</ThemedText>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.loginPrompt}>
          <ThemedText style={styles.loginText}>Already have an account?</ThemedText>
          <TouchableOpacity onPress={() => router.push('/login')}>
                  <ThemedText style={styles.loginLink}>Sign In</ThemedText>
          </TouchableOpacity>
        </View>

              <View style={styles.featuresContainer}>
                <ThemedText style={styles.featuresTitle}>What you'll get:</ThemedText>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={GoldTheme.gold.primary} />
                  <ThemedText style={styles.featureText}>Unlimited premium messaging</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={GoldTheme.gold.primary} />
                  <ThemedText style={styles.featureText}>End-to-end encryption</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={GoldTheme.gold.primary} />
                  <ThemedText style={styles.featureText}>Exclusive gold features</ThemedText>
                </View>
              </View>
      </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingVertical: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...GoldTheme.shadow.gold,
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: GoldTheme.text.inverse,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: GoldTheme.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: GoldTheme.text.secondary,
    textAlign: 'center',
    opacity: 0.8,
  },
  formSection: {
    flex: 1,
    paddingTop: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    color: GoldTheme.status.error,
    marginLeft: 12,
    fontSize: 14,
    flex: 1,
  },
  termsContainer: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  termsText: {
    fontSize: 12,
    color: GoldTheme.text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: GoldTheme.gold.primary,
    fontWeight: '600',
  },
  signupButton: {
    marginBottom: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  footer: {
    paddingBottom: 32,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  dividerText: {
    color: GoldTheme.text.muted,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginText: {
    color: GoldTheme.text.secondary,
    fontSize: 16,
    marginRight: 8,
  },
  loginLink: {
    color: GoldTheme.gold.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  featuresContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GoldTheme.gold.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: GoldTheme.text.secondary,
    marginLeft: 12,
    fontWeight: '500',
  },
});
