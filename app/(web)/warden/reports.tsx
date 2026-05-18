import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

import { colors } from "../../../theme/colors";
import { API_URL } from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import { DEMO_REPORT_MONTHS, demoReports } from "../../../context/demoReportData";

type DailyAttendance = {
  label: string;
  value: number;
};

type ReportData = {
  summary: {
    totalAttendance: number;
    totalCheckIns: number;
    totalCheckOuts: number;
    currentlyInHostel: number;
  };
  dailyAttendance: DailyAttendance[];
  roomStatus: {
    available: number;
    full: number;
    unavailable: number;
  };
  needsAttention: {
    studentsWithoutRoom: number;
    currentlyInStudents: {
      id?: number;
      student_id: string;
      name: string;
      scanned_at: string;
    }[];
  };
  detailedAttendanceRecords: {
    date: string;
    student_id: string;
    name: string;
    type: string;
    category: string;
    notes: string;
    scanned_by: string;
    attendance_type: string;
  }[];
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
  detailedAttendanceRecords: [],
};

const MONTH_OPTIONS = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

export default function WardenReportsPage() {
  const { user } = useAuth();
  const today = new Date();

  const [selectedMonthNumber, setSelectedMonthNumber] = useState(
    today.getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData>(EMPTY_REPORT);

  const YEAR_OPTIONS = useMemo(() => {
    return Array.from({ length: 5 }, (_, index) => today.getFullYear() - 1 + index);
  }, []);

  const selectedMonth = useMemo(() => {
    return `${selectedYear}-${String(selectedMonthNumber).padStart(2, "0")}`;
  }, [selectedMonthNumber, selectedYear]);

  const selectedMonthLabel = useMemo(() => {
    const monthLabel =
      MONTH_OPTIONS.find((item) => item.value === selectedMonthNumber)?.label ||
      selectedMonth;

    return `${monthLabel} ${selectedYear}`;
  }, [selectedMonthNumber, selectedYear, selectedMonth]);

  const todayLabel = useMemo(() => {
    return today.toLocaleDateString("en-BN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }, []);

  const isDemoDataMonth = useMemo(() => {
    return DEMO_REPORT_MONTHS.includes(selectedMonth);
  }, [selectedMonth]);

  const maxDailyValue = Math.max(
    ...reportData.dailyAttendance.map((item) => item.value),
    1
  );

  const totalRooms =
    reportData.roomStatus.available +
    reportData.roomStatus.full +
    reportData.roomStatus.unavailable;

  const getRoomPercent = (value: number) => {
    if (totalRooms === 0) return 0;
    return (value / totalRooms) * 100;
  };

  const fetchReport = async () => {
    if (!user?.branch_id) {
      setReportData(EMPTY_REPORT);
      return;
    }

    try {
      setLoading(true);

      if (DEMO_REPORT_MONTHS.includes(selectedMonth)) {
        setReportData(demoReports[selectedMonth] || EMPTY_REPORT);
        return;
      }

      const res = await fetch(
        `${API_URL}/reports/warden?branch_id=${user.branch_id}&month=${selectedMonth}`
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch report");
      }

      setReportData({
        ...EMPTY_REPORT,
        ...(data || {}),
        detailedAttendanceRecords:
          data?.detailedAttendanceRecords || data?.detailedAttendance || [],
      });
    } catch (error: any) {
      console.error("fetchReport error:", error);
      Alert.alert("Error", error?.message || "Failed to fetch report data.");
      setReportData(EMPTY_REPORT);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, user?.branch_id]);

  const exportCSV = () => {
    const rows = [
      ["Raqib Core Warden Report"],
      ["Branch", user?.branch_name || "-"],
      ["Report Month", selectedMonthLabel],
      ["Data Source", isDemoDataMonth ? "Dummy Demo Data" : "Live Database"],
      [],
      ["Summary"],
      ["Total Attendance", reportData.summary.totalAttendance],
      ["Total Check-ins", reportData.summary.totalCheckIns],
      ["Total Check-outs", reportData.summary.totalCheckOuts],
      ["Currently In Hostel", reportData.summary.currentlyInHostel],
      [],
      ["Room Availability"],
      ["Available Rooms", reportData.roomStatus.available],
      ["Full Rooms", reportData.roomStatus.full],
      ["Unavailable Rooms", reportData.roomStatus.unavailable],
      [],
      ["Needs Attention"],
      ["Students Without Room", reportData.needsAttention.studentsWithoutRoom],
      [],
      ["Attendance by Day"],
      ["Day", "Attendance Count"],
      ...reportData.dailyAttendance.map((day) => [day.label, day.value]),
      [],
      ["Detailed Attendance Records"],
      [
        "Date",
        "Student ID",
        "Name",
        "Type",
        "Category",
        "Notes",
        "Scanned By",
        "attendance_type",
      ],
      ...reportData.detailedAttendanceRecords.map((record) => [
        record.date,
        record.student_id,
        record.name,
        record.type,
        record.category,
        record.notes,
        record.scanned_by,
        record.attendance_type,
      ]),
      [],
      ["Currently In Hostel Students"],
      ["Student ID", "Name", "Last Check-in"],
      ...reportData.needsAttention.currentlyInStudents.map((student) => [
        student.student_id,
        student.name,
        student.scanned_at
          ? new Date(student.scanned_at).toLocaleString("en-BN")
          : "-",
      ]),
    ];

    const csvContent = rows.map((row) => row.join(",")).join("\n");

    if (typeof window !== "undefined") {
      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `warden-report-${user?.branch_name || "branch"}-${selectedMonth}.csv`;
      link.click();

      URL.revokeObjectURL(url);
    } else {
      Alert.alert("Export unavailable", "CSV export is only available on web.");
    }
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.subtitle}>
            Generate branch-specific attendance and room reports for{" "}
            {user?.branch_name || "your branch"}.
          </Text>
        </View>

        <TouchableOpacity style={styles.exportButton} onPress={exportCSV}>
          <Text style={styles.exportButtonText}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterCard}>
        <View style={styles.filterTextGroup}>
          <Text style={styles.filterTitle}>Report Period</Text>
          <Text style={styles.filterSubtitle}>
            Select a month and year to generate live branch data.
          </Text>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedMonthNumber}
              onValueChange={(value) => setSelectedMonthNumber(Number(value))}
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

          <View style={styles.yearPickerWrapper}>
            <Picker
              selectedValue={selectedYear}
              onValueChange={(value) => setSelectedYear(Number(value))}
            >
              {YEAR_OPTIONS.map((year) => (
                <Picker.Item key={year} label={String(year)} value={year} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.dataBadge}>
        <Text style={styles.dataBadgeText}>
          {isDemoDataMonth
            ? `${selectedMonthLabel} uses dummy demo data for testing and presentation purposes.`
            : `This report uses live database data for ${selectedMonthLabel}.`}
        </Text>
        <Text style={styles.dataBadgeSubText}>Today’s date: {todayLabel}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading report data...</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryGrid}>
            <SummaryCard
              label="Total Attendance"
              value={reportData.summary.totalAttendance}
            />
            <SummaryCard
              label="Check-ins"
              value={reportData.summary.totalCheckIns}
            />
            <SummaryCard
              label="Check-outs"
              value={reportData.summary.totalCheckOuts}
            />
            <SummaryCard
              label="Currently In Hostel"
              value={reportData.summary.currentlyInHostel}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Attendance by Day</Text>
            <Text style={styles.cardSubtitle}>
              Daily attendance count for {selectedMonthLabel}.
            </Text>

            {reportData.dailyAttendance.length === 0 ? (
              <Text style={styles.emptyText}>No attendance data available.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View style={styles.dailyChartRow}>
                  {reportData.dailyAttendance.map((item) => {
                    const heightPercent = Math.max(
                      (item.value / maxDailyValue) * 100,
                      item.value > 0 ? 8 : 0
                    );

                    const isToday =
                      selectedYear === today.getFullYear() &&
                      selectedMonthNumber === today.getMonth() + 1 &&
                      Number(item.label) === today.getDate();

                    return (
                      <View
                        key={item.label}
                        style={[
                          styles.dailyBarItem,
                          isToday && styles.dailyBarItemToday,
                        ]}
                      >
                        <Text style={styles.dailyValue}>{item.value}</Text>

                        <View style={styles.dailyBarTrack}>
                          <View
                            style={[
                              styles.dailyBarFill,
                              isToday && styles.dailyBarFillToday,
                              { height: `${heightPercent}%` as any },
                            ]}
                          />
                        </View>

                        <Text
                          style={[
                            styles.dailyLabel,
                            isToday && styles.dailyLabelToday,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>

          <View style={styles.twoColumn}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Room Availability</Text>
              <Text style={styles.cardSubtitle}>
                Room availability summary for {user?.branch_name || "this branch"}.
              </Text>

              <ProgressRow
                label="Available"
                value={reportData.roomStatus.available}
                percent={getRoomPercent(reportData.roomStatus.available)}
                type="available"
              />
              <ProgressRow
                label="Full"
                value={reportData.roomStatus.full}
                percent={getRoomPercent(reportData.roomStatus.full)}
                type="full"
              />
              <ProgressRow
                label="Unavailable"
                value={reportData.roomStatus.unavailable}
                percent={getRoomPercent(reportData.roomStatus.unavailable)}
                type="unavailable"
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Needs Attention</Text>
              <Text style={styles.cardSubtitle}>
                Operational items that may require follow-up.
              </Text>

              <View style={styles.attentionBox}>
                <Text style={styles.attentionValue}>
                  {reportData.needsAttention.studentsWithoutRoom}
                </Text>
                <Text style={styles.attentionLabel}>Students Without Room</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Currently In Hostel</Text>
            <Text style={styles.cardSubtitle}>
              Latest students whose most recent attendance status is check-in.
            </Text>

            {reportData.needsAttention.currentlyInStudents.length === 0 ? (
              <Text style={styles.emptyText}>
                No currently checked-in students found.
              </Text>
            ) : (
              reportData.needsAttention.currentlyInStudents.map((student) => (
                <View key={student.id} style={styles.studentRow}>
                  <View>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentMeta}>
                      ID: {student.student_id}
                    </Text>
                  </View>

                  <Text style={styles.studentTime}>
                    {student.scanned_at
                      ? new Date(student.scanned_at).toLocaleString("en-BN")
                      : "-"}
                  </Text>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ProgressRow({
  label,
  value,
  percent,
  type,
}: {
  label: string;
  value: number;
  percent: number;
  type: "available" | "full" | "unavailable";
}) {
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text
          style={[
            styles.progressValue,
            type === "available" && styles.availableText,
            type === "full" && styles.fullText,
            type === "unavailable" && styles.unavailableText,
          ]}
        >
          {value}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            type === "available" && styles.availableFill,
            type === "full" && styles.fullFill,
            type === "unavailable" && styles.unavailableFill,
            { width: `${percent}%` as any },
          ]}
        />
      </View>
    </View>
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
    maxWidth: 1300,
    width: "100%",
    alignSelf: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
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

  exportButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
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
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    flexWrap: "wrap",
  },

  filterTextGroup: {
    flex: 1,
    minWidth: 240,
  },

  filterTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.secondary,
  },

  filterSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
  },

  filterRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },

  pickerWrapper: {
    width: 190,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.white,
  },

  yearPickerWrapper: {
    width: 130,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.white,
  },

  dataBadge: {
    backgroundColor: "rgba(0,75,35,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,75,35,0.18)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },

  dataBadgeText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 13,
  },

  dataBadgeSubText: {
    marginTop: 4,
    color: colors.secondary,
    fontWeight: "700",
    fontSize: 12,
    opacity: 0.75,
  },

  loadingBox: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },

  loadingText: {
    marginTop: 10,
    color: colors.muted,
    fontWeight: "700",
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 18,
  },

  summaryCard: {
    flexGrow: 1,
    flexBasis: 220,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },

  summaryValue: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.primary,
  },

  summaryLabel: {
    marginTop: 5,
    fontSize: 13,
    color: colors.secondary,
    fontWeight: "700",
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },

  twoColumn: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    marginBottom: 0,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 5,
  },

  cardSubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 16,
    lineHeight: 19,
  },

  emptyText: {
    color: colors.muted,
    fontSize: 14,
    paddingVertical: 12,
  },

  dailyChartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingVertical: 10,
    paddingRight: 12,
  },

  dailyBarItem: {
    width: 34,
    alignItems: "center",
  },

  dailyBarItemToday: {
    backgroundColor: "rgba(249,224,118,0.35)",
    borderRadius: 10,
    paddingVertical: 6,
  },

  dailyValue: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: "800",
    marginBottom: 6,
  },

  dailyBarTrack: {
    height: 120,
    width: 16,
    backgroundColor: colors.background,
    borderRadius: 999,
    justifyContent: "flex-end",
    overflow: "hidden",
  },

  dailyBarFill: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 999,
  },

  dailyBarFillToday: {
    backgroundColor: colors.accent,
  },

  dailyLabel: {
    marginTop: 6,
    fontSize: 11,
    color: colors.muted,
    fontWeight: "700",
  },

  dailyLabelToday: {
    color: colors.primary,
    fontWeight: "900",
  },

  progressRow: {
    marginBottom: 16,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },

  progressLabel: {
    color: colors.secondary,
    fontWeight: "800",
    fontSize: 14,
  },

  progressValue: {
    fontWeight: "900",
    fontSize: 14,
  },

  progressTrack: {
    height: 12,
    backgroundColor: colors.background,
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  availableFill: {
    backgroundColor: colors.success,
  },

  fullFill: {
    backgroundColor: colors.primary,
  },

  unavailableFill: {
    backgroundColor: colors.error,
  },

  availableText: {
    color: colors.success,
  },

  fullText: {
    color: colors.primary,
  },

  unavailableText: {
    color: colors.error,
  },

  attentionBox: {
    backgroundColor: "rgba(197,160,89,0.14)",
    borderWidth: 1,
    borderColor: "rgba(197,160,89,0.28)",
    borderRadius: 16,
    padding: 18,
  },

  attentionValue: {
    fontSize: 34,
    fontWeight: "900",
    color: colors.secondary,
  },

  attentionLabel: {
    marginTop: 4,
    color: colors.secondary,
    fontWeight: "800",
    fontSize: 14,
  },

  studentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },

  studentName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.secondary,
  },

  studentMeta: {
    marginTop: 3,
    fontSize: 12,
    color: colors.muted,
  },

  studentTime: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "right",
    maxWidth: 180,
  },
});