import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { colors } from "../../theme/colors";
import { API_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

const DEMO_USERS = {
  admin: {
    email: "admin@staff.mora.edu.bn",
    password: "admin123",
  },
  osp: {
    email: "warden.osp@staff.mora.edu.bn",
    password: "warden123",
  },
  campus: {
    email: "warden.campus@staff.mora.edu.bn",
    password: "warden123",
  },
};

export default function LoginPage() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success" | "">("");

  const showNotice = (
    type: "error" | "success",
    text: string,
    title?: string
  ) => {
    setMessage(text);
    setMessageType(type);

    if (Platform.OS !== "web") {
      Alert.alert(title || (type === "error" ? "Error" : "Success"), text);
    }
  };

  const fillDemoUser = (type: "admin" | "osp" | "campus") => {
    setEmail(DEMO_USERS[type].email);
    setPassword(DEMO_USERS[type].password);
    setMessage("");
    setMessageType("");
  };

  const handleLogin = async () => {
    setMessage("");
    setMessageType("");

    if (!email.trim()) {
      showNotice("error", "Please enter your email.", "Missing Email");
      return;
    }

    if (!password.trim()) {
      showNotice("error", "Please enter your password.", "Missing Password");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          device: Platform.OS === "web" ? "web" : "mobile",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showNotice("error", data.error || "Login failed.");
        return;
      }

    await signIn(data.user);

    const loggedInUser = data.user;

    if (Platform.OS !== "web") {
      router.replace("/dashboard");
      return;
    }

    showNotice("success", "Login successful.");

    if (loggedInUser.role === "admin") {
      router.replace("/(web)/admin");
    } else {
      router.replace("/(web)/warden");
    }

    } catch (error) {
      console.error("Login error:", error);
      showNotice("error", "Something went wrong during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Raqib-Core</Text>
        <Text style={styles.subtitle}>
          Sign in to access the hostel management system.
        </Text>

        <View style={styles.demoSection}>
          <Text style={styles.demoLabel}>Demo Accounts</Text>

          <View style={styles.demoButtonRow}>
            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => fillDemoUser("admin")}
            >
              <Text style={styles.demoButtonText}>Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => fillDemoUser("osp")}
            >
              <Text style={styles.demoButtonText}>Warden OSP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => fillDemoUser("campus")}
            >
              <Text style={styles.demoButtonText}>Warden Campus</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          placeholderTextColor={colors.muted}
          secureTextEntry
        />

        {message ? (
          <View
            style={[
              styles.messageBox,
              messageType === "success"
                ? styles.successMessageBox
                : styles.errorMessageBox,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                messageType === "success"
                  ? styles.successMessageText
                  : styles.errorMessageText,
              ]}
            >
              {message}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? "Signing In..." : "Sign In"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 22,
    lineHeight: 20,
  },
  demoSection: {
    marginBottom: 18,
  },
  demoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.secondary,
    marginBottom: 10,
  },
  demoButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  demoButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#f7f8fa",
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.secondary,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.secondary,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.black,
    backgroundColor: colors.white,
    marginBottom: 10,
  },
  messageBox: {
    marginTop: 8,
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  successMessageBox: {
    backgroundColor: "rgba(40,167,69,0.10)",
    borderColor: "rgba(40,167,69,0.25)",
  },
  errorMessageBox: {
    backgroundColor: "rgba(220,53,69,0.10)",
    borderColor: "rgba(220,53,69,0.25)",
  },
  messageText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  successMessageText: {
    color: colors.success,
  },
  errorMessageText: {
    color: colors.error,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
});