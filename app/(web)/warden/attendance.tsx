import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";

import { colors } from "../../../theme/colors";
import { API_URL } from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";

/* =========================================================
   TYPES
========================================================= */

type AttendanceType = "check_in" | "check_out";

type AttendanceRecord = {
  id: number;
  name: string;
  barcode?: string;
  student_code?: string;
  attendance_type?: AttendanceType;
  scanned_at: string;
  room_number?: string | null;
  category?: string | null;
  notes?: string | null;
};

/* =========================================================
   CATEGORY OPTIONS
========================================================= */

const categoryOptions = [
  { label: "Weekly Check", value: "weekly" },
  { label: "Hostel Leave", value: "hostel_leave" },
  { label: "Sick Leave", value: "sick_leave" },
  { label: "Emergency Leave", value: "emergency_leave" },
  { label: "Other", value: "other" },
];

export default function AttendancePage() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1000;

  const { user } = useAuth();

  /* =========================================================
     STATE
  ========================================================= */

  const [studentCode, setStudentCode] = useState("");
  const [attendanceType, setAttendanceType] =
    useState<AttendanceType>("check_in");

  const [category, setCategory] = useState("weekly");
  const [notes, setNotes] = useState("");

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  /* =========================================================
     HELPERS
  ========================================================= */

  const formatCategory = (value: string) => {
    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

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

  /* =========================================================
     FETCH RECENT ATTENDANCE
  ========================================================= */

  const fetchAttendance = async () => {
    try {
      setLoading(true);

      const branchQuery = user?.branch_id ? `?branch_id=${user.branch_id}` : "";

      const res = await fetch(
        `${API_URL}/dashboard/recent-attendance${branchQuery}`
      );

      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setRecords([]);
        return;
      }

      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [user?.branch_id]);

  /* =========================================================
     MANUAL ATTENDANCE SUBMIT
  ========================================================= */

  const handleSubmit = async () => {
    if (!studentCode.trim()) {
      setMessage("Please enter a student ID or barcode.");
      setMessageType("error");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");
      setMessageType("");

      const attendanceRes = await fetch(`${API_URL}/attendance/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: studentCode.trim(),
          attendance_type: attendanceType,
          category,
          notes: notes.trim() || null,
          scanned_by: user?.id,
          branch_id: user?.branch_id,
        }),
      });

      const attendanceData = await attendanceRes.json().catch(() => null);

      if (!attendanceRes.ok) {
        setMessage(
          attendanceData?.message ||
            attendanceData?.error ||
            "Failed to record attendance."
        );
        setMessageType("error");
        return;
      }

      setMessage(attendanceData?.message || "Attendance recorded successfully.");
      setMessageType("success");

      setStudentCode("");
      setNotes("");
      setCategory("weekly");

      await fetchAttendance();
    } catch (error) {
      console.error("Submit attendance error:", error);
      setMessage("Something went wrong while recording attendance.");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.subtitle}>
          Record student check-ins and check-outs manually, or use the mobile
          scanner for quicker attendance tracking.
        </Text>
      </View>

      <View
        style={[
          styles.topSection,
          { flexDirection: isWide ? "row" : "column" },
        ]}
      >
        {/* =====================================================
            MANUAL ATTENDANCE FORM
        ===================================================== */}
        <View style={[styles.card, styles.manualCard]}>
          <Text style={styles.cardTitle}>Manual Attendance</Text>
          <Text style={styles.cardDescription}>
            Enter the student ID or barcode to record attendance manually.
          </Text>

          <Text style={styles.inputLabel}>Student ID / Barcode</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Student ID / Barcode"
            placeholderTextColor={colors.muted}
            value={studentCode}
            onChangeText={setStudentCode}
          />

          <Text style={styles.inputLabel}>Attendance Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                attendanceType === "check_in" && styles.checkInActive,
              ]}
              onPress={() => setAttendanceType("check_in")}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  attendanceType === "check_in" && styles.activeTypeButtonText,
                ]}
              >
                Check In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                attendanceType === "check_out" && styles.checkOutActive,
              ]}
              onPress={() => setAttendanceType("check_out")}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  attendanceType === "check_out" && styles.activeTypeButtonText,
                ]}
              >
                Check Out
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Category</Text>
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

          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Optional notes, e.g. fever, guardian picked up early"
            placeholderTextColor={colors.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? "Submitting..." : "Record Attendance"}
            </Text>
          </TouchableOpacity>

          {message ? (
            <View
              style={[
                styles.messageBox,
                messageType === "success" ? styles.successBox : styles.errorBox,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  messageType === "success"
                    ? styles.successText
                    : styles.errorText,
                ]}
              >
                {message}
              </Text>
            </View>
          ) : null}
        </View>

        {/* =====================================================
            QUICK GUIDE
        ===================================================== */}
        <View style={[styles.card, styles.sideCard]}>
          <Text style={styles.cardTitle}>Quick Guide</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>Manual Entry</Text>
            <Text style={styles.infoBoxText}>
              Use this form when a student’s barcode cannot be scanned directly.
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>Category</Text>
            <Text style={styles.infoBoxText}>
              Use Weekly Check for normal attendance. Select leave categories
              only when there is a special reason.
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>Mobile Scanner</Text>
            <Text style={styles.infoBoxText}>
              For faster attendance, use the phone app to scan student barcodes.
            </Text>
          </View>
        </View>
      </View>

      {/* =====================================================
          RECENT ATTENDANCE
      ===================================================== */}
      <View style={[styles.card, styles.recentCard]}>
        <View style={styles.recentHeader}>
          <View>
            <Text style={styles.cardTitle}>Recent Attendance</Text>
            <Text style={styles.recentSubtext}>
              Latest check-ins and check-outs recorded in the system
            </Text>
          </View>

          <TouchableOpacity style={styles.refreshButton} onPress={fetchAttendance}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : records.length === 0 ? (
          <Text style={styles.emptyText}>No attendance records yet.</Text>
        ) : (
          <View style={styles.recordsWrap}>
            {records.map((item) => (
              <View key={item.id} style={styles.recordRow}>
                <View style={styles.recordLeft}>
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

                    {item.category && item.category !== "weekly" && (
                      <Text style={styles.recordNote}>
                        {formatCategory(item.category)}
                      </Text>
                    )}

                    {item.notes ? (
                      <Text style={styles.recordNote}>Note: {item.notes}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.recordRight}>
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

                  <Text style={styles.timeText}>
                    {formatDateTime(item.scanned_at)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 24,
    paddingBottom: 40,
    maxWidth: 1300,
    width: "100%",
    alignSelf: "center",
  },

  header: {
    marginBottom: 20,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 15,
    color: colors.secondary,
    opacity: 0.75,
    lineHeight: 22,
    maxWidth: 780,
  },

  topSection: {
    gap: 18,
    marginBottom: 18,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },

  manualCard: {
    flex: 2,
  },

  sideCard: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 6,
  },

  cardDescription: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 7,
    marginTop: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.secondary,
    backgroundColor: colors.white,
  },

  notesInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  typeRow: {
    flexDirection: "row",
    gap: 10,
  },

  typeButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: colors.white,
  },

  checkInActive: {
    backgroundColor: "rgba(40,167,69,0.12)",
    borderColor: colors.success,
  },

  checkOutActive: {
    backgroundColor: "rgba(220,53,69,0.12)",
    borderColor: colors.error,
  },

  typeButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.secondary,
  },

  activeTypeButtonText: {
    color: colors.black,
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

  submitButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.7,
  },

  submitButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
  },

  messageBox: {
    marginTop: 14,
    borderRadius: 14,
    padding: 13,
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

  messageText: {
    fontWeight: "700",
    lineHeight: 20,
  },

  successText: {
    color: colors.success,
  },

  errorText: {
    color: colors.error,
  },

  infoBox: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },

  infoBoxTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 4,
  },

  infoBoxText: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },

  recentCard: {
    marginTop: 2,
  },

  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },

  recentSubtext: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },

  refreshButton: {
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
  },

  refreshButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 13,
  },

  loaderWrap: {
    paddingVertical: 30,
    alignItems: "center",
  },

  emptyText: {
    color: colors.muted,
    fontSize: 14,
    paddingVertical: 16,
  },

  recordsWrap: {
    gap: 12,
  },

  recordRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    backgroundColor: colors.white,
  },

  recordLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 16,
  },

  recordInfo: {
    flex: 1,
  },

  recordName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 3,
  },

  recordMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },

  recordNote: {
    marginTop: 6,
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

  recordRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    maxWidth: 150,
  },

  badge: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  checkInBadge: {
    backgroundColor: "rgba(40,167,69,0.12)",
  },

  checkOutBadge: {
    backgroundColor: "rgba(220,53,69,0.12)",
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  checkInBadgeText: {
    color: colors.success,
  },

  checkOutBadgeText: {
    color: colors.error,
  },

  timeText: {
    fontSize: 11,
    color: colors.muted,
    textAlign: "right",
    lineHeight: 16,
  },
});