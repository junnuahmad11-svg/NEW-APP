import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';

const PORTAL_URL =
  'https://dopagent.indiapost.gov.in/corp/AuthenticationController?FORMSGROUP_ID__=AuthenticationFG&START_TRAN_FLAG=Y&FG_BUTTONS=LOAD&ACTION.LOAD=Y&AuthenticationFG.LOGIN_FLAG=3&BANK_ID=DOP&AGENT_FLAG=Y';

export default function PaymentWebViewScreen() {
  const { accountNo } = useLocalSearchParams<{ accountNo?: string }>();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  const handleNavigationStateChange = (state: any) => {
    setCanGoBack(state.canGoBack);
    setCurrentUrl(state.url);
  };

  const handleClose = () => {
    Alert.alert('Leave Portal?', 'Are you sure you want to leave the India Post portal?', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Leave', onPress: () => router.back() },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => canGoBack ? webViewRef.current?.goBack() : handleClose()}
          style={styles.headerBtn}
        >
          <Ionicons
            name={canGoBack ? 'arrow-back' : 'close'}
            size={22}
            color={COLORS.white}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.secureBadge}>
            <Ionicons name="lock-closed" size={10} color={COLORS.success} />
            <Text style={styles.secureText}>Secure</Text>
          </View>
          <Text style={styles.headerUrl} numberOfLines={1}>
            {currentUrl ? new URL(currentUrl).hostname : 'India Post Portal'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => webViewRef.current?.reload()}
          style={styles.headerBtn}
        >
          <Ionicons name="refresh-outline" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Warning Banner */}
      <View style={styles.warningBanner}>
        <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.success} />
        <Text style={styles.warningText}>
          Official India Post Portal – Complete your transaction manually.
        </Text>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: PORTAL_URL }}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading India Post Portal...</Text>
          </View>
        )}
        style={{ flex: 1 }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  headerBtn: {
    padding: SPACING.sm,
    borderRadius: 20,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 2,
  },
  secureText: { color: COLORS.success, fontSize: 10 },
  headerUrl: { color: 'rgba(255,255,255,0.9)', fontSize: 11 },
  warningBanner: {
    backgroundColor: '#E8F5E9',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    gap: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  warningText: { fontSize: 11, color: COLORS.textSecondary, flex: 1 },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loaderText: { color: COLORS.textSecondary },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';

const PORTAL_URL =
  'https://dopagent.indiapost.gov.in/corp/AuthenticationController?FORMSGROUP_ID__=AuthenticationFG&START_TRAN_FLAG=Y&FG_BUTTONS=LOAD&ACTION.LOAD=Y&AuthenticationFG.LOGIN_FLAG=3&BANK_ID=DOP&AGENT_FLAG=Y';

export default function PaymentWebViewScreen() {
  const { accountNo } = useLocalSearchParams<{ accountNo?: string }>();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  const handleNavigationStateChange = (state: any) => {
    setCanGoBack(state.canGoBack);
    setCurrentUrl(state.url);
  };

  const handleClose = () => {
    Alert.alert('Leave Portal?', 'Are you sure you want to leave the India Post portal?', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Leave', onPress: () => router.back() },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => canGoBack ? webViewRef.current?.goBack() : handleClose()}
          style={styles.headerBtn}
        >
          <Ionicons
            name={canGoBack ? 'arrow-back' : 'close'}
            size={22}
            color={COLORS.white}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.secureBadge}>
            <Ionicons name="lock-closed" size={10} color={COLORS.success} />
            <Text style={styles.secureText}>Secure</Text>
          </View>
          <Text style={styles.headerUrl} numberOfLines={1}>
            {currentUrl ? new URL(currentUrl).hostname : 'India Post Portal'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => webViewRef.current?.reload()}
          style={styles.headerBtn}
        >
          <Ionicons name="refresh-outline" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Warning Banner */}
      <View style={styles.warningBanner}>
        <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.success} />
        <Text style={styles.warningText}>
          Official India Post Portal – Complete your transaction manually.
        </Text>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: PORTAL_URL }}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading India Post Portal...</Text>
          </View>
        )}
        style={{ flex: 1 }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  headerBtn: {
    padding: SPACING.sm,
    borderRadius: 20,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 2,
  },
  secureText: { color: COLORS.success, fontSize: 10 },
  headerUrl: { color: 'rgba(255,255,255,0.9)', fontSize: 11 },
  warningBanner: {
    backgroundColor: '#E8F5E9',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    gap: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  warningText: { fontSize: 11, color: COLORS.textSecondary, flex: 1 },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loaderText: { color: COLORS.textSecondary },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';

const PORTAL_URL =
  'https://dopagent.indiapost.gov.in/corp/AuthenticationController?FORMSGROUP_ID__=AuthenticationFG&START_TRAN_FLAG=Y&FG_BUTTONS=LOAD&ACTION.LOAD=Y&AuthenticationFG.LOGIN_FLAG=3&BANK_ID=DOP&AGENT_FLAG=Y';

export default function PaymentWebViewScreen() {
  const { accountNo } = useLocalSearchParams<{ accountNo?: string }>();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  const handleNavigationStateChange = (state: any) => {
    setCanGoBack(state.canGoBack);
    setCurrentUrl(state.url);
  };

  const handleClose = () => {
    Alert.alert('Leave Portal?', 'Are you sure you want to leave the India Post portal?', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Leave', onPress: () => router.back() },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => canGoBack ? webViewRef.current?.goBack() : handleClose()}
          style={styles.headerBtn}
        >
          <Ionicons
            name={canGoBack ? 'arrow-back' : 'close'}
            size={22}
            color={COLORS.white}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.secureBadge}>
            <Ionicons name="lock-closed" size={10} color={COLORS.success} />
            <Text style={styles.secureText}>Secure</Text>
          </View>
          <Text style={styles.headerUrl} numberOfLines={1}>
            {currentUrl ? new URL(currentUrl).hostname : 'India Post Portal'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => webViewRef.current?.reload()}
          style={styles.headerBtn}
        >
          <Ionicons name="refresh-outline" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Warning Banner */}
      <View style={styles.warningBanner}>
        <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.success} />
        <Text style={styles.warningText}>
          Official India Post Portal – Complete your transaction manually.
        </Text>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: PORTAL_URL }}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading India Post Portal...</Text>
          </View>
        )}
        style={{ flex: 1 }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  headerBtn: {
    padding: SPACING.sm,
    borderRadius: 20,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 2,
  },
  secureText: { color: COLORS.success, fontSize: 10 },
  headerUrl: { color: 'rgba(255,255,255,0.9)', fontSize: 11 },
  warningBanner: {
    backgroundColor: '#E8F5E9',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    gap: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  warningText: { fontSize: 11, color: COLORS.textSecondary, flex: 1 },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loaderText: { color: COLORS.textSecondary },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
