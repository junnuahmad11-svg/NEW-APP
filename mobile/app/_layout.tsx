import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../store/auth.store';

export default function RootLayout() {
  const { loadStoredSession } = useAuthStore();

  useEffect(() => {
    loadStoredSession();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#D32F2F" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#D32F2F' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="account/[id]"
          options={{ title: 'Account Details' }}
        />
        <Stack.Screen
          name="rd-lot"
          options={{ title: 'Create RD Lot' }}
        />
        <Stack.Screen
          name="payment-webview"
          options={{ title: 'India Post Portal' }}
        />
        <Stack.Screen
          name="plans"
          options={{ title: 'Savings Plans' }}
        />
      </Stack>
      <Toast />
    </SafeAreaProvider>
  );
}
