import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, Account } from '../../store/app.store';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

type PaymentMode = 'Cash' | 'UPI' | 'Cheque' | 'Pending';

interface CollectionEntry {
  account: Account;
  paymentMode: PaymentMode;
  collected: boolean;
}

const PAYMENT_MODES: PaymentMode[] = ['Cash', 'UPI', 'Cheque', 'Pending'];
const MODE_COLORS: Record<PaymentMode, string> = {
  Cash: COLORS.success,
  UPI: COLORS.info,
  Cheque: COLORS.secondary,
  Pending: COLORS.error,
};

export default function CollectionScreen() {
  const { accounts } = useAppStore();
  const rdAccounts = accounts.filter((a) => a.type === 'RD' && a.status === 'Active');

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [collections, setCollections] = useState<Map<string, CollectionEntry>>(
    new Map(
      rdAccounts.map((a) => [
        a.accountNo,
        { account: a, paymentMode: 'Pending', collected: false },
      ])
    )
  );

  const totalCollected = Array.from(collections.values()).filter((c) => c.collected).length;
  const totalPending = rdAccounts.length - totalCollected;

  const setPaymentMode = (accountNo: string, mode: PaymentMode) => {
    const next = new Map(collections);
    const entry = next.get(accountNo);
    if (entry) {
      next.set(accountNo, { ...entry, paymentMode: mode, collected: mode !== 'Pending' });
    }
    setCollections(next);
  };

  const handleGenerateSMS = async () => {
    const collectedEntries = Array.from(collections.values()).filter((c) => c.collected);
    const total = collectedEntries.reduce(
      (sum, e) => sum + parseInt(e.account.monthlyInstallment?.replace(/[^0-9]/g, '') || '0'),
      0
    );

    const smsText = [
      `📮 RD Collection Report`,
      `Date: ${selectedDate.toLocaleDateString('en-IN')}`,
      ``,
      `Collected: ${collectedEntries.length} accounts`,
      `Pending: ${totalPending} accounts`,
      `Total: ₹${total.toLocaleString('en-IN')}`,
      ``,
      ...collectedEntries.map(
        (e) => `✅ ${e.account.accountHolder} - ${e.paymentMode}`
      ),
    ].join('\n');

    await Share.share({ message: smsText, title: 'Collection Report' });
  };

  const renderItem = ({ item: entry }: { item: CollectionEntry }) => (
    <View style={styles.collectionCard}>
      <View style={styles.cardTop}>
        <View style={styles.accountInfo}>
          <Text style={styles.holderName}>{entry.account.accountHolder}</Text>
          <Text style={styles.accountNo}>{entry.account.accountNo}</Text>
          <Text style={styles.amount}>
            ₹ {entry.account.monthlyInstallment || 'N/A'}
          </Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: entry.collected ? COLORS.success : COLORS.error }]} />
      </View>

      <View style={styles.modeRow}>
        {PAYMENT_MODES.map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeBtn,
              entry.paymentMode === mode && { backgroundColor: MODE_COLORS[mode], borderColor: MODE_COLORS[mode] },
            ]}
            onPress={() => setPaymentMode(entry.account.accountNo, mode)}
          >
            <Text
              style={[
                styles.modeBtnText,
                entry.paymentMode === mode && { color: COLORS.white },
              ]}
            >
              {mode}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{rdAccounts.length}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
        <View style={[styles.statItem, styles.statItemBorder]}>
          <Text style={[styles.statNum, { color: COLORS.success }]}>{totalCollected}</Text>
          <Text style={styles.statLbl}>Collected</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: COLORS.error }]}>{totalPending}</Text>
          <Text style={styles.statLbl}>Pending</Text>
        </View>
      </View>

      {/* Date */}
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
        <Text style={styles.dateText}>
          {selectedDate.toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={Array.from(collections.values())}
        keyExtractor={(item) => item.account.accountNo}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.textDisabled} />
            <Text style={styles.emptyText}>No RD accounts due today</Text>
          </View>
        }
      />

      {/* SMS Button */}
      {totalCollected > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.smsButton} onPress={handleGenerateSMS}>
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.white} />
            <Text style={styles.smsButtonText}>Generate Collection Report</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: { flex: 1, padding: SPACING.md, alignItems: 'center' },
  statItemBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
  statNum: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  statLbl: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.xs,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
  },
  dateText: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
  listContent: { padding: SPACING.sm },
  collectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  accountInfo: { flex: 1 },
  holderName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  accountNo: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  amount: { fontSize: 13, color: COLORS.success, fontWeight: '500', marginTop: 2 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  modeRow: { flexDirection: 'row', gap: SPACING.xs },
  modeBtn: {
    flex: 1,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modeBtnText: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary },
  empty: { padding: SPACING.xxl, alignItems: 'center', gap: SPACING.sm },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
  footer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  smsButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.success,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  smsButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
});import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, Account } from '../../store/app.store';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

