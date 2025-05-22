import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/contexts/AuthContext';
import { GoldButton } from '../src/components/GoldButton';
import { GoldInput } from '../src/components/GoldInput';
import { GoldTheme } from '../constants/GoldTheme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(email, password);
      // No need to navigate here - AuthContext will handle it
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please try again.');
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
              
              <ThemedText style={styles.welcomeTitle}>Welcome Back</ThemedText>
              <ThemedText style={styles.welcomeSubtitle}>
                Sign in to your premium account
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
                placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
                autoComplete="password"
                icon={<Ionicons name="lock-closed-outline" size={20} color={GoldTheme.gold.primary} />}
        />

              <TouchableOpacity style={styles.forgotPassword}>
                <ThemedText style={styles.forgotPasswordText}>
                  Forgot Password?
                </ThemedText>
              </TouchableOpacity>

              <GoldButton
                title={loading ? "Signing In..." : "Sign In"}
          onPress={handleLogin}
          disabled={loading}
                size="large"
                style={styles.loginButton}
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

              <View style={styles.signupPrompt}>
                <ThemedText style={styles.signupText}>Don't have an account?</ThemedText>
          <TouchableOpacity onPress={() => router.push('/signup')}>
                  <ThemedText style={styles.signupLink}>Create Account</ThemedText>
          </TouchableOpacity>
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
    paddingVertical: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...GoldTheme.shadow.gold,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: GoldTheme.text.inverse,
  },
  welcomeTitle: {
    fontSize: 32,
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
    paddingTop: 20,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 32,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: GoldTheme.gold.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
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
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: GoldTheme.text.secondary,
    fontSize: 16,
    marginRight: 8,
  },
  signupLink: {
    color: GoldTheme.gold.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
