import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

import { colors } from "../../../theme/colors";
import { API_URL } from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";

type MonthOption = {
  label: string;
  value: string;
};

type SummaryStats = {
  totalAttendance: number;
  totalCheckIns: number;
  totalCheckOuts: number;
  currentlyInHostel: number;
};

type DailyAttendancePoint = {
  label: string;
  value: number;
};

type RoomStatusData = {
  available: number;
  full: number;
  unavailable: number;
};

type CurrentlyInStudent = {
  id: number;
  student_id: string;
  name: string;
  scanned_at: string;
};

type ReportData = {
  summary: SummaryStats;
  dailyAttendance: DailyAttendancePoint[];
  roomStatus: RoomStatusData;
  needsAttention: {
    studentsWithoutRoom: number;
    currentlyInStudents: CurrentlyInStudent[];
  };
};

const EMPTY_REPORT: ReportData = {
  summary: {
    totalAttendance: 0,
    totalCheckIns: 0,
    totalCheckOuts: 0,
    currentlyInHostel: 0,
  },
  dailyAttendance: [],
  roomStatus: {
    available: 0,
    full: 0,
    unavailable: 0,
  },
  needsAttention: {
    studentsWithoutRoom: 0,
    currentlyInStudents: [],
  },
};

const MONTH_OPTIONS: MonthOption[] = [
  { label: "January 2026", value: "2026-01" },
  { label: "February 2026", value: "2026-02" },
  { label: "March 2026", value: "2026-03" },
  { label: "April 2026", value: "2026-04" },
  { label: "May 2026", value: "2026-05" },
  { label: "June 2026", value: "2026-06" },
];

const DUMMY_REPORTS: Record<string, ReportData> = {
  "2026-01": {
    summary: {
      totalAttendance: 182,
      totalCheckIns: 93,
      totalCheckOuts: 89,
      currentlyInHostel: 21,
    },
    dailyAttendance: Array.from({ length: 31 }, (_, i) => ({
      label: String(i + 1),
      value: [5, 0, 6, 3, 8, 2, 0, 4, 5, 6, 1, 0, 4, 7, 10, 3, 2, 0, 5, 7, 4, 6, 2, 1, 9, 5, 0, 4, 7, 11, 6][i],
    })),
    roomStatus: {
      available: 14,
      full: 6,
      unavailable: 2,
    },
    needsAttention: {
      studentsWithoutRoom: 3,
      currentlyInStudents: [
        {
          id: 1,
          student_id: "23-000101",
          name: "Sample Student A",
          scanned_at: "2026-01-15T19:30:00",
        },
      ],
    },
  },
  "2026-02": {
    summary: {
      totalAttendance: 201,
      totalCheckIns: 104,
      totalCheckOuts: 97,
      currentlyInHostel: 26,
    },
    dailyAttendance: Array.from({ length: 28 }, (_, i) => ({
      label: String(i + 1),
      value: [6, 0, 4, 5, 9, 2, 0, 5, 3, 7, 1, 4, 6, 0, 12, 3, 5, 6, 2, 8, 4, 0, 7, 3, 10, 5, 9, 13][i],
    })),
    roomStatus: {
      available: 13,
      full: 7,
      unavailable: 2,
    },
    needsAttention: {
      studentsWithoutRoom: 2,
      currentlyInStudents: [
        {
          id: 3,
          student_id: "23-000201",
          name: "Sample Student C",
          scanned_at: "2026-02-20T18:45:00",
        },
      ],
    },
  },
  "2026-03": {
    summary: {
      totalAttendance: 224,
      totalCheckIns: 116,
      totalCheckOuts: 108,
      currentlyInHostel: 28,
    },
    dailyAttendance: Array.from({ length: 31 }, (_, i) => ({
      label: String(i + 1),
      value: [7, 1, 0, 5, 11, 4, 3, 2, 0, 8, 6, 5, 1, 3, 14, 4, 2, 7, 5, 10, 3, 6, 2, 0, 13, 8, 5, 4, 7, 9, 15][i],
    })),
    roomStatus: {
      available: 12,
      full: 8,
      unavailable: 2,
    },
    needsAttention: {
      studentsWithoutRoom: 1,
      currentlyInStudents: [
        {
          id: 4,
          student_id: "23-000301",
          name: "Sample Student D",
          scanned_at: "2026-03-21T19:00:00",
        },
      ],
    },
  },
  "2026-05": EMPTY_REPORT,
  "2026-06": EMPTY_REPORT,
};

