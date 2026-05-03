import { useEffect, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { CameraView, Camera } from "expo-camera";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";
import { API_URL } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

type Student = {
  id: number;
  name: string;
  student_id: string;
  branch_id: number;
  room_number?: string | null;
};

const categoryOptions = [
  { label: "Weekly Check", value: "weekly" },
  { label: "Hostel Leave", value: "hostel_leave" },
  { label: "Sick Leave", value: "sick_leave" },
  { label: "Emergency Leave", value: "emergency_leave" },
  { label: "Other", value: "other" },
];

export default function ScanScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [lastScanData, setLastScanData] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [mode, setMode] = useState<"check_in" | "check_out">("check_in");
  const [failedScans, setFailedScans] = useState(0);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [lastAttendanceId, setLastAttendanceId] = useState<number | null>(null);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [category, setCategory] = useState("weekly");
  const [noteText, setNoteText] = useState("");

  const branchId = user?.branch_id;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const logFailedScan = async (attemptedBarcode: string, reason: string) => {
    try {
      await fetch(`${API_URL}/logs/scan-failed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user?.id,
          attempted_barcode: attemptedBarcode,
          reason,
        }),
      });
    } catch (error) {
      console.log("Failed scan log error:", error);
    }
  };

  const handleFailedScan = (message: string) => {
    const nextCount = failedScans + 1;

    setFailedScans(nextCount);
    setStatusType("error");
    setLastScanData(message);
    setLastAttendanceId(null);

    if (nextCount >= 3) {
      setManualModalVisible(true);
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    setSaving(true);

    try {
      const studentRes = await fetch(`${API_URL}/students/barcode/${data}`);
      const student: Student = await studentRes.json();

      if (!studentRes.ok) {
        await logFailedScan(data, "Student not found");
        handleFailedScan("Student not found. Please try again.");
        return;
      }

      if (branchId && Number(student.branch_id) !== Number(branchId)) {
        await logFailedScan(data, "Wrong branch");
        handleFailedScan("This student is not from your assigned branch.");
        return;
      }

      const attendanceRes = await fetch(`${API_URL}/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: student.id,
          attendance_type: mode,
          scanned_by: user?.id,
          notes: null,
          category: "weekly",
          branch_id: branchId,
        }),
      });

      const attendanceData = await attendanceRes.json().catch(() => null);

      if (!attendanceRes.ok) {
        await logFailedScan(data, attendanceData?.error || "Attendance failed");
        setStatusType("error");
        setLastScanData(attendanceData?.error || "Failed to record attendance.");
        setLastAttendanceId(null);
        return;
      }

      setFailedScans(0);
      setStatusType("success");
      setLastAttendanceId(attendanceData?.id || null);
      setLastScanData(
        `${student.name} ${
          mode === "check_in" ? "checked in" : "checked out"
        } successfully${student.room_number ? ` • Room ${student.room_number}` : ""}`
      );
    } catch (err) {
      console.error(err);
      await logFailedScan(data, "Scanner error");
      handleFailedScan("Scanner error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleScanAgain = () => {
    setScanned(false);
    setLastScanData(null);
    setStatusType(null);
    setLastAttendanceId(null);
    setCategory("weekly");
    setNoteText("");
  };

  const handleSaveNote = async () => {
    if (!lastAttendanceId) return;

    try {
      const response = await fetch(`${API_URL}/attendance/${lastAttendanceId}/note`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          notes: noteText.trim() || null,
          updated_by: user?.id,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to save note.");
      }

      setNoteModalVisible(false);
      setLastScanData((prev) =>
        prev
          ? `${prev}\nNote added: ${formatCategory(category)}`
          : `Note added: ${formatCategory(category)}`
      );
      setCategory("weekly");
      setNoteText("");
    } catch (error: any) {
      setStatusType("error");
      setLastScanData(error?.message || "Failed to save note.");
    }
  };

  const formatCategory = (value: string) => {
    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.centeredText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredTitle}>No Camera Access</Text>
        <Text style={styles.centeredText}>
          Please allow camera permission to scan student barcodes.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <View style={styles.topPanel}>
        <Text style={styles.title}>Scan Barcode</Text>
        <Text style={styles.subtitle}>{user?.branch_name || "Warden Branch"}</Text>

        <View style={styles.toggleContainer}>
          <Pressable
            style={[styles.toggleButton, mode === "check_in" && styles.activeButton]}
            onPress={() => setMode("check_in")}
          >
            <Text style={[styles.toggleText, mode === "check_in" && styles.activeToggleText]}>
              Check In
            </Text>
          </Pressable>

          <Pressable
            style={[styles.toggleButton, mode === "check_out" && styles.activeButton]}
            onPress={() => setMode("check_out")}
          >
            <Text style={[styles.toggleText, mode === "check_out" && styles.activeToggleText]}>
              Check Out
            </Text>
          </Pressable>
        </View>
      </View>

      <View pointerEvents="none" style={styles.scanOverlay}>
        <View style={styles.scanBox}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        <Text style={styles.scanHint}>Place barcode inside the frame</Text>
      </View>

      <View style={styles.bottomPanel}>
        {saving ? (
          <View style={styles.resultCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.resultText}>Recording attendance...</Text>
          </View>
        ) : lastScanData ? (
          <View
            style={[
              styles.resultCard,
              statusType === "success" ? styles.successCard : styles.errorCard,
            ]}
          >
            <Ionicons
              name={statusType === "success" ? "checkmark-circle" : "alert-circle"}
              size={22}
              color={statusType === "success" ? colors.success : colors.error}
            />
            <Text style={styles.resultText}>{lastScanData}</Text>
          </View>
        ) : (
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>Waiting for scan...</Text>
          </View>
        )}

        <View style={styles.bottomButtonRow}>
          <TouchableOpacity style={styles.scanAgainButton} onPress={handleScanAgain}>
            <Ionicons name="refresh-outline" size={20} color={colors.white} />
            <Text style={styles.scanAgainText}>Scan Again</Text>
          </TouchableOpacity>

          {lastAttendanceId && (
            <TouchableOpacity
              style={styles.noteButton}
              onPress={() => setNoteModalVisible(true)}
            >
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <Text style={styles.noteButtonText}>Add Note</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal visible={manualModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Having trouble scanning?</Text>
            <Text style={styles.modalText}>
              The barcode was not matched after 3 attempts. You can continue by
              entering the Student ID manually.
            </Text>

            <TouchableOpacity
              style={styles.manualButton}
              onPress={() => {
                setManualModalVisible(false);
                router.push("/attendance");
              }}
            >
              <Text style={styles.manualButtonText}>Go to Manual Attendance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => {
                setManualModalVisible(false);
                setFailedScans(0);
                handleScanAgain();
              }}
            >
              <Text style={styles.cancelModalText}>Try Scanning Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={noteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Attendance Note</Text>
            <Text style={styles.modalText}>
              Add a reason only when this attendance has a special case.
            </Text>

            <Text style={styles.modalLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {categoryOptions.map((item) => {
                const active = category === item.value;

                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.categoryChip, active && styles.activeCategoryChip]}
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

            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Example: Fever, guardian picked up early"
              placeholderTextColor={colors.muted}
              multiline
            />

            <TouchableOpacity style={styles.manualButton} onPress={handleSaveNote}>
              <Text style={styles.manualButtonText}>Save Note</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => setNoteModalVisible(false)}
            >
              <Text style={styles.cancelModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.black,
  },
  camera: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 24,
  },
  centeredTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 8,
  },
  centeredText: {
    color: colors.muted,
    textAlign: "center",
  },
  topPanel: {
    position: "absolute",
    top: 20,
    left: 18,
    right: 18,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    padding: 16,
  },
  title: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
    marginBottom: 14,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    alignItems: "center",
  },
  activeButton: {
    backgroundColor: colors.accent,
  },
  toggleText: {
    color: colors.white,
    fontWeight: "800",
  },
  activeToggleText: {
    color: colors.black,
  },
  scanOverlay: {
    position: "absolute",
    top: "34%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scanBox: {
    width: 270,
    height: 170,
    borderRadius: 20,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 42,
    height: 42,
    borderColor: colors.highlight,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 20,
  },
  scanHint: {
    marginTop: 14,
    color: colors.white,
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    overflow: "hidden",
  },
  bottomPanel: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 24,
  },
  resultCard: {
    minHeight: 58,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  successCard: {
    borderWidth: 1,
    borderColor: "rgba(40,167,69,0.35)",
  },
  errorCard: {
    borderWidth: 1,
    borderColor: "rgba(220,53,69,0.35)",
  },
  resultText: {
    flex: 1,
    color: colors.secondary,
    fontWeight: "700",
    lineHeight: 20,
  },
  bottomButtonRow: {
    flexDirection: "row",
    gap: 10,
  },
  scanAgainButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  scanAgainText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
  },
  noteButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  noteButtonText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 22,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 8,
  },
  modalText: {
    color: colors.muted,
    lineHeight: 21,
    marginBottom: 18,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
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
  noteInput: {
    minHeight: 90,
    textAlignVertical: "top",
    marginBottom: 14,
  },
  manualButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  manualButtonText: {
    color: colors.white,
    fontWeight: "800",
  },
  cancelModalButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelModalText: {
    color: colors.secondary,
    fontWeight: "800",
  },
});