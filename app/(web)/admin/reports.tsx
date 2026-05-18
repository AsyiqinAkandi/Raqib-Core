import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
} from "react-native";

import { colors } from "../../../theme/colors";
import { API_URL } from "../../../config/api";

/* =========================================================
   TYPE DEFINITIONS
   Defines the shape of data used by the admin reports page.
========================================================= */
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

type AttendanceItem = {
  scanned_at: string;
  attendance_type: string;
  category: string | null;
  notes: string | null;
  name: string;
  student_code: string;
  room_number: string | null;
  scanned_by_name: string | null;
};

type WardenActivity = {
  user_id: number;
  name: string;
  email: string;
  branch_name: string | null;
  action_count: number;
};

/* =========================================================
   ADMIN REPORTS PAGE
   Allows admins to export system-wide CSV reports.
========================================================= */
export default function AdminReportsPage() {
  /* =========================================================
     STATE
     Stores report data fetched from the backend.
  ========================================================= */
  const [students, setStudents] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [wardenActivity, setWardenActivity] = useState<WardenActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  /* =========================================================
     FETCH REPORT DATA
     Loads students, rooms, attendance records, activity logs, and warden activity.
  ========================================================= */
  const MONTH_LABELS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const fetchReportData = async () => {
    try {
      setLoading(true);

      const [studentsRes, roomsRes, attendanceRes, logsRes, dashboardRes] = await Promise.all([
        fetch(`${API_URL}/students`),
        fetch(`${API_URL}/rooms`),
        fetch(`${API_URL}/attendance`),
        fetch(`${API_URL}/logs`),
        fetch(`${API_URL}/dashboard/admin`),
      ]);

      const studentsData = await studentsRes.json().catch(() => []);
      const roomsData = await roomsRes.json().catch(() => []);
      const attendanceData = await attendanceRes.json().catch(() => []);
      const logsData = await logsRes.json().catch(() => []);
      const dashboardData = await dashboardRes.json().catch(() => null);

      if (!studentsRes.ok) throw new Error("Failed to fetch students");
      if (!roomsRes.ok) throw new Error("Failed to fetch rooms");
      if (!attendanceRes.ok) throw new Error("Failed to fetch attendance");
      if (!logsRes.ok) throw new Error("Failed to fetch logs");
      if (!dashboardRes.ok) throw new Error("Failed to fetch dashboard data");

      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
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

  /* =========================================================
     INITIAL LOAD
     Fetches report data once when the page opens.
  ========================================================= */
  useEffect(() => {
    fetchReportData();
  }, []);

  /* =========================================================
     AUTOMATIC MONTH/YEAR OPTIONS
     Detects available report months from attendance first, then logs as fallback.
  ========================================================= */
  const reportDateSources = useMemo(() => {
    return [
      ...attendance.map((item) => item.scanned_at),
      ...logs.map((log) => log.created_at),
    ].filter(Boolean);
  }, [attendance, logs]);

  const availableYears = useMemo(() => {
    const years = reportDateSources
      .map((dateValue) => new Date(dateValue).getFullYear())
      .filter((year) => !Number.isNaN(year));

    return Array.from(new Set(years)).sort((a, b) => b - a);
  }, [reportDateSources]);

  const availableMonths = useMemo(() => {
    const months = reportDateSources
      .filter((dateValue) => {
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return false;
        if (!selectedYear) return true;
        return date.getFullYear() === Number(selectedYear);
      })
      .map((dateValue) => new Date(dateValue).getMonth() + 1)
      .filter((month) => !Number.isNaN(month));

    return Array.from(new Set(months)).sort((a, b) => a - b);
  }, [reportDateSources, selectedYear]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter((item) => {
      const date = new Date(item.scanned_at);
      if (Number.isNaN(date.getTime())) return false;

      const matchesYear = selectedYear
        ? date.getFullYear() === Number(selectedYear)
        : true;

      const matchesMonth = selectedMonth
        ? date.getMonth() + 1 === Number(selectedMonth)
        : true;

      return matchesYear && matchesMonth;
    });
  }, [attendance, selectedYear, selectedMonth]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const date = new Date(log.created_at);
      if (Number.isNaN(date.getTime())) return false;

      const matchesYear = selectedYear
        ? date.getFullYear() === Number(selectedYear)
        : true;

      const matchesMonth = selectedMonth
        ? date.getMonth() + 1 === Number(selectedMonth)
        : true;

      return matchesYear && matchesMonth;
    });
  }, [logs, selectedYear, selectedMonth]);

  const selectedPeriodLabel = useMemo(() => {
    const yearLabel = selectedYear || "All Years";
    const monthLabel = selectedMonth
      ? MONTH_LABELS[Number(selectedMonth) - 1]
      : "All Months";

    return `${monthLabel}, ${yearLabel}`;
  }, [selectedMonth, selectedYear]);
  /* =========================================================
     CSV HELPERS
     Escapes CSV values and downloads generated CSV files.
  ========================================================= */
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

  /* =========================================================
     EXPORT STUDENT MASTER LIST
     Exports all student records with branch, room, and guardian details.
  ========================================================= */
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

  /* =========================================================
     EXPORT ROOM OCCUPANCY REPORT
     Exports all rooms with capacity, occupant count, and availability.
  ========================================================= */
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

  /* =========================================================
     EXPORT ATTENDANCE RECORDS
     Exports attendance records based on the selected month and year.
  ========================================================= */
  const exportAttendance = () => {
    const rows = [
      ["Report Period", selectedPeriodLabel],
      [],
      [
        "Timestamp",
        "Student ID",
        "Name",
        "Attendance Type",
        "Category",
        "Notes",
        "Room",
        "Scanned By",
      ],
      ...filteredAttendance.map((item) => [
        item.scanned_at,
        item.student_code,
        item.name,
        item.attendance_type,
        item.category || "-",
        item.notes || "-",
        item.room_number || "-",
        item.scanned_by_name || "-",
      ]),
    ];

    downloadCsv("admin_attendance_records.csv", rows);
  };

  /* =========================================================
     EXPORT ACTIVITY LOGS
     Exports system logs for monitoring and audit purposes.
  ========================================================= */
  const exportLogs = () => {
    const rows = [
      ["Report Period", selectedPeriodLabel],
      [],
      ["Timestamp", "User Name", "Email", "Role", "Branch", "Action", "Details"],
      ...filteredLogs.map((log) => [
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

  /* =========================================================
     EXPORT WARDEN ACTIVITY SUMMARY
     Exports each warden's action count from the admin dashboard data.
  ========================================================= */
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

  /* =========================================================
     REPORT CARDS
     Defines the cards displayed on the reports page.
  ========================================================= */
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
        title: "Attendance Records",
        description:
          "Export attendance records for the selected month and year using existing database data.",
        count: filteredAttendance.length,
        button: "Export Attendance",
        onPress: exportAttendance,
      },
      {
        title: "Activity Logs",
        description:
          "Export login, logout, create, update, delete, and attendance activity for auditing.",
        count: filteredLogs.length,
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
    [students, rooms, filteredAttendance, filteredLogs, wardenActivity, selectedPeriodLabel]
  );

  /* =========================================================
     PAGE UI
     Main admin reports layout.
  ========================================================= */
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
      {/* =========================================================
         PAGE HEADER
      ========================================================= */}
      <View style={styles.header}>
        <Text style={styles.title}>Admin Reports</Text>
        <Text style={styles.subtitle}>
          Export system-wide hostel records and user activity reports for
          monitoring, auditing, and management review.
        </Text>
      </View>

      {/* =========================================================
         TOOLBAR
         Shows export explanation and refresh action.
      ========================================================= */}
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

      {/* =========================================================
         AUTOMATIC MONTH/YEAR FILTER
         Options are populated from months that actually exist in attendance/log data.
      ========================================================= */}
      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>Filter by Month</Text>
        <Text style={styles.filterSubtitle}>
          Month and year options are detected automatically from existing database records.
        </Text>

        <View style={styles.filterRow}>
          {/* Year dropdown */}
          <View style={styles.customDropdownWrapper}>
            <Pressable
              style={styles.customDropdownButton}
              onPress={() => setShowYearDropdown(!showYearDropdown)}
            >
              <Text style={styles.customDropdownText}>
                {selectedYear || "All Years"}
              </Text>
            </Pressable>

            {showYearDropdown && (
              <View style={styles.customDropdownMenu}>
                <Pressable
                  style={styles.customDropdownItem}
                  onPress={() => {
                    setSelectedYear("");
                    setSelectedMonth("");
                    setShowYearDropdown(false);
                  }}
                >
                  <Text>All Years</Text>
                </Pressable>

                {availableYears.map((year) => (
                  <Pressable
                    key={year}
                    style={styles.customDropdownItem}
                    onPress={() => {
                      setSelectedYear(String(year));
                      setSelectedMonth("");
                      setShowYearDropdown(false);
                    }}
                  >
                    <Text>{year}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Month dropdown */}
          <View style={styles.customDropdownWrapper}>
            <Pressable
              style={styles.customDropdownButton}
              onPress={() => setShowMonthDropdown(!showMonthDropdown)}
            >
              <Text style={styles.customDropdownText}>
                {selectedMonth
                  ? MONTH_LABELS[Number(selectedMonth) - 1]
                  : "All Months"}
              </Text>
            </Pressable>

            {showMonthDropdown && (
              <View style={styles.customDropdownMenu}>
                <Pressable
                  style={styles.customDropdownItem}
                  onPress={() => {
                    setSelectedMonth("");
                    setShowMonthDropdown(false);
                  }}
                >
                  <Text>All Months</Text>
                </Pressable>

                {availableMonths.map((month) => (
                  <Pressable
                    key={month}
                    style={styles.customDropdownItem}
                    onPress={() => {
                      setSelectedMonth(String(month));
                      setShowMonthDropdown(false);
                    }}
                  >
                    <Text>{MONTH_LABELS[month - 1]}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* =========================================================
         REPORT CARD GRID
         Displays each available CSV export option.
      ========================================================= */}
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

/* =========================================================
   STYLES
   Visual styling for the admin reports page.
========================================================= */
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
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
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
    alignItems: "flex-start",
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
    maxWidth: "95%",
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

  filterCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },

  filterTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 4,
  },

  filterSubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 8,
  },

  filterActiveText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 14,
  },

  filterEmptyText: {
    fontSize: 13,
    color: colors.error,
    marginTop: 12,
    fontWeight: "700",
  },

  filterRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },

  customDropdownWrapper: {
    flex: 1,
    minWidth: 180,
    position: "relative",
    zIndex: 10,
  },

  customDropdownButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
  },

  customDropdownText: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: "700",
  },

  customDropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    overflow: "hidden",
    zIndex: 99,
  },

  customDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
