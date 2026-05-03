import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { colors } from "../../theme/colors";

export default function WebEntryPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Raqib Core Web Portal</Text>
      <Text style={styles.subtitle}>Choose a panel to continue</Text>

      <Pressable
        style={styles.primaryButton}
        onPress={() => router.push("/(web)/warden")}
      >
        <Text style={styles.primaryButtonText}>Enter Warden Panel</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push("/(web)/admin")}
      >
        <Text style={styles.secondaryButtonText}>Enter Admin Panel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.secondary,
    marginBottom: 28,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    marginBottom: 16,
    minWidth: 240,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    minWidth: 240,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.white,
    fontWeight: "bold",
  },
});