type PaymentMode = 'Cash' | 'UPI' | 'Cheque' | 'Pending';

interface CollectionEntry {
  account: Account;
  paymentMode: PaymentMode;
  collected: boolean;
}

const PAYMENT_MODES: PaymentMode[] = ['Cash', 'UPI', 'Cheque', 'Pending'];
const MODE_COLORS: Record<PaymentMode, string> = {
  Cash: COLORS.success,
  UPI: COLORS.info,
  Cheque: COLORS.secondary,
  Pending: COLORS.error,
};

export default function CollectionScreen() {
  const { accounts } = useAppStore();
  const rdAccounts = accounts.filter((a) => a.type === 'RD' && a.status === 'Active');

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [collections, setCollections] = useState<Map<string, CollectionEntry>>(
    new Map(
      rdAccounts.map((a) => [
        a.accountNo,
        { account: a, paymentMode: 'Pending', collected: false },
      ])
    )
  );

  const totalCollected = Array.from(collections.values()).filter((c) => c.collected).length;
  const totalPending = rdAccounts.length - totalCollected;

  const setPaymentMode = (accountNo: string, mode: PaymentMode) => {
    const next = new Map(collections);
    const entry = next.get(accountNo);
    if (entry) {
      next.set(accountNo, { ...entry, paymentMode: mode, collected: mode !== 'Pending' });
    }
    setCollections(next);
  };

  const handleGenerateSMS = async () => {
    const collectedEntries = Array.from(collections.values()).filter((c) => c.collected);
    const total = collectedEntries.reduce(
      (sum, e) => sum + parseInt(e.account.monthlyInstallment?.replace(/[^0-9]/g, '') || '0'),
      0
    );

    const smsText = [
      `📮 RD Collection Report`,
      `Date: ${selectedDate.toLocaleDateString('en-IN')}`,
      ``,
      `Collected: ${collectedEntries.length} accounts`,
      `Pending: ${totalPending} accounts`,
      `Total: ₹${total.toLocaleString('en-IN')}`,
      ``,
      ...collectedEntries.map(
        (e) => `✅ ${e.account.accountHolder} - ${e.paymentMode}`
      ),
    ].join('\n');

    await Share.share({ message: smsText, title: 'Collection Report' });
  };

  const renderItem = ({ item: entry }: { item: CollectionEntry }) => (
    <View style={styles.collectionCard}>
      <View style={styles.cardTop}>
        <View style={styles.accountInfo}>
          <Text style={styles.holderName}>{entry.account.accountHolder}</Text>
          <Text style={styles.accountNo}>{entry.account.accountNo}</Text>
          <Text style={styles.amount}>
            ₹ {entry.account.monthlyInstallment || 'N/A'}
          </Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: entry.collected ? COLORS.success : COLORS.error }]} />
      </View>

      <View style={styles.modeRow}>
        {PAYMENT_MODES.map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeBtn,
              entry.paymentMode === mode && { backgroundColor: MODE_COLORS[mode], borderColor: MODE_COLORS[mode] },
            ]}
            onPress={() => setPaymentMode(entry.account.accountNo, mode)}
          >
            <Text
              style={[
                styles.modeBtnText,
                entry.paymentMode === mode && { color: COLORS.white },
              ]}
            >
              {mode}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{rdAccounts.length}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
        <View style={[styles.statItem, styles.statItemBorder]}>
          <Text style={[styles.statNum, { color: COLORS.success }]}>{totalCollected}</Text>
          <Text style={styles.statLbl}>Collected</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: COLORS.error }]}>{totalPending}</Text>
          <Text style={styles.statLbl}>Pending</Text>
        </View>
      </View>

      {/* Date */}
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
        <Text style={styles.dateText}>
          {selectedDate.toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={Array.from(collections.values())}
        keyExtractor={(item) => item.account.accountNo}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.textDisabled} />
            <Text style={styles.emptyText}>No RD accounts due today</Text>
          </View>
        }
      />

      {/* SMS Button */}
      {totalCollected > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.smsButton} onPress={handleGenerateSMS}>
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.white} />
            <Text style={styles.smsButtonText}>Generate Collection Report</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: { flex: 1, padding: SPACING.md, alignItems: 'center' },
  statItemBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
  statNum: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  statLbl: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.xs,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
  },
  dateText: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
  listContent: { padding: SPACING.sm },
  collectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  accountInfo: { flex: 1 },
  holderName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  accountNo: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  amount: { fontSize: 13, color: COLORS.success, fontWeight: '500', marginTop: 2 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  modeRow: { flexDirection: 'row', gap: SPACING.xs },
  modeBtn: {
    flex: 1,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modeBtnText: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary },
  empty: { padding: SPACING.xxl, alignItems: 'center', gap: SPACING.sm },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
  footer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  smsButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.success,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  smsButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
});import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, Account } from '../../store/app.store';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

