import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api.service';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const REPORT_TYPES = [
  { id: 'commission', label: 'Commission', icon: 'cash-outline', color: COLORS.success },
  { id: 'tds', label: 'TDS', icon: 'document-text-outline', color: COLORS.info },
  { id: 'ledger', label: 'Ledger', icon: 'list-outline', color: COLORS.secondary },
  { id: 'collection', label: 'Collection', icon: 'calendar-outline', color: COLORS.primary },
];

export default function ReportsScreen() {
  const [selectedReport, setSelectedReport] = useState('commission');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadReport = async (type: string) => {
    setIsLoading(true);
    setReportData(null);
    try {
      const data = await apiService.getReports(type);
      setReportData(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!reportData) return;
    try {
      await Share.share({
        message: JSON.stringify(reportData, null, 2),
        title: `${selectedReport}_report.json`,
      });
    } catch {}
  };

  return (
    <View style={styles.container}>
      {/* Report Type Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.typeScroll}
        contentContainerStyle={styles.typeScrollContent}
      >
        {REPORT_TYPES.map((rt) => (
          <TouchableOpacity
            key={rt.id}
            style={[styles.typeCard, selectedReport === rt.id && { borderColor: rt.color, backgroundColor: `${rt.color}10` }]}
            onPress={() => {
              setSelectedReport(rt.id);
              loadReport(rt.id);
            }}
          >
            <Ionicons name={rt.icon as any} size={22} color={selectedReport === rt.id ? rt.color : COLORS.textSecondary} />
            <Text style={[styles.typeLabel, selectedReport === rt.id && { color: rt.color }]}>
              {rt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Report Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading report...</Text>
          </View>
        ) : reportData ? (
          <>
            {/* Report Data Display */}
            <View style={styles.reportCard}>
              <Text style={styles.reportTitle}>
                {REPORT_TYPES.find((rt) => rt.id === selectedReport)?.label} Report
              </Text>
              <Text style={styles.reportDate}>
                Generated: {new Date().toLocaleDateString('en-IN')}
              </Text>

              {/* Render report rows */}
              {reportData.data?.tableData?.map((row: any, i: number) => (
                <View key={i} style={styles.reportRow}>
                  <Text style={styles.reportRowLabel}>{row.label}</Text>
                  <Text style={styles.reportRowValue}>{row.value}</Text>
                </View>
              ))}

              {(!reportData.data?.tableData || reportData.data.tableData.length === 0) && (
                <Text style={styles.noDataText}>No report data available for this period.</Text>
              )}
            </View>

            {/* Export Button */}
            <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
              <Ionicons name="share-outline" size={18} color={COLORS.white} />
              <Text style={styles.exportButtonText}>Export Report</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={56} color={COLORS.textDisabled} />
            <Text style={styles.emptyTitle}>Select a Report</Text>
            <Text style={styles.emptySubtitle}>
              Tap a report type above to load data
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  typeScroll: { backgroundColor: COLORS.white, maxHeight: 100 },
  typeScrollContent: { padding: SPACING.sm, gap: SPACING.sm },
  typeCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    minWidth: 80,
    gap: SPACING.xs,
  },
  typeLabel: { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary },
  content: { flex: 1 },
  contentInner: { padding: SPACING.md, flexGrow: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.sm, paddingTop: 80 },
  loaderText: { color: COLORS.textSecondary },
  reportCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    elevation: 1,
    marginBottom: SPACING.md,
  },
  reportTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.textPrimary },
  reportDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.md },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reportRowLabel: { fontSize: 13, color: COLORS.textSecondary },
  reportRowValue: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },
  noDataText: { color: COLORS.textSecondary, textAlign: 'center', paddingVertical: SPACING.lg },
  exportButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  exportButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.sm, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});
