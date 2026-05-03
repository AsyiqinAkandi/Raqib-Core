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

type RoomDetails = {
  id: number;
  branch_id: number;
  branch_name: string;
  unit: string;
  lorong: string;
  room_number: string;
  capacity: number;
  status: "active" | "inactive";
  occupant_count: number | string;
  remarks?: string | null;
};

type RoomStudent = {
  id: number;
  student_id: string;
  name: string;
  profile_image?: string | null;
  year_level?: string | null;
  status?: string | null;
};

type RoomResponse = {
  room: RoomDetails;
  students: RoomStudent[];
};

export default function RoomDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { user } = useAuth();

  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roomData, setRoomData] = useState<RoomResponse | null>(null);

  const fetchRoomDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/rooms/${id}`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch room details");
      }

      setRoomData(data);
    } catch (error: any) {
      console.error("fetchRoomDetails error:", error);
      Alert.alert("Error", error?.message || "Failed to fetch room details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRoomDetails();
  }, [fetchRoomDetails]);

  const confirmAction = async (title: string, message: string) => {
    if (typeof window !== "undefined") {
      return window.confirm(`${title}\n\n${message}`);
    }

    return await new Promise<boolean>((resolve) => {
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Yes", onPress: () => resolve(true) },
      ]);
    });
  };

  const handleToggleStatus = async () => {
    if (!roomData?.room) return;

    const room = roomData.room;
    const nextStatus = room.status === "active" ? "inactive" : "active";

    const confirmed = await confirmAction(
      `${nextStatus === "inactive" ? "Disable" : "Enable"} Room`,
      `Are you sure you want to mark Room ${room.room_number} as ${nextStatus}?`
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/rooms/${room.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branch_id: Number(room.branch_id),
          unit: room.unit,
          lorong: room.lorong,
          room_number: room.room_number,
          capacity: Number(room.capacity),
          status: nextStatus,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update room status");
      }

      await fetchRoomDetails();
      Alert.alert("Success", `Room marked as ${nextStatus}.`);
    } catch (error: any) {
      console.error("handleToggleStatus error:", error);
      Alert.alert("Error", error?.message || "Failed to update room status.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading room details...</Text>
      </View>
    );
  }

  if (!roomData?.room) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Room not found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const room = roomData.room;
  const students = roomData.students || [];
  const occupantCount = Number(room.occupant_count ?? 0);
  const isDisabled = room.status === "inactive";
  const isFull = occupantCount >= Number(room.capacity);

  const availabilityLabel = isDisabled
    ? "Unavailable"
    : isFull
    ? "Full"
    : "Available";

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
    <TouchableOpacity
      style={styles.backButton}
      onPress={() =>
        router.push(
          isAdmin ? "/(web)/admin/rooms" : "/(web)/warden/rooms"
        )
      }
    >
      <Text style={styles.backButtonText}>← Back to Rooms</Text>
    </TouchableOpacity>

      <View style={styles.headerCard}>
        <View style={styles.headerLeft}>
          <Text style={styles.pageTitle}>Room {room.room_number}</Text>
          <Text style={styles.pageSubtitle}>
            {room.branch_name} • Unit {room.unit} • Lorong {room.lorong}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            room.status === "active" ? styles.activeBadge : styles.inactiveBadge,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              room.status === "active"
                ? styles.activeBadgeText
                : styles.inactiveBadgeText,
            ]}
          >
            {room.status === "active" ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      <View style={styles.mainGrid}>
        <View style={styles.leftColumn}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Room Overview</Text>

            <View style={styles.overviewGrid}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Branch</Text>
                <Text style={styles.infoValue}>{room.branch_name}</Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Unit</Text>
                <Text style={styles.infoValue}>{room.unit}</Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Lorong</Text>
                <Text style={styles.infoValue}>{room.lorong}</Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Capacity</Text>
                <Text style={styles.infoValue}>{room.capacity}</Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Occupancy</Text>
                <Text style={styles.infoValue}>
                  {occupantCount}/{room.capacity}
                </Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Availability</Text>
                <Text
                  style={[
                    styles.infoValue,
                    isDisabled
                      ? styles.unavailableText
                      : isFull
                      ? styles.fullText
                      : styles.availableText,
                  ]}
                >
                  {availabilityLabel}
                </Text>
              </View>
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Occupancy Usage</Text>
                <Text style={styles.progressValue}>
                  {Math.round((occupantCount / Number(room.capacity || 1)) * 100)}%
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        (occupantCount / Number(room.capacity || 1)) * 100,
                        100
                      )}%`,
                    },
                    isFull && styles.fullProgressFill,
                    isDisabled && styles.disabledProgressFill,
                  ]}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                room.status === "active" ? styles.disableButton : styles.enableButton,
              ]}
              onPress={handleToggleStatus}
              disabled={saving}
            >
              <Text style={styles.toggleButtonText}>
                {saving
                  ? "Updating..."
                  : room.status === "active"
                  ? "Disable Room"
                  : "Enable Room"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.rightColumn}>
                  
          {room.remarks && (
            <View style={styles.remarksCard}>
              <Text style={styles.remarksTitle}>Remarks</Text>
              <Text style={styles.remarksText}>{room.remarks}</Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Assigned Students</Text>
            <Text style={styles.cardSubtitle}>
              Tap a student to open their full profile.
            </Text>

            {students.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  No students are currently assigned to this room.
                </Text>
              </View>
            ) : (
              students.map((student) => (
                <TouchableOpacity
                  key={student.id}
                  style={styles.studentRow}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: "/(web)/student-details/[id]",
                      params: { id: String(student.id) },
                    })
                  }
                >
                  {student.profile_image ? (
                    <Image
                      source={{ uri: student.profile_image }}
                      style={styles.studentAvatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {student.name?.charAt(0)?.toUpperCase() || "S"}
                      </Text>
                    </View>
                  )}

                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentMeta}>
                      Student ID: {student.student_id}
                    </Text>
                    <Text style={styles.studentMeta}>
                      Year: {student.year_level || "-"} • Status:{" "}
                      {student.status || "-"}
                    </Text>
                  </View>

                  <Text style={styles.openText}>View →</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
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
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 14,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  backButtonText: {
    color: colors.secondary,
    fontWeight: "700",
  },
  headerCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  activeBadge: {
    backgroundColor: "rgba(40,167,69,0.12)",
    borderColor: colors.success,
  },
  activeBadgeText: {
    color: colors.success,
  },
  inactiveBadge: {
    backgroundColor: "rgba(220,53,69,0.12)",
    borderColor: colors.error,
  },
  inactiveBadgeText: {
    color: colors.error,
  },
  mainGrid: {
    flexDirection: "row",
    gap: 20,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  leftColumn: {
    flex: 1,
    minWidth: 320,
  },
  rightColumn: {
    flex: 1,
    minWidth: 320,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.secondary,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 16,
    lineHeight: 20,
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },
  infoBox: {
    width: "48%",
    backgroundColor: "#f7f8fa",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 6,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "700",
  },
  availableText: {
    color: colors.success,
  },
  fullText: {
    color: colors.accent,
  },
  unavailableText: {
    color: colors.error,
  },
  progressSection: {
    marginTop: 20,
    marginBottom: 18,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    color: colors.secondary,
    fontWeight: "700",
    fontSize: 14,
  },
  progressValue: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  progressTrack: {
    height: 12,
    backgroundColor: "#edf1f4",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.success,
    borderRadius: 999,
  },
  fullProgressFill: {
    backgroundColor: colors.accent,
  },
  disabledProgressFill: {
    backgroundColor: colors.error,
  },
  toggleButton: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  disableButton: {
    backgroundColor: colors.error,
  },
  enableButton: {
    backgroundColor: colors.success,
  },
  toggleButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    backgroundColor: colors.white,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 4,
  },
  studentMeta: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 2,
  },
  openText: {
    color: colors.accent,
    fontWeight: "700",
    marginLeft: 10,
  },
  emptyBox: {
    backgroundColor: "#f7f8fa",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 12,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  remarksCard: {
    backgroundColor: "rgba(220,53,69,0.08)",
    borderWidth: 1,
    borderColor: "rgba(220,53,69,0.25)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  remarksTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.error,
    marginBottom: 6,
  },
  remarksText: {
    fontSize: 14,
    color: colors.secondary,
    lineHeight: 20,
  },
});