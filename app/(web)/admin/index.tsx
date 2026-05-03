import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";

import { colors } from "../../../theme/colors";
import { API_URL } from "../../../config/api";

type Summary = {
  totalStudents: number;
  totalRooms: number;
  totalWardens: number;
  activeRooms: number;
  todayLogs: number;
};

type LogItem = {
  id: number;
  user_name: string | null;
  user_role: string | null;
  branch_name: string | null;
  action: string;
  details: string | null;
  created_at: string;
};

type WardenActivity = {
  user_id: number;
  name: string;
  email: string;
  branch_name: string | null;
  action_count: number;
};

type DashboardData = {
  summary: Summary;
  todayLogs: LogItem[];
  wardenActivity: WardenActivity[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/dashboard/admin`);
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to fetch dashboard data");
      }

      setData(result);
    } catch (error: any) {
      console.error("fetchDashboard error:", error);
      Alert.alert("Error", error?.message || "Failed to fetch dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const summaryCards = useMemo(() => {
    if (!data) return [];

    return [
      { label: "Total Students", value: data.summary.totalStudents },
      { label: "Total Rooms", value: data.summary.totalRooms },
      { label: "Total Wardens", value: data.summary.totalWardens },
      { label: "Active Rooms", value: data.summary.activeRooms },
      { label: "Today's Logs", value: data.summary.todayLogs },
    ];
  }, [data]);

  const formatDateTime = (value: string) => {
    if (!value) return "-";

    return new Date(value).toLocaleString("en-BN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    });
  };

  const formatAction = (action: string) => {
    return action.replaceAll("_", " ");
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>
          Monitor system activity, users, wardens, and hostel records from one
          overview.
        </Text>
      </View>

      <View style={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <View key={card.label} style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{card.value}</Text>
            <Text style={styles.summaryLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionGrid}>
        <View style={styles.largeSectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Today&apos;s Activity Logs</Text>
              <Text style={styles.sectionSubtitle}>
                Latest login, logout, create, update, and delete activity.
              </Text>
            </View>

            <TouchableOpacity style={styles.refreshButton} onPress={fetchDashboard}>
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {!data?.todayLogs?.length ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No activity recorded today.</Text>
            </View>
          ) : (
            data.todayLogs.map((log) => (
              <View key={log.id} style={styles.logItem}>
                <View style={styles.logTopRow}>
                  <Text style={styles.logAction}>{formatAction(log.action)}</Text>
                  <Text style={styles.logTime}>
                    {formatDateTime(log.created_at)}
                  </Text>
                </View>

                <Text style={styles.logDetails}>
                  {log.details || "No details provided."}
                </Text>

                <Text style={styles.logMeta}>
                  {log.user_name || "Unknown user"}
                  {log.user_role ? ` • ${log.user_role}` : ""}
                  {log.branch_name ? ` • ${log.branch_name}` : ""}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.sideSectionCard}>
          <Text style={styles.sectionTitle}>Warden Activity Overview</Text>
          <Text style={styles.sectionSubtitle}>
            Actions recorded by each warden today.
          </Text>

          {!data?.wardenActivity?.length ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No wardens found.</Text>
            </View>
          ) : (
            data.wardenActivity.map((warden) => (
              <View key={warden.user_id} style={styles.wardenRow}>
                <View style={styles.wardenInfo}>
                  <Text style={styles.wardenName}>{warden.name}</Text>
                  <Text style={styles.wardenMeta}>
                    {warden.branch_name || "No branch assigned"}
                  </Text>
                </View>

                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {warden.action_count}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
    maxWidth: 1400,
    width: "100%",
    alignSelf: "center",
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 14,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.secondary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    maxWidth: 760,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 18,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 200,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.accent,
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
    fontWeight: "600",
  },
  sectionGrid: {
    flexDirection: "row",
    gap: 18,
    alignItems: "flex-start",
  },
  largeSectionCard: {
    flex: 2,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sideSectionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginBottom: 12,
  },
  refreshButton: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  logItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 13,
  },
  logTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 5,
  },
  logAction: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.secondary,
    textTransform: "capitalize",
  },
  logTime: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  logDetails: {
    fontSize: 14,
    color: colors.black,
    lineHeight: 20,
  },
  logMeta: {
    marginTop: 5,
    fontSize: 12,
    color: colors.muted,
  },
  wardenRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wardenInfo: {
    flex: 1,
    paddingRight: 12,
  },
  wardenName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.secondary,
  },
  wardenMeta: {
    marginTop: 3,
    fontSize: 12,
    color: colors.muted,
  },
  countBadge: {
    minWidth: 38,
    height: 34,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  countBadgeText: {
    color: colors.white,
    fontWeight: "800",
  },
  emptyBox: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
});