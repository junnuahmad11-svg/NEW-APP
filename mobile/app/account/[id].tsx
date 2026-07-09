import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api.service';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface AccountDetail {
  accountNo: string;
  accountHolder: string;
  balance: string;
  status: string;
  type: string;
  monthlyInstallment?: string;
  openDate?: string;
  maturityDate?: string;
  nominee?: string;
  transactions?: Array<{ date: string; amount: string; type: string }>;
}

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAccountDetails();
  }, [id]);

  const loadAccountDetails = async () => {
    try {
      const data = await apiService.getAccountDetails(id);
      setAccount(data.account);
    } catch (error: any) {
      if (error.isSessionExpired) router.replace('/(auth)/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!account) return;
    try {
      await Share.share({
        message: `India Post Account Details\n\nAccount No: ${account.accountNo}\nHolder: ${account.accountHolder}\nType: ${account.type}\nBalance: ${account.balance}\nStatus: ${account.status}`,
        title: 'Account Details',
      });
    } catch {}
  };

  const handleProceedToPay = () => {
    Alert.alert(
      '⚠️ Important Notice',
      'You will be redirected to the official India Post portal to complete the payment. All transactions must be confirmed on the official site.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed to Official Portal',
          onPress: () =>
            router.push({
              pathname: '/payment-webview',
              params: { accountNo: account?.accountNo },
            }),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Loading account details...</Text>
      </View>
    );
  }

  if (!account) {
    return (
      <View style={styles.loader}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>Failed to load account details</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAccountDetails}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const infoRows = [
    { label: 'Account No', value: account.accountNo, icon: 'card-outline' },
    { label: 'Account Type', value: account.type, icon: 'bookmark-outline' },
    { label: 'Status', value: account.status, icon: 'radio-button-on-outline' },
    { label: 'Open Date', value: account.openDate || 'N/A', icon: 'calendar-outline' },
    { label: 'Maturity Date', value: account.maturityDate || 'N/A', icon: 'time-outline' },
    { label: 'Monthly Installment', value: account.monthlyInstallment || 'N/A', icon: 'repeat-outline' },
    { label: 'Nominee', value: account.nominee || 'N/A', icon: 'person-outline' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {account.accountHolder.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.holderName}>{account.accountHolder}</Text>
        <Text style={styles.accountNo}>{account.accountNo}</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceValue}>{account.balance}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color={COLORS.primary} />
          <Text style={styles.actionBtnText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.payBtn]}
          onPress={handleProceedToPay}
        >
          <Ionicons name="globe-outline" size={20} color={COLORS.white} />
          <Text style={[styles.actionBtnText, { color: COLORS.white }]}>Proceed to Pay</Text>
        </TouchableOpacity>
      </View>

      {/* Account Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        {infoRows.map((row, index) => (
          <View key={index} style={[styles.infoRow, index < infoRows.length - 1 && styles.infoRowBorder]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name={row.icon as any} size={16} color={COLORS.textSecondary} />
              <Text style={styles.infoLabel}>{row.label}</Text>
            </View>
            <Text style={styles.infoValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      {/* Transactions */}
      {account.transactions && account.transactions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {account.transactions.map((txn, index) => (
            <View key={index} style={[styles.txnRow, index < account.transactions!.length - 1 && styles.infoRowBorder]}>
              <View>
                <Text style={styles.txnDate}>{txn.date}</Text>
                <Text style={styles.txnType}>{txn.type}</Text>
              </View>
              <Text
                style={[
                  styles.txnAmount,
                  { color: txn.type === 'Credit' ? COLORS.success : COLORS.error },
                ]}
              >
                {txn.amount}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Pay Notice */}
      <View style={styles.payNotice}>
        <Ionicons name="lock-closed" size={16} color={COLORS.success} />
        <Text style={styles.payNoticeText}>
          Payments are processed securely on the official India Post portal.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { paddingBottom: SPACING.xl },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  loaderText: { color: COLORS.textSecondary },
  errorText: { fontSize: 16, color: COLORS.error },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  retryText: { color: COLORS.white, fontWeight: 'bold' },
  headerCard: {
    backgroundColor: COLORS.primary,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarText: { fontSize: 30, fontWeight: 'bold', color: COLORS.white },
  holderName: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  accountNo: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  balanceContainer: {
    marginTop: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    minWidth: 160,
  },
  balanceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  balanceValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.white, marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.xs,
    elevation: 1,
  },
  payBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    flex: 2,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary, textAlign: 'right', flex: 1, marginLeft: SPACING.sm },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  txnDate: { fontSize: 13, color: COLORS.textPrimary },
  txnType: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  txnAmount: { fontSize: 15, fontWeight: 'bold' },
  payNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F5E9',
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  payNoticeText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
});import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api.service';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface AccountDetail {
  accountNo: string;
  accountHolder: string;
  balance: string;
  status: string;
  type: string;
  monthlyInstallment?: string;
  openDate?: string;
  maturityDate?: string;
  nominee?: string;
  transactions?: Array<{ date: string; amount: string; type: string }>;
}

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAccountDetails();
  }, [id]);

  const loadAccountDetails = async () => {
    try {
      const data = await apiService.getAccountDetails(id);
      setAccount(data.account);
    } catch (error: any) {
      if (error.isSessionExpired) router.replace('/(auth)/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!account) return;
    try {
      await Share.share({
        message: `India Post Account Details\n\nAccount No: ${account.accountNo}\nHolder: ${account.accountHolder}\nType: ${account.type}\nBalance: ${account.balance}\nStatus: ${account.status}`,
        title: 'Account Details',
      });
    } catch {}
  };

  const handleProceedToPay = () => {
    Alert.alert(
      '⚠️ Important Notice',
      'You will be redirected to the official India Post portal to complete the payment. All transactions must be confirmed on the official site.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed to Official Portal',
          onPress: () =>
            router.push({
              pathname: '/payment-webview',
              params: { accountNo: account?.accountNo },
            }),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Loading account details...</Text>
      </View>
    );
  }

  if (!account) {
    return (
      <View style={styles.loader}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>Failed to load account details</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAccountDetails}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const infoRows = [
    { label: 'Account No', value: account.accountNo, icon: 'card-outline' },
    { label: 'Account Type', value: account.type, icon: 'bookmark-outline' },
    { label: 'Status', value: account.status, icon: 'radio-button-on-outline' },
    { label: 'Open Date', value: account.openDate || 'N/A', icon: 'calendar-outline' },
    { label: 'Maturity Date', value: account.maturityDate || 'N/A', icon: 'time-outline' },
    { label: 'Monthly Installment', value: account.monthlyInstallment || 'N/A', icon: 'repeat-outline' },
    { label: 'Nominee', value: account.nominee || 'N/A', icon: 'person-outline' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {account.accountHolder.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.holderName}>{account.accountHolder}</Text>
        <Text style={styles.accountNo}>{account.accountNo}</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceValue}>{account.balance}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color={COLORS.primary} />
          <Text style={styles.actionBtnText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.payBtn]}
          onPress={handleProceedToPay}
        >
          <Ionicons name="globe-outline" size={20} color={COLORS.white} />
          <Text style={[styles.actionBtnText, { color: COLORS.white }]}>Proceed to Pay</Text>
        </TouchableOpacity>
      </View>

      {/* Account Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        {infoRows.map((row, index) => (
          <View key={index} style={[styles.infoRow, index < infoRows.length - 1 && styles.infoRowBorder]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name={row.icon as any} size={16} color={COLORS.textSecondary} />
              <Text style={styles.infoLabel}>{row.label}</Text>
            </View>
            <Text style={styles.infoValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      {/* Transactions */}
      {account.transactions && account.transactions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {account.transactions.map((txn, index) => (
            <View key={index} style={[styles.txnRow, index < account.transactions!.length - 1 && styles.infoRowBorder]}>
              <View>
                <Text style={styles.txnDate}>{txn.date}</Text>
                <Text style={styles.txnType}>{txn.type}</Text>
              </View>
              <Text
                style={[
                  styles.txnAmount,
                  { color: txn.type === 'Credit' ? COLORS.success : COLORS.error },
                ]}
              >
                {txn.amount}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Pay Notice */}
      <View style={styles.payNotice}>
        <Ionicons name="lock-closed" size={16} color={COLORS.success} />
        <Text style={styles.payNoticeText}>
          Payments are processed securely on the official India Post portal.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { paddingBottom: SPACING.xl },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  loaderText: { color: COLORS.textSecondary },
  errorText: { fontSize: 16, color: COLORS.error },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  retryText: { color: COLORS.white, fontWeight: 'bold' },
  headerCard: {
    backgroundColor: COLORS.primary,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarText: { fontSize: 30, fontWeight: 'bold', color: COLORS.white },
  holderName: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  accountNo: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  balanceContainer: {
    marginTop: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    minWidth: 160,
  },
  balanceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  balanceValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.white, marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.xs,
    elevation: 1,
  },
  payBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    flex: 2,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary, textAlign: 'right', flex: 1, marginLeft: SPACING.sm },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  txnDate: { fontSize: 13, color: COLORS.textPrimary },
  txnType: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  txnAmount: { fontSize: 15, fontWeight: 'bold' },
  payNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F5E9',
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  payNoticeText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
});
