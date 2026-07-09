import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface Plan {
  id: string;
  name: string;
  fullName: string;
  minAmount: number;
  maxAmount: number | null;
  rate: number;
  tenure: string;
  icon: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'RD',
    name: 'RD',
    fullName: 'Recurring Deposit',
    minAmount: 100,
    maxAmount: null,
    rate: 6.7,
    tenure: '5 Years',
    icon: '🔄',
    features: ['Monthly deposits', 'Flexible amounts', 'Loan facility', 'Nomination available'],
  },
  {
    id: 'MIS',
    name: 'MIS',
    fullName: 'Monthly Income Scheme',
    minAmount: 1000,
    maxAmount: 900000,
    rate: 7.4,
    tenure: '5 Years',
    icon: '💵',
    features: ['Monthly income', 'Single: ₹9 Lakh max', 'Joint: ₹15 Lakh max', 'Premature withdrawal allowed'],
  },
  {
    id: 'KVP',
    name: 'KVP',
    fullName: 'Kisan Vikas Patra',
    minAmount: 1000,
    maxAmount: null,
    rate: 7.5,
    tenure: '115 months',
    icon: '🌾',
    features: ['Money doubles', 'No upper limit', 'Transferable', 'Loan facility'],
  },
  {
    id: 'NSC',
    name: 'NSC',
    fullName: 'National Savings Certificate',
    minAmount: 1000,
    maxAmount: null,
    rate: 7.7,
    tenure: '5 Years',
    icon: '📜',
    features: ['Tax benefit u/s 80C', 'No TDS', 'Compounding interest', 'Loan facility'],
  },
  {
    id: 'TD',
    name: 'TD',
    fullName: 'Time Deposit',
    minAmount: 1000,
    maxAmount: null,
    rate: 7.5,
    tenure: '1/2/3/5 Years',
    icon: '⏰',
    features: ['Fixed tenure', 'Multiple tenures', 'Tax benefit (5yr)', 'Premature allowed'],
  },
];