type PaymentMode = 'Cash' | 'UPI' | 'Cheque' | 'Pending';

interface CollectionEntry {
  account: Account;
  paymentMode: PaymentMode;
  collected: boolean;
}

const PAYMENT_MODES: PaymentMode[] = ['Cash', 'UPI', 'Cheque', 'Pending'];
const MODE_COLORS: Record<PaymentMode, string> = {
  Cash: COLORS.success,
  UPI: COLORS.info,
  Cheque: COLORS.secondary,
  Pending: COLORS.error,
};

export default function CollectionScreen() {
  const { accounts } = useAppStore();
  const rdAccounts = accounts.filter((a) => a.type === 'RD' && a.status === 'Active');

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [collections, setCollections] = useState<Map<string, CollectionEntry>>(
    new Map(
      rdAccounts.map((a) => [
        a.accountNo,
        { account: a, paymentMode: 'Pending', collected: false },
      ])
    )
  );

  const totalCollected = Array.from(collections.values()).filter((c) => c.collected).length;
  const totalPending = rdAccounts.length - totalCollected;

  const setPaymentMode = (accountNo: string, mode: PaymentMode) => {
    const next = new Map(collections);
    const entry = next.get(accountNo);
    if (entry) {
      next.set(accountNo, { ...entry, paymentMode: mode, collected: mode !== 'Pending' });
    }
    setCollections(next);
  };

  const handleGenerateSMS = async () => {
    const collectedEntries = Array.from(collections.values()).filter((c) => c.collected);
    const total = collectedEntries.reduce(
      (sum, e) => sum + parseInt(e.account.monthlyInstallment?.replace(/[^0-9]/g, '') || '0'),
      0
    );

    const smsText = [
      `📮 RD Collection Report`,
      `Date: ${selectedDate.toLocaleDateString('en-IN')}`,
      ``,
      `Collected: ${collectedEntries.length} accounts`,
      `Pending: ${totalPending} accounts`,
      `Total: ₹${total.toLocaleString('en-IN')}`,
      ``,
      ...collectedEntries.map(
        (e) => `✅ ${e.account.accountHolder} - ${e.paymentMode}`
      ),
    ].join('\n');

    await Share.share({ message: smsText, title: 'Collection Report' });
  };

  const renderItem = ({ item: entry }: { item: CollectionEntry }) => (
    <View style={styles.collectionCard}>
      <View style={styles.cardTop}>
        <View style={styles.accountInfo}>
          <Text style={styles.holderName}>{entry.account.accountHolder}</Text>
          <Text style={styles.accountNo}>{entry.account.accountNo}</Text>
          <Text style={styles.amount}>
            ₹ {entry.account.monthlyInstallment || 'N/A'}
          </Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: entry.collected ? COLORS.success : COLORS.error }]} />
      </View>

      <View style={styles.modeRow}>
        {PAYMENT_MODES.map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeBtn,
              entry.paymentMode === mode && { backgroundColor: MODE_COLORS[mode], borderColor: MODE_COLORS[mode] },
            ]}
            onPress={() => setPaymentMode(entry.account.accountNo, mode)}
          >
            <Text
              style={[
                styles.modeBtnText,
                entry.paymentMode === mode && { color: COLORS.white },
              ]}
            >
              {mode}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{rdAccounts.length}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
        <View style={[styles.statItem, styles.statItemBorder]}>
          <Text style={[styles.statNum, { color: COLORS.success }]}>{totalCollected}</Text>
          <Text style={styles.statLbl}>Collected</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: COLORS.error }]}>{totalPending}</Text>
          <Text style={styles.statLbl}>Pending</Text>
        </View>
      </View>

      {/* Date */}
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
        <Text style={styles.dateText}>
          {selectedDate.toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={Array.from(collections.values())}
        keyExtractor={(item) => item.account.accountNo}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.textDisabled} />
            <Text style={styles.emptyText}>No RD accounts due today</Text>
          </View>
        }
      />

      {/* SMS Button */}
      {totalCollected > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.smsButton} onPress={handleGenerateSMS}>
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.white} />
            <Text style={styles.smsButtonText}>Generate Collection Report</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: { flex: 1, padding: SPACING.md, alignItems: 'center' },
  statItemBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
  statNum: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  statLbl: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.xs,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
  },
  dateText: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
  listContent: { padding: SPACING.sm },
  collectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  accountInfo: { flex: 1 },
  holderName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  accountNo: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  amount: { fontSize: 13, color: COLORS.success, fontWeight: '500', marginTop: 2 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  modeRow: { flexDirection: 'row', gap: SPACING.xs },
  modeBtn: {
    flex: 1,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modeBtnText: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary },
  empty: { padding: SPACING.xxl, alignItems: 'center', gap: SPACING.sm },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
  footer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  smsButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.success,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  smsButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
});import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, Account } from '../../store/app.store';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

