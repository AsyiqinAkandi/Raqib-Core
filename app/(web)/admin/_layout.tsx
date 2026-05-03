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
  const isMobile = width < 768;

  const handleNavigate = (path: string) => {
    router.push(path as any);

    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

  const renderSidebar = () => (
    <View style={styles.sidebar}>
      <TouchableOpacity onPress={() => router.push("/(web)/admin" as any)}>
        <Text style={styles.logo}>Raqib Core</Text>
        <Text style={styles.roleText}>Admin Panel</Text>
      </TouchableOpacity>

      <View style={styles.navList}>
      {navItems.map((item) => {
        const cleanPath = item.path.replace("/(web)", "");

        const isDashboard = cleanPath === "/admin";

        const isActive = isDashboard
          ? pathname === cleanPath || pathname === item.path
          : pathname === item.path ||
            pathname === cleanPath ||
            pathname.startsWith(`${cleanPath}/`);

        return (
          <TouchableOpacity
            key={item.path}
            style={[styles.navItem, isActive && styles.activeNavItem]}
            onPress={() => handleNavigate(item.path)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={item.icon as any}
              size={18}
              color={isActive ? colors.black : colors.secondary}
            />

            <Text style={[styles.navText, isActive && styles.activeNavText]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={19} color={colors.white} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isMobile ? (
        <>
          <View style={styles.mobileTopBar}>
            <TouchableOpacity
              style={styles.mobileMenuButton}
              onPress={() => setSidebarOpen(true)}
            >
              <Ionicons name="menu-outline" size={26} color={colors.white} />
            </TouchableOpacity>

            <View>
              <Text style={styles.mobileTitle}>Raqib Core</Text>
              <Text style={styles.mobileSubtitle}>Admin Panel</Text>
            </View>
          </View>

          {sidebarOpen && (
            <View style={styles.mobileOverlay}>
              <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={() => setSidebarOpen(false)}
              />

              <View style={styles.mobileSidebar}>
                {renderSidebar()}
              </View>
            </View>
          )}

          <View style={styles.content}>
            <Slot />
          </View>
        </>
      ) : (
        <>
          {renderSidebar()}

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

  logoBlock: {
    marginBottom: 28,
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

  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.highlight,
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

  mobileTopBar: {
    height: 72,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 14,
  },

  mobileMenuButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  mobileTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.black,
  },

  mobileSubtitle: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: "700",
    marginTop: 2,
  },

  mobileOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    flexDirection: "row",
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  mobileSidebar: {
    width: 280,
  },
});