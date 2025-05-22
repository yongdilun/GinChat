import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { GoldButton } from '../src/components/GoldButton';
import { GoldTheme } from '../constants/GoldTheme';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  // Show loading while checking auth status
  if (isLoading) {
    return (
      <LinearGradient
        colors={[GoldTheme.background.primary, GoldTheme.background.secondary]}
        style={styles.loadingContainer}
      >
        <StatusBar barStyle="light-content" backgroundColor={GoldTheme.background.primary} />
        <ActivityIndicator size="large" color={GoldTheme.gold.primary} />
        <Text style={styles.loadingText}>Initializing GinChat...</Text>
      </LinearGradient>
    );
  }

  // If authenticated, the ProtectedRoute will handle the redirect
  // This component will only render for unauthenticated users
  return (
    <LinearGradient
      colors={[GoldTheme.background.primary, GoldTheme.background.secondary]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={GoldTheme.background.primary} />
      
      {/* Background decoration */}
      <View style={styles.backgroundDecoration}>
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.1)', 'transparent']}
          style={styles.goldGlow}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={GoldTheme.gradients.goldShimmer}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoText}>G</Text>
            </LinearGradient>
          </View>
          
          <Text style={styles.title}>GinChat</Text>
          <Text style={styles.subtitle}>Elite Messaging Experience</Text>

          <View style={styles.taglineContainer}>
            <Text style={styles.tagline}>Connect • Communicate • Celebrate</Text>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          <Text style={styles.welcomeText}>
            Welcome to Gin Chat
          </Text>
          <Text style={styles.descriptionText}>
            Experience seamless real-time communication with elegant design and premium features.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <GoldButton
            title="Sign In"
            onPress={() => router.push('/login')}
            size="large"
            style={styles.primaryButton}
          />
          
          <GoldButton
            title="Create Account"
            onPress={() => router.push('/signup')}
            variant="outline"
            size="large"
            style={styles.secondaryButton}
          />
          
          <View style={styles.featureHints}>
            <Text style={styles.featureText}>✨ Real-time messaging</Text>
            <Text style={styles.featureText}>🔐 Secure & encrypted</Text>
          </View>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: GoldTheme.background.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: GoldTheme.text.secondary,
    fontWeight: '500',
  },
  backgroundDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  goldGlow: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    height: 400,
    borderRadius: 200,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 40,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...GoldTheme.shadow.gold,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: GoldTheme.text.inverse,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: GoldTheme.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: GoldTheme.gold.primary,
    marginBottom: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  taglineContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  tagline: {
    fontSize: 14,
    color: GoldTheme.gold.light,
    textAlign: 'center',
    fontWeight: '500',
  },
  contentSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: GoldTheme.text.primary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 32,
  },
  descriptionText: {
    fontSize: 16,
    color: GoldTheme.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
  actionSection: {
    paddingBottom: 20,
  },
  primaryButton: {
    marginBottom: 16,
  },
  secondaryButton: {
    marginBottom: 32,
  },
  featureHints: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
  featureText: {
    fontSize: 14,
    color: GoldTheme.text.muted,
    marginBottom: 8,
    fontWeight: '500',
  },
});
