import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../../../theme/colors";
import { API_URL } from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import { CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_UPLOAD_URL } from "../../../config/cloudinary";

export default function WardenProfilePage() {
  const { user, signIn } = useAuth();

  const [profileImage, setProfileImage] = useState(user?.profile_image || "");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handlePickImage = async () => {
    try {
      if (!user) {
        Alert.alert("Error", "User session not found.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"] as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      setUploadingImage(true);

      const pickedImage = result.assets[0];
      const formData = new FormData();

      if (Platform.OS === "web") {
        const response = await fetch(pickedImage.uri);
        const blob = await response.blob();
        formData.append("file", blob, "warden-profile.jpg");
      } else {
        formData.append("file", {
          uri: pickedImage.uri,
          name: "warden-profile.jpg",
          type: pickedImage.mimeType || "image/jpeg",
        } as any);
      }

      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const uploadRes = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData?.error?.message || "Failed to upload image");
      }

      const uploadedUrl = uploadData.secure_url;

      const updateRes = await fetch(`${API_URL}/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          branch_id: user.branch_id,
          profile_image: uploadedUrl,
          updated_by: user.id,
        }),
      });

      const updateData = await updateRes.json().catch(() => null);

      if (!updateRes.ok) {
        throw new Error(updateData?.error || "Failed to update profile image");
      }

      const updatedUser = {
        ...user,
        profile_image: uploadedUrl,
      };

      setProfileImage(uploadedUrl);
      await signIn(updatedUser);

      Alert.alert("Success", "Profile picture updated successfully.");
    } catch (error: any) {
      console.error("handlePickImage error:", error);
      Alert.alert("Error", error?.message || "Failed to update profile picture.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.id) {
      Alert.alert("Error", "User session not found.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Validation", "Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Validation", "New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Validation", "New passwords do not match.");
      return;
    }

    try {
      setSavingPassword(true);

      const response = await fetch(`${API_URL}/users/${user.id}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update password");
      }

      Alert.alert("Success", "Password updated successfully.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          Manage your warden profile, account details, and password.
        </Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileTop}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitial}>
                {user?.name?.charAt(0)?.toUpperCase() || "W"}
              </Text>
            </View>
          )}

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || "Warden"}</Text>
            <Text style={styles.profileEmail}>{user?.email || "-"}</Text>

            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
                <Text style={styles.roleBadgeText}>Warden</Text>
              </View>

              <View style={styles.branchBadge}>
                <Ionicons name="business-outline" size={15} color={colors.primary} />
                <Text style={styles.branchBadgeText}>
                  {user?.branch_name || "No branch"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.imageButton, uploadingImage && styles.disabledButton]}
          onPress={handlePickImage}
          disabled={uploadingImage}
        >
          {uploadingImage ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={18} color={colors.white} />
              <Text style={styles.imageButtonText}>
                {profileImage ? "Change Profile Picture" : "Upload Profile Picture"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          <InfoRow label="Name" value={user?.name || "-"} />
          <InfoRow label="Email" value={user?.email || "-"} />
          <InfoRow label="Role" value="Warden" />
          <InfoRow label="Branch" value={user?.branch_name || "-"} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <Text style={styles.helperText}>
            Use this to replace the temporary password given by the admin.
          </Text>

          <Text style={styles.inputLabel}>Current Password</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            placeholderTextColor={colors.muted}
            secureTextEntry
          />

          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            placeholderTextColor={colors.muted}
            secureTextEntry
          />

          <Text style={styles.inputLabel}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor={colors.muted}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.saveButton, savingPassword && styles.disabledButton]}
            onPress={handleChangePassword}
            disabled={savingPassword}
          >
            <Text style={styles.saveButtonText}>
              {savingPassword ? "Updating..." : "Update Password"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.secondary,
    opacity: 0.75,
    lineHeight: 22,
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginBottom: 18,
  },
  profileImage: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.background,
  },
  profilePlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: {
    fontSize: 38,
    fontWeight: "900",
    color: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.secondary,
  },
  profileEmail: {
    marginTop: 4,
    fontSize: 14,
    color: colors.muted,
  },
  badgeRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,75,35,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,75,35,0.18)",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  roleBadgeText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  branchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(197,160,89,0.14)",
    borderWidth: 1,
    borderColor: "rgba(197,160,89,0.28)",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  branchBadgeText: {
    color: colors.secondary,
    fontWeight: "800",
    fontSize: 12,
  },
  imageButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  imageButtonText: {
    color: colors.white,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
  },
  card: {
    flexGrow: 1,
    flexBasis: 420,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 14,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 4,
    fontWeight: "700",
  },
  value: {
    fontSize: 15,
    color: colors.secondary,
    fontWeight: "800",
  },
  helperText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: "800",
    marginBottom: 7,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.secondary,
    backgroundColor: colors.white,
  },
  saveButton: {
    marginTop: 18,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.7,
  },
});