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

import { colors } from "../../../theme/colors";
import { API_URL } from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";

const navItems = [
  { label: "Dashboard", path: "/(web)/admin", icon: "home-outline" },
  { label: "Users", path: "/(web)/admin/users", icon: "people-outline" },
  { label: "Students", path: "/(web)/admin/students", icon: "school-outline" },
  { label: "Rooms", path: "/(web)/admin/rooms", icon: "bed-outline" },
  { label: "Reports", path: "/(web)/admin/reports", icon: "document-text-outline" },
  { label: "Activity Logs", path: "/(web)/admin/logs", icon: "time-outline" },
];

export default function AdminLayout() {
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

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <TouchableOpacity
        onPress={() => router.push("/(web)/admin" as any)}
        style={{ marginBottom: 28 }}
      >
        <Text style={styles.logo}>Raqib Core</Text>
        <Text style={styles.roleText}>Admin Panel</Text>
      </TouchableOpacity>

      {/* Nav */}
      <View style={styles.navList}>
        {navItems.map((item) => {
        const cleanPath = item.path.replace("/(web)", "");

        const isDashboard = cleanPath === "/admin";

        const isActive = isDashboard
          ? pathname === "/admin"
          : pathname === cleanPath || pathname.startsWith(`${cleanPath}/`);

          return (
            <TouchableOpacity
              key={item.path}
              style={[
                styles.navItem,
                isActive && styles.activeNavItem,
              ]}
              onPress={() => handleNavigate(item.path)}
            >
              <Ionicons
                name={item.icon as any}
                size={18}
                color={isActive ? colors.black : colors.secondary}
              />

              <Text
                style={[
                  styles.navText,
                  isActive && styles.activeNavText,
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
          <Ionicons name="log-out-outline" size={19} color={colors.white} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </>
  );

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
          {/* MENU BUTTON */}
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

          {/* OVERLAY SIDEBAR */}
          {sidebarOpen && (
            <View style={styles.fullOverlay}>
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
    width: 270,
    backgroundColor: colors.accent,
    padding: 20,
  },

  logo: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.black,
  },

  roleText: {
    marginTop: 4,
    fontSize: 13,
    color: colors.secondary,
    fontWeight: "700",
  },

  navList: {
    flex: 1,
    gap: 10,
  },

  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
  },

  activeNavItem: {
    backgroundColor: colors.primary,
  },

  navText: {
    color: colors.secondary,
    fontSize: 15,
    fontWeight: "700",
  },

  activeNavText: {
    color: colors.white,
    fontWeight: "800",
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
    fontWeight: "800",
    fontSize: 15,
  },

  content: {
    flex: 1,
    backgroundColor: colors.background,
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    flexDirection: "row",
  },

  fullSidebar: {
    width: "100%",
    backgroundColor: colors.accent,
    padding: 20,
  },

  floatingMenuButton: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
});