export default function PlansScreen() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[0]);
  const [calcAmount, setCalcAmount] = useState('');
  const [calcMonths, setCalcMonths] = useState('60');
  const [calcResult, setCalcResult] = useState<number | null>(null);

  const calculateRDMaturity = () => {
    const P = parseFloat(calcAmount);
    const n = parseInt(calcMonths);
    const r = selectedPlan.rate / 100 / 12;

    if (!P || !n || P <= 0 || n <= 0) return;

    // RD Maturity Formula
    const maturity = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    setCalcResult(Math.round(maturity));
  };

  const totalInvested = parseFloat(calcAmount || '0') * parseInt(calcMonths || '0');
  const interest = calcResult ? calcResult - totalInvested : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Plan Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.planTabs}>
        {PLANS.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[styles.planTab, selectedPlan.id === plan.id && styles.planTabActive]}
            onPress={() => {
              setSelectedPlan(plan);
              setCalcResult(null);
            }}
          >
            <Text style={styles.planTabIcon}>{plan.icon}</Text>
            <Text style={[styles.planTabText, selectedPlan.id === plan.id && styles.planTabTextActive]}>
              {plan.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Plan Details */}
      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <Text style={styles.planIcon}>{selectedPlan.icon}</Text>
          <View>
            <Text style={styles.planName}>{selectedPlan.name}</Text>
            <Text style={styles.planFullName}>{selectedPlan.fullName}</Text>
          </View>
          <View style={styles.rateContainer}>
            <Text style={styles.rateValue}>{selectedPlan.rate}%</Text>
            <Text style={styles.rateLabel}>p.a.</Text>
          </View>
        </View>

        <View style={styles.planDetails}>
          <View style={styles.planDetailRow}>
            <Ionicons name="cash-outline" size={15} color={COLORS.textSecondary} />
            <Text style={styles.planDetailLabel}>Min Amount:</Text>
            <Text style={styles.planDetailValue}>₹{selectedPlan.minAmount.toLocaleString('en-IN')}</Text>
          </View>
          {selectedPlan.maxAmount && (
            <View style={styles.planDetailRow}>
              <Ionicons name="trending-up-outline" size={15} color={COLORS.textSecondary} />
              <Text style={styles.planDetailLabel}>Max Amount:</Text>
              <Text style={styles.planDetailValue}>₹{selectedPlan.maxAmount.toLocaleString('en-IN')}</Text>
            </View>
          )}
          <View style={styles.planDetailRow}>
            <Ionicons name="time-outline" size={15} color={COLORS.textSecondary} />
            <Text style={styles.planDetailLabel}>Tenure:</Text>
            <Text style={styles.planDetailValue}>{selectedPlan.tenure}</Text>
          </View>
        </View>

        <View style={styles.featuresContainer}>
          {selectedPlan.features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Calculator */}
      <View style={styles.calculatorCard}>
        <Text style={styles.calcTitle}>💰 Maturity Calculator</Text>

        <View style={styles.calcInput}>
          <Text style={styles.calcLabel}>Monthly Amount (₹)</Text>
          <TextInput
            style={styles.calcInputField}
            value={calcAmount}
            onChangeText={setCalcAmount}
            keyboardType="numeric"
            placeholder="Enter amount"
            placeholderTextColor={COLORS.textDisabled}
          />
        </View>

        <View style={styles.calcInput}>
          <Text style={styles.calcLabel}>Tenure (months)</Text>
          <TextInput
            style={styles.calcInputField}
            value={calcMonths}
            onChangeText={setCalcMonths}
            keyboardType="numeric"
            placeholder="e.g., 60"
            placeholderTextColor={COLORS.textDisabled}
          />
        </View>

        <TouchableOpacity style={styles.calcButton} onPress={calculateRDMaturity}>
          <Ionicons name="calculator-outline" size={18} color={COLORS.white} />
          <Text style={styles.calcButtonText}>Calculate</Text>
        </TouchableOpacity>

        {calcResult !== null && (
          <View style={styles.calcResult}>
            <View style={styles.calcResultRow}>
              <Text style={styles.calcResultLabel}>Total Invested</Text>
              <Text style={styles.calcResultValue}>₹{totalInvested.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.calcResultRow}>
              <Text style={styles.calcResultLabel}>Interest Earned</Text>
              <Text style={[styles.calcResultValue, { color: COLORS.success }]}>
                ₹{interest.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={[styles.calcResultRow, styles.calcResultTotal]}>
              <Text style={styles.calcResultTotalLabel}>Maturity Amount</Text>
              <Text style={styles.calcResultTotalValue}>
                ₹{calcResult.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { paddingBottom: SPACING.xl },
  planTabs: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  planTab: {
    alignItems: 'center',
    padding: SPACING.sm,
    minWidth: 70,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  planTabActive: { borderBottomColor: COLORS.primary },
  planTabIcon: { fontSize: 22 },
  planTabText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  planTabTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  planCard: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    elevation: 2,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  planIcon: { fontSize: 36 },
  planName: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
  planFullName: { fontSize: 13, color: COLORS.textSecondary },
  rateContainer: {
    marginLeft: 'auto' as any,
    backgroundColor: `${COLORS.success}15`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  rateValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.success },
  rateLabel: { fontSize: 10, color: COLORS.textSecondary },
  planDetails: { gap: SPACING.xs, marginBottom: SPACING.md },
  planDetailRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  planDetailLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  planDetailValue: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },
  featuresContainer: { gap: SPACING.xs },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  featureText: { fontSize: 13, color: COLORS.textSecondary },
  calculatorCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    elevation: 2,
  },
  calcTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.md },
  calcInput: { marginBottom: SPACING.sm },
  calcLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  calcInputField: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  calcButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  calcButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
  calcResult: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  calcResultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs },
  calcResultLabel: { fontSize: 13, color: COLORS.textSecondary },
  calcResultValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  calcResultTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
  },
  calcResultTotalLabel: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary },
  calcResultTotalValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
});
