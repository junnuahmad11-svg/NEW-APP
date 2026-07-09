import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, Account } from '../store/app.store';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface LotEntry {
  account: Account;
  installments: number;
  amount: number;
}

const PAYMENT_LIMIT = 20000;

export default function RDLotScreen() {
  const { accounts } = useAppStore();
  const rdAccounts = accounts.filter((a) => a.type === 'RD' && a.status === 'Active');

  const [selected, setSelected] = useState<Map<string, LotEntry>>(new Map());
  const [step, setStep] = useState<'select' | 'installments' | 'summary'>('select');
  const [lotGenerated, setLotGenerated] = useState(false);

  const totalAmount = Array.from(selected.values()).reduce((s, e) => s + e.amount, 0);
  const exceedsLimit = totalAmount > PAYMENT_LIMIT;

  const toggleAccount = (account: Account) => {
    const next = new Map(selected);
    if (next.has(account.accountNo)) {
      next.delete(account.accountNo);
    } else {
      const installmentAmt = parseInt(
        account.monthlyInstallment?.replace(/[^0-9]/g, '') || '0'
      );
      next.set(account.accountNo, { account, installments: 1, amount: installmentAmt });
    }
    setSelected(next);
  };

  const updateInstallments = (accountNo: string, count: number) => {
    const next = new Map(selected);
    const entry = next.get(accountNo);
    if (!entry) return;
    const installmentAmt = parseInt(
      entry.account.monthlyInstallment?.replace(/[^0-9]/g, '') || '0'
    );
    next.set(accountNo, { ...entry, installments: count, amount: installmentAmt * count });
    setSelected(next);
  };

  const handleGenerateLot = () => {
    if (selected.size === 0) {
      Alert.alert('No Accounts', 'Please select at least one account.');
      return;
    }
    if (exceedsLimit) {
      Alert.alert(
        '⚠️ Amount Exceeds Limit',
        `Total amount ₹${totalAmount.toLocaleString('en-IN')} exceeds the ₹20,000 limit. Please reduce the number of installments or accounts.`
      );
      return;
    }
    setStep('summary');
    setLotGenerated(true);
  };

  const handleShareLot = async () => {
    const entries = Array.from(selected.values());
    const text = [
      `📮 India Post RD Lot`,
      `Generated: ${new Date().toLocaleDateString('en-IN')}`,
      ``,
      ...entries.map(
        (e, i) =>
          `${i + 1}. ${e.account.accountHolder}\n   A/C: ${e.account.accountNo}\n   Installments: ${e.installments}\n   Amount: ₹${e.amount.toLocaleString('en-IN')}`
      ),
      ``,
      `Total Accounts: ${entries.length}`,
      `Total Amount: ₹${totalAmount.toLocaleString('en-IN')}`,
      ``,
      `⚠️ This is a PREPARED lot only. Submit via official India Post portal.`,
    ].join('\n');

    await Share.share({ message: text, title: 'RD Lot' });
  };

  const renderSelectStep = () => (
    <FlatList
      data={rdAccounts}
      keyExtractor={(item) => item.accountNo}
      ListHeaderComponent={
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>Step 1: Select Accounts</Text>
          <Text style={styles.stepSubtitle}>
            {selected.size} account(s) selected
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const isSelected = selected.has(item.accountNo);
        return (
          <TouchableOpacity
            style={[styles.accountRow, isSelected && styles.accountRowSelected]}
            onPress={() => toggleAccount(item)}
          >
            <View style={styles.checkbox}>
              {isSelected && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountHolder}>{item.accountHolder}</Text>
              <Text style={styles.accountNo}>{item.accountNo}</Text>
              <Text style={styles.installmentAmt}>
                Monthly: {item.monthlyInstallment || 'N/A'}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }}
      ListFooterComponent={
        <TouchableOpacity
          style={[styles.nextButton, selected.size === 0 && styles.disabledButton]}
          onPress={() => selected.size > 0 && setStep('installments')}
          disabled={selected.size === 0}
        >
          <Text style={styles.nextButtonText}>Next: Enter Installments →</Text>
        </TouchableOpacity>
      }
      contentContainerStyle={styles.listContent}
    />
  );

  const renderInstallmentsStep = () => (
    <ScrollView contentContainerStyle={styles.listContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Step 2: Enter Installments</Text>
        <Text style={styles.stepSubtitle}>Set number of months for each account</Text>
      </View>

      {Array.from(selected.values()).map((entry) => (
        <View key={entry.account.accountNo} style={styles.installmentCard}>
          <Text style={styles.accountHolder}>{entry.account.accountHolder}</Text>
          <Text style={styles.accountNo}>{entry.account.accountNo}</Text>
          <View style={styles.installmentControl}>
            <Text style={styles.installmentLabel}>Installments:</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => entry.installments > 1 && updateInstallments(entry.account.accountNo, entry.installments - 1)}
            >
              <Ionicons name="remove" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{entry.installments}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => updateInstallments(entry.account.accountNo, entry.installments + 1)}
            >
              <Ionicons name="add" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.entryAmount}>₹{entry.amount.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      ))}

      {/* Total */}
      <View style={[styles.totalCard, exceedsLimit && styles.totalCardError]}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={[styles.totalValue, exceedsLimit && { color: COLORS.error }]}>
          ₹{totalAmount.toLocaleString('en-IN')}
        </Text>
        {exceedsLimit && (
          <Text style={styles.limitWarning}>
            ⚠️ Exceeds ₹20,000 limit! Please reduce installments.
          </Text>
        )}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep('select')}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, { flex: 2 }, exceedsLimit && styles.disabledButton]}
          onPress={handleGenerateLot}
          disabled={exceedsLimit}
        >
          <Text style={styles.nextButtonText}>Generate Lot Preview</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderSummaryStep = () => (
    <ScrollView contentContainerStyle={styles.listContent}>
      <View style={[styles.stepHeader, { backgroundColor: '#E8F5E9' }]}>
        <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
        <Text style={[styles.stepTitle, { color: COLORS.success }]}>Lot Prepared!</Text>
        <Text style={styles.stepSubtitle}>
          Review below. Submit via official portal.
        </Text>
      </View>

      {Array.from(selected.values()).map((entry, i) => (
        <View key={entry.account.accountNo} style={styles.summaryRow}>
          <Text style={styles.summaryIndex}>{i + 1}</Text>
          <View style={styles.summaryInfo}>
            <Text style={styles.accountHolder}>{entry.account.accountHolder}</Text>
            <Text style={styles.accountNo}>{entry.account.accountNo}</Text>
            <Text style={styles.summaryDetails}>
              {entry.installments} installment(s) × ₹{(entry.amount / entry.installments).toLocaleString('en-IN')}
            </Text>
          </View>
          <Text style={styles.summaryAmount}>₹{entry.amount.toLocaleString('en-IN')}</Text>
        </View>
      ))}

      {/* Summary Total */}
      <View style={styles.summaryTotal}>
        <View style={styles.summaryTotalRow}>
          <Text style={styles.summaryTotalLabel}>Total Accounts</Text>
          <Text style={styles.summaryTotalValue}>{selected.size}</Text>
        </View>
        <View style={styles.summaryTotalRow}>
          <Text style={styles.summaryTotalLabel}>Total Amount</Text>
          <Text style={[styles.summaryTotalValue, { color: COLORS.success }]}>
            ₹{totalAmount.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {/* Warning */}
      <View style={styles.warningBox}>
        <Ionicons name="warning-outline" size={18} color={COLORS.warning} />
        <Text style={styles.warningText}>
          This is a PREPARED lot only and has NOT been submitted. To submit, use the official India Post Agent Portal.
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShareLot}>
          <Ionicons name="share-outline" size={18} color={COLORS.primary} />
          <Text style={styles.shareButtonText}>Share Lot</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.newLotButton}
          onPress={() => {
            setSelected(new Map());
            setStep('select');
            setLotGenerated(false);
          }}
        >
          <Text style={styles.newLotButtonText}>New Lot</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        {['Select', 'Installments', 'Summary'].map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                i <= ['select', 'installments', 'summary'].indexOf(step) && styles.stepDotActive,
              ]}
            >
              <Text style={styles.stepDotText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepLabel}>{s}</Text>
          </View>
        ))}
      </View>

      {step === 'select' && renderSelectStep()}
      {step === 'installments' && renderInstallmentsStep()}
      {step === 'summary' && renderSummaryStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    gap: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepItem: { alignItems: 'center' },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepDotText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  stepLabel: { fontSize: 11, color: COLORS.textSecondary },
  stepHeader: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  stepTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: SPACING.xs },
  stepSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  listContent: { padding: SPACING.md },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 1,
  },
  accountRowSelected: { borderColor: COLORS.primary, backgroundColor: '#FFEBEE' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  accountInfo: { flex: 1 },
  accountHolder: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  accountNo: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  installmentAmt: { fontSize: 12, color: COLORS.success, marginTop: 2 },
  nextButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    flex: 1,
  },
  nextButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
  disabledButton: { backgroundColor: COLORS.textDisabled },
  installmentCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 1,
  },
  installmentControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  installmentLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, minWidth: 24, textAlign: 'center' },
  entryAmount: { fontSize: 14, fontWeight: 'bold', color: COLORS.success, marginLeft: 'auto' as any },
  totalCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.success,
    marginVertical: SPACING.sm,
  },
  totalCardError: { borderColor: COLORS.error },
  totalLabel: { fontSize: 13, color: COLORS.textSecondary },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.success, marginTop: 4 },
  limitWarning: { fontSize: 12, color: COLORS.error, marginTop: SPACING.xs, textAlign: 'center' },
  buttonRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  backButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { color: COLORS.textSecondary, fontWeight: '500' },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 1,
  },
  summaryIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: 'bold',
    marginRight: SPACING.sm,
    fontSize: 13,
  },
  summaryInfo: { flex: 1 },
  summaryDetails: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  summaryAmount: { fontSize: 15, fontWeight: 'bold', color: COLORS.success },
  summaryTotal: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs },
  summaryTotalLabel: { fontSize: 14, color: COLORS.textSecondary },
  summaryTotalValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  warningText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.xs,
  },
  shareButtonText: { color: COLORS.primary, fontWeight: 'bold' },
  newLotButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  newLotButtonText: { color: COLORS.white, fontWeight: 'bold' },
});
