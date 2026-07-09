import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../store/auth.store';
import { apiService } from '../../services/api.service';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

export default function SettingsScreen() {
  const { agentId, agentName, sessionId, clearSession } = useAuthStore();
  const [autoLogin, setAutoLogin] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              if (sessionId) await apiService.logout(sessionId);
            } catch {}
            await clearSession();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const settingGroups = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-circle-outline',
          label: 'Agent ID',
          value: agentId || 'N/A',
          type: 'info',
        },
        {
          icon: 'badge-outline',
          label: 'Agent Name',
          value: agentName || 'N/A',
          type: 'info',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'key-outline',
          label: 'Auto Login',
          type: 'toggle',
          value: autoLogin,
          onToggle: setAutoLogin,
        },
      ],
    },
    {
      title: 'Information',
      items: [
        {
          icon: 'globe-outline',
          label: 'Official Portal',
          value: 'dopagent.indiapost.gov.in',
          type: 'link',
          onPress: () => router.push('/payment-webview'),
        },
        {
          icon: 'information-circle-outline',
          label: 'App Version',
          value: '1.0.0',
          type: 'info',
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(agentName || agentId || 'A').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.profileName}>{agentName || 'Agent'}</Text>
        <Text style={styles.profileId}>ID: {agentId}</Text>
      </View>

      {/* Settings Groups */}
      {settingGroups.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <View style={styles.groupCard}>
            {group.items.map((item: any, index) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.settingRow,
                  index < group.items.length - 1 && styles.settingRowBorder,
                ]}
                onPress={item.onPress}
                disabled={!item.onPress && item.type !== 'toggle'}
              >
                <View style={styles.settingLeft}>
                  <View style={styles.settingIconBg}>
                    <Ionicons name={item.icon} size={18} color={COLORS.primary} />
                  </View>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                </View>

                {item.type === 'toggle' ? (
                  <Switch
                    value={item.value}
                    onValueChange={item.onToggle}
                    trackColor={{ false: COLORS.border, true: `${COLORS.primary}50` }}
                    thumbColor={item.value ? COLORS.primary : COLORS.textDisabled}
                  />
                ) : (
                  <View style={styles.settingRight}>
                    <Text style={styles.settingValue} numberOfLines={1}>
                      {item.value}
                    </Text>
                    {item.type === 'link' && (
                      <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary} />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Logout */}
      <View style={styles.group}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        India Post DOP Agent App{'\n'}
        ⚠️ Payments processed on official portal only
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  profileHeader: {
    backgroundColor: COLORS.primary,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: COLORS.white },
  profileName: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  profileId: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  group: { marginHorizontal: SPACING.md, marginTop: SPACING.md },
  groupTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
    paddingLeft: SPACING.xs,
  },
  groupCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  settingIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: { fontSize: 15, color: COLORS.textPrimary },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 150 },
  settingValue: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'right' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    elevation: 1,
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
  },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: COLORS.error },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textDisabled,
    padding: SPACING.xl,
    lineHeight: 18,
  },
});
