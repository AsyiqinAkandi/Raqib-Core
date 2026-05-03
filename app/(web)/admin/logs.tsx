import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";

import { colors } from "../../../theme/colors";
import { API_URL } from "../../../config/api";

type LogItem = {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  branch_name: string | null;
  action: string;
  details: string | null;
  created_at: string;
};

const actionFilters = [
  "ALL",
  "LOGIN",
  "LOGOUT",
  "CREATE",
  "UPDATE",
  "DELETE",
  "ATTENDANCE",
];

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/logs`);
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch logs");
      }

      setLogs(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("fetchLogs error:", error);
      Alert.alert("Error", error?.message || "Failed to fetch logs.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return logs.filter((log) => {
      const action = log.action || "";

      const matchesSearch =
        log.user_name?.toLowerCase().includes(keyword) ||
        log.user_email?.toLowerCase().includes(keyword) ||
        log.user_role?.toLowerCase().includes(keyword) ||
        log.branch_name?.toLowerCase().includes(keyword) ||
        log.action?.toLowerCase().includes(keyword) ||
        log.details?.toLowerCase().includes(keyword);

      const matchesAction =
        actionFilter === "ALL" ||
        action.includes(actionFilter) ||
        (actionFilter === "CREATE" && action.startsWith("CREATE")) ||
        (actionFilter === "UPDATE" && action.startsWith("UPDATE")) ||
        (actionFilter === "DELETE" && action.startsWith("DELETE")) ||
        (actionFilter === "ATTENDANCE" && action.includes("ATTENDANCE"));

      return matchesSearch && matchesAction;
    });
  }, [logs, search, actionFilter]);

  const formatDateTime = (value: string) => {
    if (!value) return "-";

    return new Date(value).toLocaleString("en-BN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionLabel = (action: string) => {
    return action.replaceAll("_", " ");
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading activity logs...</Text>
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
        <Text style={styles.title}>Activity Logs</Text>
        <Text style={styles.subtitle}>
          Monitor user activity such as login, logout, create, update, delete,
          and attendance actions.
        </Text>
      </View>

      <View style={styles.toolbarCard}>
        <View style={styles.toolbarTopRow}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by user, email, action, branch, or details"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />

          <TouchableOpacity style={styles.refreshButton} onPress={fetchLogs}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          {actionFilters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                actionFilter === filter && styles.activeFilterChip,
              ]}
              onPress={() => setActionFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  actionFilter === filter && styles.activeFilterChipText,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{logs.length}</Text>
          <Text style={styles.summaryLabel}>Total Logs</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{filteredLogs.length}</Text>
          <Text style={styles.summaryLabel}>Shown</Text>
        </View>
      </View>

      <View style={styles.logsCard}>
        {filteredLogs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No logs found.</Text>
          </View>
        ) : (
          filteredLogs.map((log) => (
            <View key={log.id} style={styles.logRow}>
              <View style={styles.logMain}>
                <View style={styles.logTitleRow}>
                  <Text style={styles.actionText}>
                    {getActionLabel(log.action)}
                  </Text>

                  <Text style={styles.timeText}>
                    {formatDateTime(log.created_at)}
                  </Text>
                </View>

                <Text style={styles.detailsText}>
                  {log.details || "No details provided."}
                </Text>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    User: {log.user_name || "Unknown"}
                  </Text>

                  <Text style={styles.metaText}>
                    Role: {log.user_role || "-"}
                  </Text>

                  <Text style={styles.metaText}>
                    Branch: {log.branch_name || "-"}
                  </Text>
                </View>

                {log.user_email && (
                  <Text style={styles.emailText}>{log.user_email}</Text>
                )}
              </View>
            </View>
          ))
        )}
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
    maxWidth: 1200,
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
  toolbarCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  toolbarTopRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.black,
    backgroundColor: colors.white,
  },
  refreshButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
  },
  activeFilterChip: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterChipText: {
    color: colors.secondary,
    fontWeight: "700",
    fontSize: 13,
  },
  activeFilterChipText: {
    color: colors.white,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.accent,
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
    fontWeight: "600",
  },
  logsCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  emptyBox: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
  logRow: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logMain: {
    gap: 8,
  },
  logTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.secondary,
    textTransform: "capitalize",
  },
  timeText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "600",
  },
  detailsText: {
    fontSize: 14,
    color: colors.black,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaText: {
    fontSize: 12,
    color: colors.muted,
    backgroundColor: colors.background,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    overflow: "hidden",
  },
  emailText: {
    fontSize: 12,
    color: colors.muted,
  },
});