const getTodayInfo = () => {
  const today = new Date();

  return {
    currentMonthKey: `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`,
    currentDay: today.getDate(),
  };
};

export default function WardenReportsPage() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const isWide = width >= 1100;
  const selectedCardDirection = isWide ? "row" : "column";

  const branchId = user?.branch_id;
  const branchName = user?.branch_name || "your branch";

  const [selectedMonth, setSelectedMonth] = useState("2026-04");
  const [loading, setLoading] = useState(false);
  const [realAprilReport, setRealAprilReport] =
    useState<ReportData>(EMPTY_REPORT);

  const isAprilRealData = selectedMonth === "2026-04";

  const fetchAprilReport = async () => {
    if (!user?.branch_id) return;

    try {
      setLoading(true);

      const res = await fetch(
        `${API_URL}/reports/warden?branch_id=${user.branch_id}&month=2026-04`
      );

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.error || "Failed to fetch report");
        return;
      }

      setRealAprilReport(data);
    } catch (error) {
      console.error("Failed to fetch April report:", error);
      Alert.alert("Error", "Failed to fetch April report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMonth === "2026-04") {
      fetchAprilReport();
    }
  }, [selectedMonth, user?.branch_id]);

  const reportData = useMemo(() => {
    if (selectedMonth === "2026-04") {
      return realAprilReport;
    }

    return DUMMY_REPORTS[selectedMonth] || EMPTY_REPORT;
  }, [selectedMonth, realAprilReport]);

  const summary = reportData.summary;

  const dailyAttendance =
    reportData.dailyAttendance.length > 0
      ? reportData.dailyAttendance
      : [{ label: "1", value: 0 }];

  const roomStatus = reportData.roomStatus;

  const maxAttendanceValue = Math.max(
    ...dailyAttendance.map((item) => item.value),
    1
  );

  const roomStatusTotal =
    roomStatus.available + roomStatus.full + roomStatus.unavailable || 1;

  const { currentMonthKey, currentDay } = getTodayInfo();

  const handleExport = (type: "attendance" | "students" | "rooms") => {
    if (type !== "attendance") {
      Alert.alert("Export", "This export will be connected next.");
      return;
    }

    const rows = [
      ["Report Type", "Monthly Attendance"],
      ["Month", selectedMonth],
      ["Branch", user?.branch_name || "Warden Branch"],
      ["Data Source", isAprilRealData ? "Live Database" : "Demo Data"],
      [],
      ["Day", "Attendance Count"],
      ...reportData.dailyAttendance.map((item) => [
        item.label,
        String(item.value),
      ]),
      [],
      ["Total Attendance", String(summary.totalAttendance)],
      ["Total Check-Ins", String(summary.totalCheckIns)],
      ["Total Check-Outs", String(summary.totalCheckOuts)],
      ["Currently In Hostel", String(summary.currentlyInHostel)],
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    if (Platform.OS === "web") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-report-${selectedMonth}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } else {
      Alert.alert("Export", "CSV export is currently supported on web.");
    }
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>
          Review monthly attendance and export branch-based reports for{" "}
          {user?.branch_name || "your assigned branch"}.
        </Text>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Report Month</Text>
        <View style={styles.selectWrapper}>
          <Picker
            selectedValue={selectedMonth}
            onValueChange={(value) => setSelectedMonth(String(value))}
            style={styles.picker}
          >
            {MONTH_OPTIONS.map((month) => (
              <Picker.Item
                key={month.value}
                label={month.label}
                value={month.value}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.branchLabel}>
          Branch: {user?.branch_name || "Warden Branch"}
        </Text>

        <View
          style={[
            styles.dataBadge,
            isAprilRealData ? styles.realDataBadge : styles.demoDataBadge,
          ]}
        >
          <Text
            style={[
              styles.dataBadgeText,
              isAprilRealData ? styles.realDataText : styles.demoDataText,
            ]}
          >
            {isAprilRealData
              ? "April uses live database data"
              : "This month uses demo report data"}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading April report...</Text>
        </View>
      ) : (
        <>
          <View
            style={[
              styles.summaryRow,
              { flexDirection: selectedCardDirection as "row" | "column" },
            ]}
          >
            <View style={[styles.summaryCard, styles.primaryAccent]}>
              <Text style={styles.summaryLabel}>Total Attendance</Text>
              <Text style={styles.summaryValue}>{summary.totalAttendance}</Text>
            </View>

            <View style={[styles.summaryCard, styles.successAccent]}>
              <Text style={styles.summaryLabel}>Check-Ins</Text>
              <Text style={styles.summaryValue}>{summary.totalCheckIns}</Text>
            </View>

            <View style={[styles.summaryCard, styles.accentAccent]}>
              <Text style={styles.summaryLabel}>Check-Outs</Text>
              <Text style={styles.summaryValue}>{summary.totalCheckOuts}</Text>
            </View>

            <View style={[styles.summaryCard, styles.secondaryAccent]}>
              <Text style={styles.summaryLabel}>Currently In Hostel</Text>
              <Text style={styles.summaryValue}>
                {summary.currentlyInHostel}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.chartSection,
              { flexDirection: selectedCardDirection as "row" | "column" },
            ]}
          >
            <View style={[styles.chartCard, styles.lineChartCard]}>
              <Text style={styles.cardTitle}>Attendance by Day</Text>
              <Text style={styles.cardSubtitle}>
                Each day of the selected month is shown. Days without scans are
                recorded as 0.
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.barChartArea}>
                  {dailyAttendance.map((item) => {
                    const dayNumber = Number(item.label);

                    const isToday =
                      selectedMonth === currentMonthKey &&
                      dayNumber === currentDay;

                    const isFuture =
                      selectedMonth === currentMonthKey &&
                      dayNumber > currentDay;

                    const barHeight =
                      item.value > 0
                        ? Math.max((item.value / maxAttendanceValue) * 150, 4)
                        : 0;

                    return (
                      <View key={item.label} style={styles.barColumn}>
                        <Text
                          style={[
                            styles.barValue,
                            isToday && styles.todayText,
                            isFuture && styles.futureText,
                          ]}
                        >
                          {item.value}
                        </Text>

                        <View
                          style={[
                            styles.barTrack,
                            isToday && styles.todayBarTrack,
                            isFuture && styles.futureBarTrack,
                          ]}
                        >
                          <View
                            style={[
                              styles.barFill,
                              isToday && styles.todayBarFill,
                              isFuture && styles.futureBarFill,
                              { height: barHeight },
                            ]}
                          />
                        </View>

                        <Text
                          style={[
                            styles.barLabel,
                            isToday && styles.todayText,
                            isFuture && styles.futureText,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <View style={[styles.chartCard, styles.barChartCard]}>
              <Text style={styles.cardTitle}>Room Availability Summary</Text>
              <Text style={styles.cardSubtitle}>
                Current room status overview for your branch
              </Text>

              <View style={styles.statusChartWrap}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Available</Text>
                  <View style={styles.statusBarTrack}>
                    <View
                      style={[
                        styles.statusBarFill,
                        styles.availableFill,
                        {
                          width: `${
                            (roomStatus.available / roomStatusTotal) * 100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.statusValue}>{roomStatus.available}</Text>
                </View>

                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Full</Text>
                  <View style={styles.statusBarTrack}>
                    <View
                      style={[
                        styles.statusBarFill,
                        styles.fullFill,
                        {
                          width: `${
                            (roomStatus.full / roomStatusTotal) * 100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.statusValue}>{roomStatus.full}</Text>
                </View>

                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Unavailable</Text>
                  <View style={styles.statusBarTrack}>
                    <View
                      style={[
                        styles.statusBarFill,
                        styles.unavailableFill,
                        {
                          width: `${
                            (roomStatus.unavailable / roomStatusTotal) * 100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.statusValue}>
                    {roomStatus.unavailable}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.exportCard}>
            <Text style={styles.cardTitle}>Needs Attention</Text>
            <Text style={styles.cardSubtitle}>
              Items wardens may need to review for this branch.
            </Text>

            <View style={styles.attentionRow}>
              <Text style={styles.attentionLabel}>Students without room</Text>
              <Text style={styles.attentionValue}>
                {reportData.needsAttention.studentsWithoutRoom}
              </Text>
            </View>

            <Text style={styles.attentionSectionTitle}>
              Currently In Hostel
            </Text>

            {reportData.needsAttention.currentlyInStudents.length === 0 ? (
              <Text style={styles.emptyText}>
                No students currently checked in.
              </Text>
            ) : (
              reportData.needsAttention.currentlyInStudents.map((student) => (
                <View key={student.id} style={styles.studentMiniRow}>
                  <Text style={styles.studentMiniName}>{student.name}</Text>
                  <Text style={styles.studentMiniMeta}>
                    ID: {student.student_id} • Since{" "}
                    {new Date(student.scanned_at).toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.exportCard}>
            <Text style={styles.cardTitle}>Export Reports</Text>
            <Text style={styles.cardSubtitle}>
              Download branch-specific reports in CSV format.
            </Text>

            <View
              style={[
                styles.exportButtonRow,
                { flexDirection: selectedCardDirection as "row" | "column" },
              ]}
            >
              <TouchableOpacity
                style={styles.exportButton}
                onPress={() => handleExport("attendance")}
              >
                <Text style={styles.exportButtonTitle}>Attendance CSV</Text>
                <Text style={styles.exportButtonText}>
                  Monthly attendance records and totals
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportButton}
                onPress={() => handleExport("students")}
              >
                <Text style={styles.exportButtonTitle}>Student List CSV</Text>
                <Text style={styles.exportButtonText}>
                  Student records for this branch
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportButton}
                onPress={() => handleExport("rooms")}
              >
                <Text style={styles.exportButtonTitle}>Room Occupancy CSV</Text>
                <Text style={styles.exportButtonText}>
                  Capacity, occupancy, and room status
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
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
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    maxWidth: 760,
    lineHeight: 22,
  },
  filterCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.secondary,
    marginBottom: 8,
  },
  selectWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.white,
    marginBottom: 12,
  },
  picker: {
    width: "100%",
  },
  branchLabel: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "600",
  },
  dataBadge: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  realDataBadge: {
    backgroundColor: "rgba(40,167,69,0.10)",
    borderColor: "rgba(40,167,69,0.25)",
  },
  demoDataBadge: {
    backgroundColor: "rgba(197,160,89,0.12)",
    borderColor: "rgba(197,160,89,0.30)",
  },
  dataBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  realDataText: {
    color: colors.success,
  },
  demoDataText: {
    color: colors.accent,
  },
  loadingBox: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 30,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: colors.muted,
  },
  summaryRow: {
    gap: 16,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryAccent: {
    borderLeftWidth: 6,
    borderLeftColor: colors.primary,
  },
  successAccent: {
    borderLeftWidth: 6,
    borderLeftColor: colors.success,
  },
  accentAccent: {
    borderLeftWidth: 6,
    borderLeftColor: colors.accent,
  },
  secondaryAccent: {
    borderLeftWidth: 6,
    borderLeftColor: colors.secondary,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 10,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.primary,
  },
  chartSection: {
    gap: 20,
    marginBottom: 20,
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  lineChartCard: {
    flex: 1.35,
  },
  barChartCard: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.secondary,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 14,
  },
  barChartArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: 220,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  barColumn: {
    width: 34,
    alignItems: "center",
    marginHorizontal: 3,
  },
  barValue: {
    fontSize: 11,
    color: colors.secondary,
    marginBottom: 6,
    fontWeight: "600",
  },
  barTrack: {
    width: 22,
    height: 150,
    backgroundColor: "#edf1f4",
    borderRadius: 999,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  todayBarTrack: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  todayBarFill: {
    backgroundColor: colors.accent,
  },
  futureBarTrack: {
    backgroundColor: "#f1f3f5",
  },
  futureBarFill: {
    backgroundColor: "#dfe3e6",
  },
  todayText: {
    color: colors.accent,
    fontWeight: "800",
  },
  futureText: {
    color: "#b6bdc4",
  },
  barLabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 8,
    fontWeight: "600",
  },
  statusChartWrap: {
    marginTop: 8,
    gap: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusLabel: {
    width: 90,
    fontSize: 13,
    color: colors.secondary,
    fontWeight: "600",
  },
  statusBarTrack: {
    flex: 1,
    height: 14,
    backgroundColor: "#edf1f4",
    borderRadius: 999,
    overflow: "hidden",
    marginHorizontal: 12,
  },
  statusBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  availableFill: {
    backgroundColor: colors.success,
  },
  fullFill: {
    backgroundColor: colors.accent,
  },
  unavailableFill: {
    backgroundColor: colors.error,
  },
  statusValue: {
    width: 30,
    textAlign: "right",
    fontSize: 13,
    color: colors.secondary,
    fontWeight: "700",
  },
  exportCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 20,
  },
  attentionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  attentionLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  attentionValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  attentionSectionTitle: {
    marginTop: 16,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: "700",
    color: colors.secondary,
  },
  studentMiniRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  studentMiniName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  studentMiniMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 3,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
  },
  exportButtonRow: {
    gap: 14,
    marginTop: 8,
  },
  exportButton: {
    flex: 1,
    backgroundColor: "#f7f8fa",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
  },
  exportButtonTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 6,
  },
  exportButtonText: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },
});