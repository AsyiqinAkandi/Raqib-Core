import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";

import { colors } from "../../../theme/colors";
import { API_URL } from "../../../config/api";

type Student = {
  student_id: string;
  name: string;
  branch_name: string | null;
  unit: string | null;
  lorong: string | null;
  room_number: string | null;
  status: string;
  guardian_name: string | null;
  guardian_phone: string | null;
};

type Room = {
  branch_name: string | null;
  unit: string;
  lorong: string;
  room_number: string;
  capacity: number;
  occupant_count: string;
  status: string;
};

type LogItem = {
  user_name: string | null;
  user_email: string | null;
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

export default function AdminReportsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [wardenActivity, setWardenActivity] = useState<WardenActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      const [studentsRes, roomsRes, logsRes, dashboardRes] = await Promise.all([
        fetch(`${API_URL}/students`),
        fetch(`${API_URL}/rooms`),
        fetch(`${API_URL}/logs`),
        fetch(`${API_URL}/dashboard/admin`),
      ]);

      const studentsData = await studentsRes.json().catch(() => []);
      const roomsData = await roomsRes.json().catch(() => []);
      const logsData = await logsRes.json().catch(() => []);
      const dashboardData = await dashboardRes.json().catch(() => null);

      if (!studentsRes.ok) throw new Error("Failed to fetch students");
      if (!roomsRes.ok) throw new Error("Failed to fetch rooms");
      if (!logsRes.ok) throw new Error("Failed to fetch logs");
      if (!dashboardRes.ok) throw new Error("Failed to fetch dashboard data");

      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setLogs(Array.isArray(logsData) ? logsData : []);
      setWardenActivity(
        Array.isArray(dashboardData?.wardenActivity)
          ? dashboardData.wardenActivity
          : []
      );
    } catch (error: any) {
      console.error("fetchReportData error:", error);
      Alert.alert("Error", error?.message || "Failed to fetch report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const escapeCsv = (value: any) => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
  };

  const downloadCsv = (filename: string, rows: any[][]) => {
    const csvContent = rows
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    if (typeof window === "undefined") {
      Alert.alert("Export unavailable", "CSV export is only available on web.");
      return;
    }

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const exportStudents = () => {
    const rows = [
      [
        "Student ID",
        "Name",
        "Branch",
        "Room",
        "Status",
        "Guardian Name",
        "Guardian Phone",
      ],
      ...students.map((student) => [
        student.student_id,
        student.name,
        student.branch_name || "-",
        student.room_number
          ? `Unit ${student.unit || "-"} Lorong ${student.lorong || "-"} Room ${
              student.room_number
            }`
          : "Not assigned",
        student.status,
        student.guardian_name || "-",
        student.guardian_phone || "-",
      ]),
    ];

    downloadCsv("admin_student_master_list.csv", rows);
  };

  const exportRooms = () => {
    const rows = [
      [
        "Branch",
        "Unit",
        "Lorong",
        "Room Number",
        "Capacity",
        "Occupants",
        "Availability",
        "Status",
      ],
      ...rooms.map((room) => {
        const occupants = Number(room.occupant_count ?? 0);
        const capacity = Number(room.capacity ?? 0);

        const availability =
          room.status === "inactive"
            ? "Unavailable"
            : occupants >= capacity
            ? "Full"
            : "Available";

        return [
          room.branch_name || "-",
          room.unit,
          room.lorong,
          room.room_number,
          capacity,
          occupants,
          availability,
          room.status,
        ];
      }),
    ];

    downloadCsv("admin_room_occupancy_report.csv", rows);
  };

  const exportLogs = () => {
    const rows = [
      ["Timestamp", "User Name", "Email", "Role", "Branch", "Action", "Details"],
      ...logs.map((log) => [
        log.created_at,
        log.user_name || "Unknown",
        log.user_email || "-",
        log.user_role || "-",
        log.branch_name || "-",
        log.action,
        log.details || "-",
      ]),
    ];

    downloadCsv("admin_activity_logs.csv", rows);
  };

  const exportWardenActivity = () => {
    const rows = [
      ["Warden Name", "Email", "Branch", "Actions Today"],
      ...wardenActivity.map((warden) => [
        warden.name,
        warden.email,
        warden.branch_name || "-",
        warden.action_count,
      ]),
    ];

    downloadCsv("admin_warden_activity_summary.csv", rows);
  };

  const reportCards = useMemo(
    () => [
      {
        title: "Student Master List",
        description:
          "Export all student records with branch, room assignment, status, and guardian details.",
        count: students.length,
        button: "Export Students",
        onPress: exportStudents,
      },
      {
        title: "Room Occupancy Report",
        description:
          "Export all rooms with branch, unit, lorong, capacity, occupancy, and status.",
        count: rooms.length,
        button: "Export Rooms",
        onPress: exportRooms,
      },
      {
        title: "Activity Logs",
        description:
          "Export login, logout, create, update, delete, and attendance activity for auditing.",
        count: logs.length,
        button: "Export Logs",
        onPress: exportLogs,
      },
      {
        title: "Warden Activity Summary",
        description:
          "Export today’s action count for each warden to support user activity monitoring.",
        count: wardenActivity.length,
        button: "Export Warden Summary",
        onPress: exportWardenActivity,
      },
    ],
    [students, rooms, logs, wardenActivity]
  );

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Reports</Text>
        <Text style={styles.subtitle}>
          Export system-wide hostel records and user activity reports for
          monitoring, auditing, and management review.
        </Text>
      </View>

      <View style={styles.toolbarCard}>
        <View>
          <Text style={styles.toolbarTitle}>Report Exports</Text>
          <Text style={styles.toolbarSubtitle}>
            Data is exported as CSV files and can be opened in Excel or Google
            Sheets.
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={fetchReportData}>
          <Text style={styles.refreshButtonText}>
            {loading ? "Loading..." : "Refresh Data"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {reportCards.map((report) => (
          <View key={report.title} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{report.title}</Text>
                <Text style={styles.cardDescription}>
                  {report.description}
                </Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countValue}>{report.count}</Text>
                <Text style={styles.countLabel}>records</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.exportButton, loading && styles.disabledButton]}
              onPress={report.onPress}
              disabled={loading}
            >
              <Text style={styles.exportButtonText}>{report.button}</Text>
            </TouchableOpacity>
          </View>
        ))}
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
    maxWidth: 780,
  },
  toolbarCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
  },
  toolbarTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 4,
  },
  toolbarSubtitle: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
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
    grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between", // IMPORTANT
    },
    card: {
    width: "48%", // 2 per row with spacing
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    },
    cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start", // IMPORTANT
    gap: 12,
    marginBottom: 20,
    },
  cardTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 8,
  },
    cardDescription: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    maxWidth: "95%", // prevents overflow pushing badge
    },
    countBadge: {
    minWidth: 70,
    borderRadius: 14,
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    alignSelf: "flex-start",
    },
  countValue: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.accent,
  },
  countLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "700",
  },
  exportButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.65,
  },
  exportButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 14,
  },
});