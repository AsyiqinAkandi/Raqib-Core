import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";
import { API_URL } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

type Student = {
  id: number;
  student_id: string;
  name: string;
  profile_image?: string | null;
  gender?: string | null;
  year_level?: string | null;
  phone_number?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  branch_id: number | null;
  branch_name?: string | null;
  unit?: string | null;
  lorong?: string | null;
  room_number?: string | null;
  status?: string | null;
};

type AttendanceStatus = {
  current_status: "checked_in" | "checked_out";
  attendance_type: string | null;
  scanned_at: string | null;
};

export default function MobileStudentDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceStatus, setAttendanceStatus] =
    useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStudent = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/students/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch student");
      }

      if (
        user?.branch_id &&
        Number(data.branch_id) !== Number(user.branch_id)
      ) {
        Alert.alert(
          "Not allowed",
          "This student is not from your assigned branch."
        );
        router.replace("/students");
        return;
      }

      setStudent(data);

      const statusResponse = await fetch(
        `${API_URL}/students/${id}/attendance-status`
      );
      const statusData = await statusResponse.json();

      if (statusResponse.ok) {
        setAttendanceStatus(statusData);
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to load student details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchStudent();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading student details...</Text>
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Student not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCheckedIn = attendanceStatus?.current_status === "checked_in";

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={20} color={colors.primary} />
        <Text style={styles.backButtonText}>Back to Students</Text>
      </TouchableOpacity>

      <View style={styles.profileCard}>
        {student.profile_image ? (
          <Image source={{ uri: student.profile_image }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="person-outline" size={48} color={colors.muted} />
          </View>
        )}

        <Text style={styles.name}>{student.name}</Text>
        <Text style={styles.studentId}>{student.student_id}</Text>

        <View
          style={[
            styles.statusBadge,
            isCheckedIn ? styles.checkedInBadge : styles.checkedOutBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isCheckedIn ? styles.checkedInText : styles.checkedOutText,
            ]}
          >
            {isCheckedIn ? "Checked In" : "Checked Out"}
          </Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Student Information</Text>

        <Info label="Branch" value={student.branch_name || "-"} />
        <Info
          label="Room"
          value={
            student.room_number
              ? `Unit ${student.unit || "-"} • Lorong ${
                  student.lorong || "-"
                } • Room ${student.room_number}`
              : "Not assigned"
          }
        />
        <Info label="Year / Class" value={student.year_level || "-"} />
        <Info label="Gender" value={student.gender || "-"} />
        <Info label="Status" value={student.status || "-"} />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <Info label="Phone" value={student.phone_number || "-"} />
        <Info label="Guardian" value={student.guardian_name || "-"} />
        <Info label="Guardian Phone" value={student.guardian_phone || "-"} />
      </View>
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: colors.muted,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  backButtonText: {
    color: colors.primary,
    fontWeight: "800",
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  photo: {
    width: 116,
    height: 116,
    borderRadius: 58,
    marginBottom: 14,
  },
  photoPlaceholder: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.secondary,
    textAlign: "center",
  },
  studentId: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  statusBadge: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  checkedInBadge: {
    backgroundColor: "rgba(40,167,69,0.12)",
  },
  checkedOutBadge: {
    backgroundColor: "rgba(220,53,69,0.12)",
  },
  statusText: {
    fontWeight: "800",
  },
  checkedInText: {
    color: colors.success,
  },
  checkedOutText: {
    color: colors.error,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 10,
  },
  infoRow: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 15,
    color: colors.secondary,
    fontWeight: "700",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 12,
  },
});