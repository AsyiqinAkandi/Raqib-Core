import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack, useSegments } from "expo-router";
import { colors } from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";

export default function WebLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  const section = segments[1]; // "admin" or "warden"

  if (section === "admin" && user.role !== "admin") {
    return <Redirect href="/(web)/warden" />;
  }

  if (section === "warden" && user.role !== "warden") {
    return <Redirect href="/(web)/admin" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}