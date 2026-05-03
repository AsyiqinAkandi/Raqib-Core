import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { colors } from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";

export default function AuthLayout() {
  const { user, loading } = useAuth();

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

  if (user) {
    if (user.role === "admin") {
      return <Redirect href="/(web)/admin" />;
    }

    return <Redirect href="/(web)/warden" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}