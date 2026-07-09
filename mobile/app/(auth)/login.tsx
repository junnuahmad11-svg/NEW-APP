import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { apiService } from '../../services/api.service';
import { useAuthStore } from '../../store/auth.store';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

export default function LoginScreen() {
  const { setSession } = useAuthStore();

  const [tempToken, setTempToken] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [agentId, setAgentId] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false);

  const initLogin = useCallback(async () => {
    setIsCaptchaLoading(true);
    try {
      const data = await apiService.initLogin();
      setTempToken(data.tempToken);
      setCaptchaImage(data.captchaImage);

      // Auto-fill saved agent ID
      const savedId = await SecureStore.getItemAsync('savedAgentId');
      if (savedId) setAgentId(savedId);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: 'Could not connect to server. Check your internet.',
      });
    } finally {
      setIsCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    initLogin();
  }, []);

  const handleRefreshCaptcha = async () => {
    setIsCaptchaLoading(true);
    setCaptcha('');
    try {
      const data = await apiService.refreshCaptcha(tempToken);
      setCaptchaImage(data.captchaImage);
    } catch {
      await initLogin();
    } finally {
      setIsCaptchaLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!agentId.trim()) {
      Toast.show({ type: 'error', text1: 'Enter Agent ID' });
      return;
    }
    if (!password.trim()) {
      Toast.show({ type: 'error', text1: 'Enter Password' });
      return;
    }
    if (!captcha.trim()) {
      Toast.show({ type: 'error', text1: 'Enter Captcha' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiService.login({
        tempToken,
        agentId: agentId.trim(),
        password: password.trim(),
        captcha: captcha.trim(),
      });

      if (result.success) {
        // Save agent ID for next login
        await SecureStore.setItemAsync('savedAgentId', agentId.trim());
        await setSession(result.sessionId, result.agentId, result.agentName);

        Toast.show({ type: 'success', text1: `Welcome, ${result.agentName}!` });
        router.replace('/(tabs)');
      } else {
        Toast.show({ type: 'error', text1: 'Login Failed', text2: result.error });
        await initLogin(); // Refresh captcha on failure
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Login Error',
        text2: error.message || 'Please try again',
      });
      await initLogin();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>📮</Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>India Post</Text>
        <Text style={styles.headerSubtitle}>DOP Agent Portal</Text>
      </View>

      {/* Form */}
      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.formTitle}>Agent Login</Text>

        {/* Agent ID */}
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Agent ID</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color={COLORS.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={agentId}
              onChangeText={setAgentId}
              placeholder="Enter your Agent ID"
              placeholderTextColor={COLORS.textDisabled}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={COLORS.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.textDisabled}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Captcha */}
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Captcha Verification</Text>

          {/* Captcha Image */}
          <View style={styles.captchaContainer}>
            {isCaptchaLoading ? (
              <ActivityIndicator color={COLORS.primary} size="large" />
            ) : captchaImage ? (
              <Image
                source={{ uri: captchaImage }}
                style={styles.captchaImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.captchaError}>Failed to load captcha</Text>
            )}
            <TouchableOpacity
              onPress={handleRefreshCaptcha}
              style={styles.refreshButton}
              disabled={isCaptchaLoading}
            >
              <Ionicons
                name="refresh-outline"
                size={22}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={COLORS.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={captcha}
              onChangeText={setCaptcha}
              placeholder="Enter captcha text"
              placeholderTextColor={COLORS.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.loginButtonText}>LOGIN</Text>
          )}
        </TouchableOpacity>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.disclaimerText}>
            This app uses official India Post credentials. Payments are processed on the official portal.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoContainer: { marginBottom: SPACING.sm },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  logoText: { fontSize: 40 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  formContainer: { flex: 1 },
  formContent: { padding: SPACING.lg },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  inputWrapper: { marginBottom: SPACING.md },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
  },
  inputIcon: { marginRight: SPACING.xs },
  input: {
    flex: 1,
    height: 50,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  eyeIcon: { padding: SPACING.xs },
  captchaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    minHeight: 70,
    justifyContent: 'space-between',
  },
  captchaImage: { height: 55, flex: 1, borderRadius: BORDER_RADIUS.sm },
  captchaError: { color: COLORS.error, fontSize: 13 },
  refreshButton: { padding: SPACING.sm },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    elevation: 3,
    marginTop: SPACING.sm,
  },
  loginButtonDisabled: { backgroundColor: COLORS.textDisabled },
  loginButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.lg,
    padding: SPACING.sm,
    backgroundColor: '#FFF3E0',
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
});
