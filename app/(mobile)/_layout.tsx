import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Slot, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";

const menuItems = [
  { label: "Home", path: "/dashboard", icon: "home-outline" },
  { label: "Scan", path: "/scan", icon: "scan-outline" },
  { label: "Attendance", path: "/attendance", icon: "create-outline" },
  { label: "Students", path: "/students", icon: "people-outline" },
];

export default function MobileLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavigate = (path: string) => {
    router.push(path as any);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setSidebarOpen(true)}
        >
          <Ionicons name="menu-outline" size={26} color={colors.white} />
        </TouchableOpacity>

        <View>
          <Text style={styles.appTitle}>Raqib Core</Text>
          <Text style={styles.branchText}>
            {user?.branch_name || "Mobile Warden"}
          </Text>
        </View>
      </View>

      {sidebarOpen && (
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            onPress={() => setSidebarOpen(false)}
          />

          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <View>
                <Text style={styles.logo}>Raqib Core</Text>
                <Text style={styles.sidebarSubtitle}>Mobile Tool</Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSidebarOpen(false)}
              >
                <Ionicons name="close-outline" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.menu}>
              {menuItems.map((item) => {
                const active = pathname === item.path;

                return (
                  <TouchableOpacity
                    key={item.path}
                    style={[
                      styles.menuItem,
                      active && styles.activeMenuItem,
                    ]}
                    onPress={() => handleNavigate(item.path)}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={active ? colors.black : colors.white}
                    />

                    <Text
                      style={[
                        styles.menuText,
                        active && styles.activeMenuText,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={colors.white} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  topBar: {
    height: 76,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 14,
  },

  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  appTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.white,
  },

  branchText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },

  content: {
    flex: 1,
    backgroundColor: colors.background,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    flexDirection: "row",
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  sidebar: {
    width: 275,
    backgroundColor: colors.primary,
    padding: 20,
  },

  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 26,
  },

  logo: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.white,
  },

  sidebarSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
  },

  closeButton: {
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
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
  },

  activeMenuItem: {
    backgroundColor: colors.accent,
  },

  menuText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },

  activeMenuText: {
    color: colors.black,
  },

  logoutButton: {
    backgroundColor: colors.error,
    borderRadius: 14,
    paddingVertical: 14,
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
});