import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { colors } from "../../../theme/colors";
import { API_URL } from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";

type Stats = {
  totalStudents: number;
  totalRooms: number;
  todayScans: number;
};

type Overview = {
  inHostel: number;
  checkedInToday: number;
  checkedOutToday: number;
  activeRooms: number;
  inactiveRooms: number;
  fullRooms: number;
  studentsWithoutRoom: number;
};

type AttendanceRecord = {
  id: number;
  name: string;
  barcode: string;
  attendance_type: "check_in" | "check_out";
  scanned_at: string;
  room_number?: string;
};

export default function WardenDashboard() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1000;

  const { user } = useAuth();
  const branchId = user?.branch_id;
  const branchName = user?.branch_name || "your branch";

  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalRooms: 0,
    todayScans: 0,
  });

  const [overview, setOverview] = useState<Overview>({
    inHostel: 0,
    checkedInToday: 0,
    checkedOutToday: 0,
    activeRooms: 0,
    inactiveRooms: 0,
    fullRooms: 0,
    studentsWithoutRoom: 0,
  });

  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      if (!branchId) return;

      const [statsRes, overviewRes, attendanceRes] = await Promise.all([
        fetch(`${API_URL}/dashboard/stats?branch_id=${branchId}`),
        fetch(`${API_URL}/dashboard/overview?branch_id=${branchId}`),
        fetch(`${API_URL}/dashboard/recent-attendance?branch_id=${branchId}`),
      ]);

      const statsData = await statsRes.json();
      const overviewData = await overviewRes.json();
      const attendanceData = await attendanceRes.json();

      if (statsRes.ok) {
        setStats(statsData);
      }

      if (overviewRes.ok) {
        setOverview(overviewData);
      }

      if (attendanceRes.ok) {
        setRecentAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchId) {
      fetchDashboardData();
    }
  }, [branchId]);

  const statCards = [
    {
      label: "Total Students",
      value: stats.totalStudents,
      accentStyle: styles.primaryAccent,
    },
    {
      label: "Total Rooms",
      value: stats.totalRooms,
      accentStyle: styles.secondaryAccent,
    },
    {
      label: "Today's Scans",
      value: stats.todayScans,
      accentStyle: styles.accentAccent,
    },
    {
      label: "Currently In Hostel",
      value: overview.inHostel,
      accentStyle: styles.successAccent,
    },
  ];

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Warden Dashboard</Text>
        <Text style={styles.subtitle}>
          Monitor hostel activity, attendance records, room status, and students needing
          attention for {branchName}.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          <View
            style={[
              styles.statsRow,
              { flexDirection: isWide ? "row" : "column" },
            ]}
          >
            {statCards.map((card) => (
              <View key={card.label} style={[styles.statCard, card.accentStyle]}>
                <Text style={styles.statLabel}>{card.label}</Text>
                <Text style={styles.statValue}>{card.value}</Text>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.middleSection,
              { flexDirection: isWide ? "row" : "column" },
            ]}
          >
            <View style={[styles.card, styles.summaryCard]}>
              <Text style={styles.cardTitle}>Attendance Summary</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Checked In Today</Text>
                <Text style={styles.infoValue}>{overview.checkedInToday}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Checked Out Today</Text>
                <Text style={styles.infoValue}>{overview.checkedOutToday}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Current In Hostel</Text>
                <Text style={styles.infoValue}>{overview.inHostel}</Text>
              </View>
            </View>

            <View style={[styles.card, styles.summaryCard]}>
              <Text style={styles.cardTitle}>Room Overview</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Active Rooms</Text>
                <Text style={styles.infoValue}>{overview.activeRooms}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Full Rooms</Text>
                <Text style={styles.infoValue}>{overview.fullRooms}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Inactive Rooms</Text>
                <Text style={styles.infoValue}>{overview.inactiveRooms}</Text>
              </View>
            </View>

            <View style={[styles.card, styles.summaryCard]}>
              <Text style={styles.cardTitle}>Needs Attention</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Students Without Room</Text>
                <Text style={styles.infoValue}>
                  {overview.studentsWithoutRoom}
                </Text>
              </View>

              <View style={styles.noticeBox}>
                <Text style={styles.noticeTitle}>Reminder</Text>
                <Text style={styles.noticeText}>
                  Students who remain checked in without a recorded check-out
                  will continue to appear as currently in hostel.
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, styles.recentCard]}>
            <View style={styles.recentHeader}>
              <Text style={styles.cardTitle}>Recent Attendance</Text>
              <Text style={styles.recentSubtext}>
                Latest attendance activity recorded in the system
              </Text>
            </View>

            {recentAttendance.length === 0 ? (
              <Text style={styles.emptyText}>No attendance records yet.</Text>
            ) : (
              <View style={styles.recordsWrap}>
                {recentAttendance.map((item) => (
                  <View key={item.id} style={styles.recordRow}>
                    <View style={styles.recordLeft}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {item.name?.charAt(0)?.toUpperCase() || "S"}
                        </Text>
                      </View>

                      <View style={styles.recordInfo}>
                        <Text style={styles.recordName}>{item.name}</Text>
                        <Text style={styles.recordMeta}>ID: {item.barcode}</Text>
                        {item.room_number ? (
                          <Text style={styles.recordMeta}>
                            Room: {item.room_number}
                          </Text>
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
                        {new Date(item.scanned_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
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
  loaderWrap: {
    minHeight: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
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
  secondaryAccent: {
    borderLeftWidth: 6,
    borderLeftColor: colors.secondary,
  },
  accentAccent: {
    borderLeftWidth: 6,
    borderLeftColor: colors.accent,
  },
  successAccent: {
    borderLeftWidth: 6,
    borderLeftColor: colors.success,
  },
  statLabel: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.primary,
  },
  middleSection: {
    gap: 20,
    marginBottom: 20,
  },
  card: {
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
  summaryCard: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.secondary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  noticeBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#f7f8fa",
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 6,
  },
  noticeText: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
  },
  recentCard: {
    marginBottom: 20,
  },
  recentHeader: {
    marginBottom: 12,
  },
  recentSubtext: {
    fontSize: 13,
    color: colors.muted,
  },
  recordsWrap: {
    marginTop: 4,
  },
  recordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.white,
  },
  recordLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  recordInfo: {
    flexShrink: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  recordName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 4,
  },
  recordMeta: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 2,
  },
  recordRight: {
    alignItems: "flex-end",
    marginLeft: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  checkInBadge: {
    backgroundColor: "rgba(40,167,69,0.12)",
  },
  checkInBadgeText: {
    color: colors.success,
  },
  checkOutBadge: {
    backgroundColor: "rgba(197,160,89,0.16)",
  },
  checkOutBadgeText: {
    color: colors.accent,
  },
  timeText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "right",
    maxWidth: 180,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 24,
  },
});