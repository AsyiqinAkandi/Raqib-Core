import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";
import { API_URL } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

type AttendanceType = "check_in" | "check_out";

type AttendanceRecord = {
  id: number;
  name: string;
  barcode?: string;
  student_code?: string;
  room_number?: string | null;
  attendance_type: AttendanceType;
  scanned_at: string;
  category?: string | null;
  notes?: string | null;
};

const categoryOptions = [
  { label: "Weekly Check", value: "weekly" },
  { label: "Hostel Leave", value: "hostel_leave" },
  { label: "Sick Leave", value: "sick_leave" },
  { label: "Emergency Leave", value: "emergency_leave" },
  { label: "Other", value: "other" },
];

export default function MobileAttendancePage() {
  const { user } = useAuth();

  const [studentId, setStudentId] = useState("");
  const [mode, setMode] = useState<AttendanceType>("check_in");
  const [category, setCategory] = useState("weekly");
  const [notes, setNotes] = useState("");

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [resultMessage, setResultMessage] = useState("");
  const [resultType, setResultType] = useState<"success" | "error" | null>(
    null
  );

  const formatCategory = (value: string) => {
    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatDateTime = (value: string) => {
    if (!value) return "-";

    return new Date(value).toLocaleString("en-BN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchAttendance = async () => {
    try {
      setLoadingRecords(true);

      const branchQuery = user?.branch_id ? `?branch_id=${user.branch_id}` : "";

      const response = await fetch(
        `${API_URL}/dashboard/recent-attendance${branchQuery}`
      );

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        setRecords([]);
        return;
      }

      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("fetchAttendance error:", error);
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [user?.branch_id]);

  const handleSubmit = async () => {
    if (!studentId.trim()) {
      Alert.alert("Missing Student ID", "Please enter the student ID.");
      return;
    }

    try {
      setSubmitting(true);
      setResultMessage("");
      setResultType(null);

      const response = await fetch(`${API_URL}/attendance/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: studentId.trim(),
          attendance_type: mode,
          category,
          notes: notes.trim() || null,
          scanned_by: user?.id,
          branch_id: user?.branch_id,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to record attendance.");
      }

      setResultType("success");
      setResultMessage(
        data?.message ||
          `Student ${mode === "check_in" ? "checked in" : "checked out"}.`
      );

      setStudentId("");
      setNotes("");
      setCategory("weekly");

      await fetchAttendance();
    } catch (error: any) {
      setResultType("error");
      setResultMessage(error?.message || "Failed to record attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator
      >
        <View style={styles.header}>
          <Text style={styles.title}>Manual Attendance</Text>
          <Text style={styles.subtitle}>
            Record check-in or check-out manually for{" "}
            {user?.branch_name || "your branch"}.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Attendance Mode</Text>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                mode === "check_in" && styles.activeToggle,
              ]}
              onPress={() => setMode("check_in")}
            >
              <Ionicons
                name="log-in-outline"
                size={20}
                color={mode === "check_in" ? colors.black : colors.primary}
              />
              <Text
                style={[
                  styles.toggleText,
                  mode === "check_in" && styles.activeToggleText,
                ]}
              >
                Check In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                mode === "check_out" && styles.activeToggle,
              ]}
              onPress={() => setMode("check_out")}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={mode === "check_out" ? colors.black : colors.primary}
              />
              <Text
                style={[
                  styles.toggleText,
                  mode === "check_out" && styles.activeToggleText,
                ]}
              >
                Check Out
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Student ID / Barcode</Text>
          <TextInput
            style={styles.input}
            value={studentId}
            onChangeText={setStudentId}
            placeholder="Enter student ID or barcode"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {categoryOptions.map((item) => {
              const active = category === item.value;

              return (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.categoryChip,
                    active && styles.activeCategoryChip,
                  ]}
                  onPress={() => setCategory(item.value)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      active && styles.activeCategoryChipText,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes, e.g. fever, guardian picked up early"
            placeholderTextColor={colors.muted}
            multiline
          />

          {resultMessage ? (
            <View
              style={[
                styles.resultBox,
                resultType === "success" ? styles.successBox : styles.errorBox,
              ]}
            >
              <Ionicons
                name={
                  resultType === "success"
                    ? "checkmark-circle"
                    : "alert-circle"
                }
                size={20}
                color={resultType === "success" ? colors.success : colors.error}
              />
              <Text style={styles.resultText}>{resultMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-outline"
                  size={22}
                  color={colors.white}
                />
                <Text style={styles.submitButtonText}>Submit Attendance</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.recentCard}>
          <View style={styles.recentHeader}>
            <View>
              <Text style={styles.recentTitle}>Recent Attendance</Text>
              <Text style={styles.recentSubtitle}>Latest branch records</Text>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={fetchAttendance}
            >
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingRecords ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Loading records...</Text>
            </View>
          ) : records.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No attendance records yet.</Text>
            </View>
          ) : (
            records.map((item) => (
              <View key={item.id} style={styles.recordCard}>
                <View style={styles.recordTopRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.name?.charAt(0)?.toUpperCase() || "S"}
                    </Text>
                  </View>

                  <View style={styles.recordInfo}>
                    <Text style={styles.recordName}>{item.name}</Text>
                    <Text style={styles.recordMeta}>
                      ID: {item.barcode || item.student_code || "-"}
                    </Text>
                    {item.room_number ? (
                      <Text style={styles.recordMeta}>
                        Room: {item.room_number}
                      </Text>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.badge,
                      item.attendance_type === "check_in"
                        ? styles.checkInBadge
                        : styles.checkOutBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        item.attendance_type === "check_in"
                          ? styles.checkInBadgeText
                          : styles.checkOutBadgeText,
                      ]}
                    >
                      {item.attendance_type === "check_in"
                        ? "Check In"
                        : "Check Out"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.timeText}>
                  {formatDateTime(item.scanned_at)}
                </Text>

                {item.category && item.category !== "weekly" ? (
                  <Text style={styles.recordNote}>
                    {formatCategory(item.category)}
                  </Text>
                ) : null}

                {item.notes ? (
                  <Text style={styles.recordNote}>Note: {item.notes}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 20,
    paddingBottom: 34,
  },

  header: {
    marginBottom: 18,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.primary,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: colors.secondary,
    lineHeight: 22,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 8,
    marginTop: 12,
  },

  toggleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },

  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 15,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.white,
  },

  activeToggle: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  toggleText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
  },

  activeToggleText: {
    color: colors.black,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.secondary,
    backgroundColor: colors.white,
  },

  notesInput: {
    minHeight: 86,
    textAlignVertical: "top",
  },

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },

  categoryChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
  },

  activeCategoryChip: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  categoryChipText: {
    color: colors.secondary,
    fontWeight: "700",
    fontSize: 12,
  },

  activeCategoryChipText: {
    color: colors.black,
  },

  resultBox: {
    marginTop: 16,
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderWidth: 1,
  },

  successBox: {
    backgroundColor: "rgba(40,167,69,0.08)",
    borderColor: "rgba(40,167,69,0.25)",
  },

  errorBox: {
    backgroundColor: "rgba(220,53,69,0.08)",
    borderColor: "rgba(220,53,69,0.25)",
  },

  resultText: {
    flex: 1,
    color: colors.secondary,
    fontWeight: "700",
    lineHeight: 20,
  },

  submitButton: {
    marginTop: 18,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  disabledButton: {
    opacity: 0.7,
  },

  submitButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
  },

  recentCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },

  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },

  recentTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.secondary,
  },

  recentSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: colors.muted,
  },

  refreshButton: {
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 12,
  },

  refreshButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 12,
  },

  loadingBox: {
    paddingVertical: 20,
    alignItems: "center",
  },

  loadingText: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 13,
  },

  emptyBox: {
    paddingVertical: 18,
    alignItems: "center",
  },

  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },

  recordCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 13,
    marginBottom: 10,
  },

  recordTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
  },

  recordInfo: {
    flex: 1,
  },

  recordName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.secondary,
  },

  recordMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },

  badge: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },

  checkInBadge: {
    backgroundColor: "rgba(40,167,69,0.12)",
  },

  checkOutBadge: {
    backgroundColor: "rgba(220,53,69,0.12)",
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },

  checkInBadgeText: {
    color: colors.success,
  },

  checkOutBadgeText: {
    color: colors.error,
  },

  timeText: {
    marginTop: 8,
    fontSize: 11,
    color: colors.muted,
  },

  recordNote: {
    marginTop: 7,
    fontSize: 12,
    color: colors.secondary,
    fontWeight: "700",
    backgroundColor: "rgba(197,160,89,0.12)",
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 9,
    alignSelf: "flex-start",
    overflow: "hidden",
  },
});