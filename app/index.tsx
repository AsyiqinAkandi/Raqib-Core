import React from "react";
import { ActivityIndicator, View, Platform } from "react-native";
import { Redirect } from "expo-router";
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";

export default function Index() {
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

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (Platform.OS !== "web") {
    return <Redirect href="/dashboard" />;
  }

  if (user.role === "admin") {
    return <Redirect href="/(web)/admin" />;
  }

  return <Redirect href="/(web)/warden" />;
}