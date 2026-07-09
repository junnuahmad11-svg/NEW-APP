import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '../../services/api.service';
import { useAuthStore } from '../../store/auth.store';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface StatCard {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

interface QuickAction {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { title: 'Collection', icon: 'cash-outline', route: '/(tabs)/collection', color: COLORS.success },
  { title: 'RD Lot', icon: 'layers-outline', route: '/rd-lot', color: COLORS.secondary },
  { title: 'Accounts', icon: 'people-outline', route: '/(tabs)/accounts', color: COLORS.info },
  { title: 'Reports', icon: 'document-text-outline', route: '/(tabs)/reports', color: COLORS.primary },
  { title: 'Plans', icon: 'calculator-outline', route: '/plans', color: '#9C27B0' },
  { title: 'Portal', icon: 'globe-outline', route: '/payment-webview', color: '#FF5722' },
];

export default function DashboardScreen() {
  const { agentName, agentId } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await apiService.getDashboard();
      setDashboardData(data.data);
    } catch (error: any) {
      if (error.isSessionExpired) {
        router.replace('/(auth)/login');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadDashboard();
  };

  const statCards: StatCard[] = [
    {
      title: 'Total Accounts',
      value: dashboardData?.totalAccounts?.toString() || '--',
      icon: 'people',
      color: COLORS.info,
      bgColor: '#E3F2FD',
    },
    {
      title: 'Active Accounts',
      value: dashboardData?.activeAccounts?.toString() || '--',
      icon: 'checkmark-circle',
      color: COLORS.success,
      bgColor: '#E8F5E9',
    },
    {
      title: 'Due Today',
      value: dashboardData?.dueToday?.toString() || '--',
      icon: 'alert-circle',
      color: COLORS.warning,
      bgColor: '#FFF3E0',
    },
    {
      title: 'Pending Amount',
      value: dashboardData?.pendingAmount || '₹--',
      icon: 'cash',
      color: COLORS.error,
      bgColor: '#FFEBEE',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.lg }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
        />
      }
    >
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <View>
          <Text style={styles.welcomeText}>Welcome Back 👋</Text>
          <Text style={styles.agentName}>{agentName || agentId}</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {(agentName || agentId || 'A').charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Overview</Text>
        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} size="large" />
        ) : (
          <View style={styles.statsGrid}>
            {statCards.map((card, index) => (
              <View key={index} style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: card.bgColor }]}>
                  <Ionicons name={card.icon} size={24} color={card.color} />
                </View>
                <Text style={styles.statValue}>{card.value}</Text>
                <Text style={styles.statTitle}>{card.title}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBg, { backgroundColor: `${action.color}15` }]}>
                <Ionicons name={action.icon} size={26} color={action.color} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notice */}
      <View style={styles.noticeCard}>
        <Ionicons name="information-circle" size={20} color={COLORS.secondary} />
        <Text style={styles.noticeText}>
          All payments are processed through the official India Post portal for security.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  headerBanner: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  agentName: { color: COLORS.white, fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  dateText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: 22, fontWeight: 'bold' },
  statsContainer: { padding: SPACING.md },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    width: '47%',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  statTitle: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },
  actionsContainer: { paddingHorizontal: SPACING.md, marginTop: SPACING.xs },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  actionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    width: '30%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  actionIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  actionTitle: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },
  noticeText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
});import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '../../services/api.service';
import { useAuthStore } from '../../store/auth.store';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface StatCard {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

interface QuickAction {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { title: 'Collection', icon: 'cash-outline', route: '/(tabs)/collection', color: COLORS.success },
  { title: 'RD Lot', icon: 'layers-outline', route: '/rd-lot', color: COLORS.secondary },
  { title: 'Accounts', icon: 'people-outline', route: '/(tabs)/accounts', color: COLORS.info },
  { title: 'Reports', icon: 'document-text-outline', route: '/(tabs)/reports', color: COLORS.primary },
  { title: 'Plans', icon: 'calculator-outline', route: '/plans', color: '#9C27B0' },
  { title: 'Portal', icon: 'globe-outline', route: '/payment-webview', color: '#FF5722' },
];

export default function DashboardScreen() {
  const { agentName, agentId } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await apiService.getDashboard();
      setDashboardData(data.data);
    } catch (error: any) {
      if (error.isSessionExpired) {
        router.replace('/(auth)/login');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadDashboard();
  };

  const statCards: StatCard[] = [
    {
      title: 'Total Accounts',
      value: dashboardData?.totalAccounts?.toString() || '--',
      icon: 'people',
      color: COLORS.info,
      bgColor: '#E3F2FD',
    },
    {
      title: 'Active Accounts',
      value: dashboardData?.activeAccounts?.toString() || '--',
      icon: 'checkmark-circle',
      color: COLORS.success,
      bgColor: '#E8F5E9',
    },
    {
      title: 'Due Today',
      value: dashboardData?.dueToday?.toString() || '--',
      icon: 'alert-circle',
      color: COLORS.warning,
      bgColor: '#FFF3E0',
    },
    {
      title: 'Pending Amount',
      value: dashboardData?.pendingAmount || '₹--',
      icon: 'cash',
      color: COLORS.error,
      bgColor: '#FFEBEE',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.lg }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
        />
      }
    >
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <View>
          <Text style={styles.welcomeText}>Welcome Back 👋</Text>
          <Text style={styles.agentName}>{agentName || agentId}</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {(agentName || agentId || 'A').charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Overview</Text>
        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} size="large" />
        ) : (
          <View style={styles.statsGrid}>
            {statCards.map((card, index) => (
              <View key={index} style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: card.bgColor }]}>
                  <Ionicons name={card.icon} size={24} color={card.color} />
                </View>
                <Text style={styles.statValue}>{card.value}</Text>
                <Text style={styles.statTitle}>{card.title}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBg, { backgroundColor: `${action.color}15` }]}>
                <Ionicons name={action.icon} size={26} color={action.color} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notice */}
      <View style={styles.noticeCard}>
        <Ionicons name="information-circle" size={20} color={COLORS.secondary} />
        <Text style={styles.noticeText}>
          All payments are processed through the official India Post portal for security.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  headerBanner: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  agentName: { color: COLORS.white, fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  dateText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: 22, fontWeight: 'bold' },
  statsContainer: { padding: SPACING.md },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    width: '47%',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  statTitle: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },
  actionsContainer: { paddingHorizontal: SPACING.md, marginTop: SPACING.xs },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  actionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    width: '30%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  actionIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  actionTitle: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },
  noticeText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
});