type PaymentMode = 'Cash' | 'UPI' | 'Cheque' | 'Pending';

interface CollectionEntry {
  account: Account;
  paymentMode: PaymentMode;
  collected: boolean;
}

const PAYMENT_MODES: PaymentMode[] = ['Cash', 'UPI', 'Cheque', 'Pending'];
const MODE_COLORS: Record<PaymentMode, string> = {
  Cash: COLORS.success,
  UPI: COLORS.info,
  Cheque: COLORS.secondary,
  Pending: COLORS.error,
};

export default function CollectionScreen() {
  const { accounts } = useAppStore();
  const rdAccounts = accounts.filter((a) => a.type === 'RD' && a.status === 'Active');

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [collections, setCollections] = useState<Map<string, CollectionEntry>>(
    new Map(
      rdAccounts.map((a) => [
        a.accountNo,
        { account: a, paymentMode: 'Pending', collected: false },
      ])
    )
  );

  const totalCollected = Array.from(collections.values()).filter((c) => c.collected).length;
  const totalPending = rdAccounts.length - totalCollected;

  const setPaymentMode = (accountNo: string, mode: PaymentMode) => {
    const next = new Map(collections);
    const entry = next.get(accountNo);
    if (entry) {
      next.set(accountNo, { ...entry, paymentMode: mode, collected: mode !== 'Pending' });
    }
    setCollections(next);
  };

  const handleGenerateSMS = async () => {
    const collectedEntries = Array.from(collections.values()).filter((c) => c.collected);
    const total = collectedEntries.reduce(
      (sum, e) => sum + parseInt(e.account.monthlyInstallment?.replace(/[^0-9]/g, '') || '0'),
      0
    );

    const smsText = [
      `📮 RD Collection Report`,
      `Date: ${selectedDate.toLocaleDateString('en-IN')}`,
      ``,
      `Collected: ${collectedEntries.length} accounts`,
      `Pending: ${totalPending} accounts`,
      `Total: ₹${total.toLocaleString('en-IN')}`,
      ``,
      ...collectedEntries.map(
        (e) => `✅ ${e.account.accountHolder} - ${e.paymentMode}`
      ),
    ].join('\n');

    await Share.share({ message: smsText, title: 'Collection Report' });
  };

  const renderItem = ({ item: entry }: { item: CollectionEntry }) => (
    <View style={styles.collectionCard}>
      <View style={styles.cardTop}>
        <View style={styles.accountInfo}>
          <Text style={styles.holderName}>{entry.account.accountHolder}</Text>
          <Text style={styles.accountNo}>{entry.account.accountNo}</Text>
          <Text style={styles.amount}>
            ₹ {entry.account.monthlyInstallment || 'N/A'}
          </Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: entry.collected ? COLORS.success : COLORS.error }]} />
      </View>

      <View style={styles.modeRow}>
        {PAYMENT_MODES.map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeBtn,
              entry.paymentMode === mode && { backgroundColor: MODE_COLORS[mode], borderColor: MODE_COLORS[mode] },
            ]}
            onPress={() => setPaymentMode(entry.account.accountNo, mode)}
          >
            <Text
              style={[
                styles.modeBtnText,
                entry.paymentMode === mode && { color: COLORS.white },
              ]}
            >
              {mode}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{rdAccounts.length}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
        <View style={[styles.statItem, styles.statItemBorder]}>
          <Text style={[styles.statNum, { color: COLORS.success }]}>{totalCollected}</Text>
          <Text style={styles.statLbl}>Collected</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: COLORS.error }]}>{totalPending}</Text>
          <Text style={styles.statLbl}>Pending</Text>
        </View>
      </View>

      {/* Date */}
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
        <Text style={styles.dateText}>
          {selectedDate.toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={Array.from(collections.values())}
        keyExtractor={(item) => item.account.accountNo}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.textDisabled} />
            <Text style={styles.emptyText}>No RD accounts due today</Text>
          </View>
        }
      />

      {/* SMS Button */}
      {totalCollected > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.smsButton} onPress={handleGenerateSMS}>
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.white} />
            <Text style={styles.smsButtonText}>Generate Collection Report</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: { flex: 1, padding: SPACING.md, alignItems: 'center' },
  statItemBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
  statNum: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  statLbl: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.xs,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
  },
  dateText: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
  listContent: { padding: SPACING.sm },
  collectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  accountInfo: { flex: 1 },
  holderName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  accountNo: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  amount: { fontSize: 13, color: COLORS.success, fontWeight: '500', marginTop: 2 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  modeRow: { flexDirection: 'row', gap: SPACING.xs },
  modeBtn: {
    flex: 1,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modeBtnText: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary },
  empty: { padding: SPACING.xxl, alignItems: 'center', gap: SPACING.sm },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
  footer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  smsButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.success,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  smsButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
});
