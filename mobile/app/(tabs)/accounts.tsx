import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api.service';
import { Account } from '../../store/app.store';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const TABS = ['RD', 'TD', 'MIS', 'KVP', 'NSC'] as const;
type AccountTab = typeof TABS[number];

const STATUS_COLORS: Record<string, string> = {
  Active: COLORS.success,
  Inactive: COLORS.warning,
  Matured: COLORS.info,
  Closed: COLORS.textSecondary,
};

export default function AccountsScreen() {
  const [selectedTab, setSelectedTab] = useState<AccountTab>('RD');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAccounts = useCallback(async (type: AccountTab) => {
    setIsLoading(true);
    try {
      const data = await apiService.getAccounts(type);
      setAccounts(data.accounts || []);
      setFilteredAccounts(data.accounts || []);
    } catch (error: any) {
      if (error.isSessionExpired) router.replace('/(auth)/login');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts(selectedTab);
    setSearchQuery('');
  }, [selectedTab]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAccounts(accounts);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredAccounts(
      accounts.filter(
        (a) =>
          a.accountHolder.toLowerCase().includes(q) ||
          a.accountNo.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, accounts]);

  const renderAccount = ({ item }: { item: Account }) => (
    <TouchableOpacity
      style={styles.accountCard}
      onPress={() => router.push({ pathname: '/account/[id]', params: { id: item.accountNo } })}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.accountAvatar}>
        <Text style={styles.avatarText}>
          {item.accountHolder.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.accountInfo}>
        <Text style={styles.accountHolder} numberOfLines={1}>
          {item.accountHolder}
        </Text>
        <Text style={styles.accountNo}>{item.accountNo}</Text>
        <Text style={styles.accountBalance}>Balance: {item.balance}</Text>
      </View>

      {/* Status */}
      <View style={styles.accountRight}>
        <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status] || COLORS.info}20` }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || COLORS.info }]}>
            {item.status}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.tabActive]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={`Search ${selectedTab} accounts...`}
          placeholderTextColor={COLORS.textDisabled}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Accounts Count */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>
          {filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Loading accounts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAccounts}
          keyExtractor={(item) => item.accountNo}
          renderItem={renderAccount}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                loadAccounts(selectedTab);
              }}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color={COLORS.textDisabled} />
              <Text style={styles.emptyText}>No {selectedTab} accounts found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  searchInput: { flex: 1, height: 42, color: COLORS.textPrimary, fontSize: 14 },
  countBar: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  countText: { fontSize: 12, color: COLORS.textSecondary },
  listContent: { padding: SPACING.sm, paddingTop: 0 },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  accountInfo: { flex: 1 },
  accountHolder: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  accountNo: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  accountBalance: { fontSize: 13, color: COLORS.success, marginTop: 2, fontWeight: '500' },
  accountRight: { alignItems: 'flex-end', gap: SPACING.xs },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.sm },
  loaderText: { color: COLORS.textSecondary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xxl, gap: SPACING.sm },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
});
