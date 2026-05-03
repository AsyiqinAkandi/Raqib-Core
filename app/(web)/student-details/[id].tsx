import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_URL } from "../../../config/api";
import { colors } from "../../../theme/colors";
import { useAuth } from "../../../context/AuthContext";

type StudentDetails = {
  id: number;
  student_id: string;
  name: string;
  barcode: string;
  profile_image?: string | null;
  dob?: string | null;
  gender?: string | null;
  year_level?: string | null;
  phone_number?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  address?: string | null;
  branch_id?: number | null;
  room_id?: number | null;
  status?: string | null;
  remarks?: string | null;
  created_at?: string | null;
  branch_name?: string | null;
  unit?: string | null;
  lorong?: string | null;
  room_number?: string | null;
  capacity?: number | null;
};

type AttendanceStatus = {
  current_status: "checked_in" | "checked_out";
  attendance_type: "check_in" | "check_out" | null;
  scanned_at: string | null;
};

const ui = {
  border: "#d9dee3",
  muted: "#6c757d",
  soft: "#f5f6f7",
};

export default function StudentDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { user } = useAuth();

  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null);
  const fetchStudentDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/students/${id}`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch student details");
      }

      setStudent(data);
    } catch (error: any) {
      console.error("fetchStudentDetails error:", error);
      Alert.alert("Error", error?.message || "Failed to fetch student details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAttendanceStatus = useCallback(async () => {
    if (!id) return;

    try {
      const response = await fetch(`${API_URL}/students/${id}/attendance-status`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch attendance status");
      }

      setAttendanceStatus(data);
    } catch (error) {
      console.error("fetchAttendanceStatus error:", error);
    }
  }, [id]);

  useEffect(() => {
    fetchStudentDetails();
    fetchAttendanceStatus();

    const interval = setInterval(() => {
      fetchAttendanceStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchStudentDetails, fetchAttendanceStatus]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading student details...</Text>
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Student not found.</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.push(
              isAdmin ? "/(web)/admin/students" : "/(web)/warden/students"
            )
          }
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUri = student.profile_image || null;

  const roomLabel = student.room_number
    ? `Unit ${student.unit} • Lorong ${student.lorong} • Room ${student.room_number}`
    : "Unassigned";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <TouchableOpacity
      style={styles.backButton}
      onPress={() =>
        router.push(
          isAdmin ? "/(web)/admin/students" : "/(web)/warden/students"
        )
      }
    >
      <Text style={styles.backButtonText}>← Back</Text>
    </TouchableOpacity>

      <View style={styles.documentCard}>
        <View style={styles.topBar}>
          <Text style={styles.documentTitle}>Student Record</Text>

          <View
            style={[
              styles.checkStatusBadge,
              attendanceStatus?.current_status === "checked_in"
                ? styles.checkedInBadge
                : styles.checkedOutBadge,
            ]}
          >
            <Text
              style={[
                styles.checkStatusText,
                attendanceStatus?.current_status === "checked_in"
                  ? styles.checkedInText
                  : styles.checkedOutText,
              ]}
            >
              {attendanceStatus?.current_status === "checked_in"
                ? "Checked In"
                : "Checked Out"}
            </Text>
          </View>

          {/* {attendanceStatus?.scanned_at ? (
            <Text style={styles.lastScanText}>
              Last scan: {new Date(attendanceStatus.scanned_at).toLocaleString()}
            </Text>
          ) : null} */}

        </View>

        <View style={styles.headerSection}>
          <View style={styles.photoColumn}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.passportImage} />
            ) : (
              <View style={styles.passportPlaceholder}>
                <Text style={styles.passportPlaceholderText}>
                  {student.name?.charAt(0)?.toUpperCase() || "S"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.identityColumn}>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.studentId}>Student ID: {student.student_id}</Text>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              <View
                style={[
                  styles.statusBadge,
                  student.status === "active"
                    ? styles.activeBadge
                    : styles.inactiveBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    student.status === "active"
                      ? styles.activeBadgeText
                      : styles.inactiveBadgeText,
                  ]}
                >
                  {student.status || "-"}
                </Text>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Branch</Text>
                <Text style={styles.summaryValue}>{student.branch_name || "-"}</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Year / Class</Text>
                <Text style={styles.summaryValue}>{student.year_level || "-"}</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Gender</Text>
                <Text style={styles.summaryValue}>{student.gender || "-"}</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Room</Text>
                <Text style={styles.summaryValue}>{roomLabel}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date of Birth</Text>
            <Text style={styles.infoValue}>{student.dob || "-"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{student.phone_number || "-"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{student.address || "-"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guardian Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Guardian Name</Text>
            <Text style={styles.infoValue}>{student.guardian_name || "-"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Guardian Phone</Text>
            <Text style={styles.infoValue}>{student.guardian_phone || "-"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hostel Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Branch</Text>
            <Text style={styles.infoValue}>{student.branch_name || "-"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Unit</Text>
            <Text style={styles.infoValue}>{student.unit || "-"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Lorong</Text>
            <Text style={styles.infoValue}>{student.lorong || "-"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Room Number</Text>
            <Text style={styles.infoValue}>{student.room_number || "-"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Room Capacity</Text>
            <Text style={styles.infoValue}>
              {student.capacity !== undefined && student.capacity !== null
                ? String(student.capacity)
                : "-"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Remarks</Text>
          <Text style={styles.remarksText}>{student.remarks || "-"}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: colors.secondary,
    fontSize: 15,
  },
  emptyText: {
    color: ui.muted,
    fontSize: 15,
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  backButtonText: {
    color: colors.secondary,
    fontWeight: "700",
  },
  documentCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ui.border,
    padding: 22,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    gap: 12,
  },
  documentTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  checkStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  checkStatusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  headerSection: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 26,
    alignItems: "flex-start",
  },
  photoColumn: {
    width: 150,
  },
  passportImage: {
    width: 130,
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.border,
  },
  passportPlaceholder: {
    width: 130,
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  passportPlaceholderText: {
    fontSize: 42,
    fontWeight: "700",
    color: colors.black,
  },
  identityColumn: {
    flex: 1,
  },
  studentName: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 6,
  },
  studentId: {
    fontSize: 16,
    color: colors.secondary,
    fontWeight: "600",
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: "600",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeBadge: {
    backgroundColor: "#e8f5e9",
  },
  inactiveBadge: {
    backgroundColor: "#fdeaea",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  activeBadgeText: {
    color: colors.success,
  },
  inactiveBadgeText: {
    color: colors.error,
  },
  summaryGrid: {
    gap: 12,
  },
  summaryCard: {
    backgroundColor: ui.soft,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 12,
    padding: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: ui.muted,
    fontWeight: "600",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eef1f4",
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.secondary,
    fontWeight: "600",
  },
  infoValue: {
    flex: 1.4,
    fontSize: 14,
    color: colors.black,
    textAlign: "right",
  },
  remarksText: {
    fontSize: 14,
    color: colors.black,
    lineHeight: 22,
  },
  checkedInBadge: {
    backgroundColor: "rgba(40,167,69,0.12)",
    borderColor: colors.success,
  },

  checkedOutBadge: {
    backgroundColor: "rgba(220,53,69,0.12)",
    borderColor: colors.error,
  },

  checkedInText: {
    color: colors.success,
  },

  checkedOutText: {
    color: colors.error,
  },

  lastScanText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 6,
    textAlign: "right",
  },
});