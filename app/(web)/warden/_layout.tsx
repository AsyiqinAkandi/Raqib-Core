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

  const isMobile = width < 768;

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

  const renderSidebar = () => {
    return (
      <View style={styles.sidebar}>
        <View style={styles.logoRow}>
          <TouchableOpacity onPress={() => router.push("/(web)/warden" as any)}>
            <Text style={styles.logo}>Raqib Core</Text>
            <Text style={styles.branchText}>{user?.branch_name || "Warden"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.profileIconButton,
              pathname === "/(web)/warden/profile" && styles.activeProfileIconButton,
            ]}
            onPress={goToProfile}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={
                pathname === "/(web)/warden/profile"
                  ? colors.black
                  : colors.white
              }
            />
          </TouchableOpacity>
        </View>

        <View style={styles.menu}>
        {menuItems.map((item) => {
          const cleanPath = item.path.replace("/(web)", "");

          const isDashboard = cleanPath === "/warden";

          const isActive = isDashboard
            ? pathname === cleanPath || pathname === item.path
            : pathname === item.path ||
              pathname === cleanPath ||
              pathname.startsWith(`${cleanPath}/`);

          return (
            <TouchableOpacity
              key={item.path}
              style={[styles.menuItem, isActive && styles.activeMenuItem]}
              onPress={() => handleNavigate(item.path)}
            >
              <Ionicons
                name={item.icon as any}
                size={18}
                color={isActive ? colors.black : colors.white}
              />

              <Text style={[styles.menuText, isActive && styles.activeMenuText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={colors.white} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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

            <View style={styles.mobileTitleArea}>
              <View>
                <Text style={styles.mobileTitle}>Raqib Core</Text>
                <Text style={styles.mobileSubtitle}>
                  {user?.branch_name || "Warden"}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.profileIconButton,
                  pathname === "/(web)/warden/profile" &&
                    styles.activeProfileIconButton,
                ]}
                onPress={goToProfile}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={
                    pathname === "/(web)/warden/profile"
                      ? colors.black
                      : colors.white
                  }
                />
              </TouchableOpacity>
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
    width: 260,
    backgroundColor: colors.primary,
    padding: 20,
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  logo: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.white,
  },

  branchText: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
  },

  profileIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },

  activeProfileIconButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
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
    fontSize: 15,
  },

  content: {
    flex: 1,
    backgroundColor: colors.background,
  },

  mobileTopBar: {
    height: 72,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 14,
  },

  mobileMenuButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  mobileTitleArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  mobileTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.white,
  },

  mobileSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },

  mobileOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    flexDirection: "row",
  },

  mobileSidebar: {
    width: 270,
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
});