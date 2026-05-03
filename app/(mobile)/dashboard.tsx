import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";

export default function DashboardPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  if (user?.role === "admin") {
    return (
      <View style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.title}>Mobile View Unavailable</Text>
          <Text style={styles.subtitle}>
            The mobile view is intended for wardens only. Please use the web
            dashboard for admin access.
          </Text>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.white} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.appName}>Raqib Core</Text>
        <Text style={styles.subtitle}>Mobile Warden Tool</Text>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.sectionLabel}>Logged in as</Text>
        <Text style={styles.name}>{user?.name || "Warden"}</Text>
        <Text style={styles.meta}>{user?.email || "-"}</Text>

        <View style={styles.branchBadge}>
          <Ionicons name="business-outline" size={16} color={colors.primary} />
          <Text style={styles.branchText}>
            {user?.branch_name || "No branch assigned"}
          </Text>
        </View>
      </View>

      <View style={styles.actionCard}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/(mobile)/scan")}
        >
          <Ionicons name="scan-outline" size={22} color={colors.white} />
          <Text style={styles.primaryButtonText}>Scan Barcode</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/(mobile)/attendance")}
        >
          <Ionicons name="create-outline" size={22} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>Manual Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/(mobile)/students")}
        >
          <Ionicons name="people-outline" size={22} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>Student Quick Check</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.white} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 22,
    justifyContent: "center",
  },
  header: {
    marginBottom: 22,
  },
  appName: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.secondary,
    lineHeight: 22,
    marginTop: 4,
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: 6,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.secondary,
  },
  meta: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  branchBadge: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(0,75,35,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,75,35,0.18)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  branchText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 13,
  },
  actionCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 13,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 18,
    backgroundColor: colors.error,
    borderRadius: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
  },
});