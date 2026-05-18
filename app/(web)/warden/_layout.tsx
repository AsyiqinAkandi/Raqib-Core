import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Slot, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { API_URL } from "../../../config/api";
import { colors } from "../../../theme/colors";
import { useAuth } from "../../../context/AuthContext";

const menuItems = [
  { label: "Dashboard", path: "/(web)/warden", icon: "home-outline" },
  { label: "Rooms", path: "/(web)/warden/rooms", icon: "bed-outline" },
  { label: "Students", path: "/(web)/warden/students", icon: "people-outline" },
  { label: "Attendance", path: "/(web)/warden/attendance", icon: "scan-outline" },
  { label: "Reports", path: "/(web)/warden/reports", icon: "bar-chart-outline" },
];

export default function WardenLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { user, signOut } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isDesktop = width >= 1100;

  const handleNavigate = (path: string) => {
    router.push(path as any);
    setSidebarOpen(false);
  };

  const goToProfile = () => {
    router.push("/(web)/warden/profile" as any);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id,
          name: user?.name,
          role: user?.role,
          device: Platform.OS === "web" ? "web" : "mobile",
        }),
      });
    } catch (err) {
      console.log("Logout log failed:", err);
    }

    await signOut();
    router.replace("/(auth)/login");
  };

  const SidebarContent = () => {
    return (
      <>
        {/* Header */}
        <View style={styles.logoRow}>
          <TouchableOpacity
            onPress={() => router.push("/(web)/warden" as any)}
          >
            <Text style={styles.logo}>Raqib Core</Text>
            <Text style={styles.branchText}>
              {user?.branch_name || "Warden"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileIconButton}
            onPress={goToProfile}
          >
            <Ionicons name="person-outline" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item) => {
            const cleanPath = item.path.replace("/(web)", "");
            const isDashboard = cleanPath === "/warden";

            const isActive = isDashboard
              ? pathname === cleanPath || pathname === item.path
              : pathname === item.path ||
                pathname.startsWith(`${cleanPath}/`);

            return (
              <TouchableOpacity
                key={item.path}
                style={[
                  styles.menuItem,
                  isActive && styles.activeMenuItem,
                ]}
                onPress={() => handleNavigate(item.path)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={isActive ? colors.black : colors.white}
                />

                <Text
                  style={[
                    styles.menuText,
                    isActive && styles.activeMenuText,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Logout */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.white} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      {/* DESKTOP */}
      {isDesktop ? (
        <>
          <View style={styles.sidebar}>
            <SidebarContent />
          </View>

          <View style={styles.content}>
            <Slot />
          </View>
        </>
      ) : (
        <>
          {/* Floating menu button */}
          <TouchableOpacity
            style={styles.floatingMenuButton}
            onPress={() => setSidebarOpen(!sidebarOpen)}
          >
            <Ionicons
              name={sidebarOpen ? "close-outline" : "menu-outline"}
              size={28}
              color={colors.white}
            />
          </TouchableOpacity>

          {/* FULL SCREEN SIDEBAR */}
          {sidebarOpen && (
            <View style={styles.overlay}>
              <TouchableOpacity
                style={styles.backdrop}
                onPress={() => setSidebarOpen(false)}
              />

              <View style={styles.fullSidebar}>
                <View style={styles.sidebar}>
                  <SidebarContent />
                </View>
              </View>
            </View>
          )}

          <View style={styles.content}>
            <Slot />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.background,
  },

  sidebar: {
    width: 260,
    backgroundColor: colors.primary,
    padding: 20,
  },

  logoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  logo: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.white,
  },

  branchText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },

  profileIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  menu: {
    flex: 1,
    gap: 10,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
  },

  activeMenuItem: {
    backgroundColor: colors.accent,
  },

  menuText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },

  activeMenuText: {
    color: colors.black,
  },

  footer: {
    marginTop: 20,
  },

  logoutButton: {
    backgroundColor: colors.error,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  logoutText: {
    color: colors.white,
    fontWeight: "700",
  },

  content: {
    flex: 1,
    backgroundColor: colors.background,
  },

  floatingMenuButton: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    flexDirection: "row",
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  fullSidebar: {
    width: "100%",
    backgroundColor: colors.primary,
    padding: 20,
  },
});