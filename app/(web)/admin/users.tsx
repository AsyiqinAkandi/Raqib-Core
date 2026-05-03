import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Platform,
    Alert,
    Image,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../../../theme/colors";
import { API_URL } from "../../../config/api";
import { CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_UPLOAD_URL } from "../../../config/cloudinary";
import { useAuth } from "@/context/AuthContext";

type Branch = {
    id: number;
    name: string;
};

type UserItem = {
    id: number;
    name: string;
    email: string;
    role: "admin" | "warden";
    branch_id: number | null;
    branch_name?: string | null;
    profile_image?: string | null;
    created_at?: string;
};

type UserForm = {
    name: string;
    username: string;
    password: string;
    role: "admin" | "warden";
    branch_id: string;
    profile_image: string;
};

export default function AdminUsersPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [search, setSearch] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);

    const [form, setForm] = useState<UserForm>({
        name: "",
        username: "",
        password: "",
        role: "warden",
        branch_id: "",
        profile_image: "",
    });

    const STAFF_EMAIL_DOMAIN = "@staff.mora.edu.bn";

    const generateTemporaryPassword = () => {
        const chars =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
        let password = "";

        for (let i = 0; i < 10; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return password;
    };

    const [formMessage, setFormMessage] = useState("");
    const [formMessageType, setFormMessageType] = useState<
        "success" | "error" | ""
    >("");

    const showFormNotice = (
        type: "success" | "error",
        message: string,
        title?: string
    ) => {
        setFormMessage(message);
        setFormMessageType(type);

        if (Platform.OS !== "web") {
            Alert.alert(title || (type === "error" ? "Error" : "Success"), message);
        }
    };

    const resetForm = () => {
        setForm({
            name: "",
            username: "",
            password: "",
            role: "warden",
            branch_id: "",
            profile_image: "",
        });
        setEditingUserId(null);
        setFormMessage("");
        setFormMessageType("");
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/users`);
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await fetch(`${API_URL}/branches`);
            const data = await res.json();
            setBranches(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch branches:", error);
        }
    };

    useEffect(() => {
        Promise.all([fetchUsers(), fetchBranches()]);
    }, []);

    const filteredUsers = useMemo(() => {
        const q = search.toLowerCase().trim();

        return users.filter((user) => {
            return (
                user.name.toLowerCase().includes(q) ||
                user.email.toLowerCase().includes(q) ||
                user.role.toLowerCase().includes(q) ||
                (user.branch_name || "").toLowerCase().includes(q)
            );
        });
    }, [users, search]);

    const handlePickUserImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"] as any,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (result.canceled || !result.assets?.length) return;

            const pickedImage = result.assets[0];

            const formData = new FormData();

            if (Platform.OS === "web") {
                const response = await fetch(pickedImage.uri);
                const blob = await response.blob();

                formData.append("file", blob, "user-profile.jpg");
            } else {
                formData.append("file", {
                    uri: pickedImage.uri,
                    name: "user-profile.jpg",
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
                console.error("Cloudinary upload error:", uploadData);
                showFormNotice(
                    "error",
                    uploadData?.error?.message || "Failed to upload image"
                );
                return;
            }

            setForm((prev) => ({
                ...prev,
                profile_image: uploadData.secure_url,
            }));
        } catch (error) {
            console.error("User image upload error:", error);
            showFormNotice("error", "Failed to upload user image");
        }
    };

    const handleEditUser = (user: UserItem) => {
        setEditingUserId(user.id);
        setForm({
            name: user.name,
            username: user.email,
            password: "",
            role: user.role,
            branch_id: user.branch_id ? String(user.branch_id) : "",
            profile_image: user.profile_image || "",
        });
        setFormMessage("");
        setFormMessageType("");
        setModalVisible(true);
    };

    const handleSaveUser = async () => {
        setFormMessage("");
        setFormMessageType("");

        if (!form.name.trim()) {
            showFormNotice("error", "Please fill in the user's name.");
            return;
        }

        if (!form.username.trim()) {
            showFormNotice("error", "Please fill in the username.");
            return;
        }

        if (!editingUserId && !form.password.trim()) {
            showFormNotice("error", "Temporary password is required.");
            return;
        }

        if (form.role === "warden" && !form.branch_id) {
            showFormNotice("error", "Please select a branch for the warden.");
            return;
        }

        const finalEmail = `${form.username.trim().toLowerCase()}${STAFF_EMAIL_DOMAIN}`;

        const payload = {
            name: form.name.trim(),
            email: finalEmail,
            password: form.password,
            role: form.role,
            branch_id: form.role === "admin" ? null : Number(form.branch_id),
            profile_image: form.profile_image || null,
            created_by: user?.id,
            updated_by: user?.id,
        };

        try {
            const res = await fetch(
                editingUserId ? `${API_URL}/users/${editingUserId}` : `${API_URL}/users`,
                {
                    method: editingUserId ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                showFormNotice("error", data.error || "Failed to save user");
                return;
            }

            await fetchUsers();
            resetForm();
            setModalVisible(false);
        } catch (error) {
            console.error("Failed to save user:", error);
            showFormNotice("error", "Something went wrong while saving the user.");
        }
    };

    return (
        <ScrollView
            style={styles.page}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator
        >
            <View style={styles.header}>
                <Text style={styles.title}>Users</Text>
                <Text style={styles.subtitle}>
                    Manage system users, roles, and branch assignments.
                </Text>
            </View>

            <View style={styles.toolbarCard}>
                <View style={styles.toolbarTopRow}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search users..."
                        placeholderTextColor={colors.muted}
                        value={search}
                        onChangeText={setSearch}
                    />

                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                            resetForm();
                            setModalVisible(true);
                        }}
                    >
                        <Text style={styles.addButtonText}>+ Add User</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.listCard}>
                {filteredUsers.length === 0 ? (
                    <Text style={styles.emptyText}>No users found.</Text>
                ) : (
                    filteredUsers.map((user) => (
                        <View key={user.id} style={styles.userRow}>
                            <View style={styles.userInfoRow}>
                                {user.profile_image ? (
                                    <Image source={{ uri: user.profile_image }} style={styles.userAvatar} />
                                ) : (
                                    <View style={styles.userAvatarFallback}>
                                        <Text style={styles.userAvatarFallbackText}>
                                            {user.name?.charAt(0)?.toUpperCase() || "U"}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.userInfo}>
                                    <Text style={styles.userName}>{user.name}</Text>
                                    <Text style={styles.userMeta}>{user.email}</Text>
                                    <Text style={styles.userMeta}>
                                        {user.role === "admin" ? "Admin" : "Warden"}
                                        {user.branch_name ? ` • ${user.branch_name}` : ""}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => handleEditUser(user)}
                            >
                                <Text style={styles.editButtonText}>Edit</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </View>

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    resetForm();
                    setModalVisible(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <ScrollView
                        contentContainerStyle={styles.modalOverlayContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>
                                {editingUserId ? "Edit User" : "Add User"}
                            </Text>
                            <Text style={styles.modalSubtitle}>
                                Create and manage admin or warden accounts.
                            </Text>

                            <Text style={styles.label}>Profile Image</Text>
                            <View style={styles.imageSection}>
                                {form.profile_image ? (
                                    <Image
                                        source={{ uri: form.profile_image }}
                                        style={styles.userPreviewImage}
                                    />
                                ) : (
                                    <View style={styles.userPreviewPlaceholder}>
                                        <Text style={styles.userPreviewPlaceholderText}>
                                            {form.name?.charAt(0)?.toUpperCase() || "U"}
                                        </Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={styles.imageButton}
                                    onPress={handlePickUserImage}
                                >
                                    <Text style={styles.imageButtonText}>
                                        {form.profile_image ? "Change Image" : "Upload Image"}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={form.name}
                                onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
                                placeholder="Enter full name"
                                placeholderTextColor={colors.muted}
                            />

                            <Text style={styles.label}>Username *</Text>
                            <View style={styles.emailRow}>
                                <TextInput
                                    style={[styles.input, styles.emailInput]}
                                    value={form.username}
                                    onChangeText={(value) =>
                                        setForm((prev) => ({ ...prev, username: value.replace(/\s/g, "") }))
                                    }
                                    placeholder="Enter username"
                                    placeholderTextColor={colors.muted}
                                    autoCapitalize="none"
                                />
                                <View style={styles.emailSuffixBox}>
                                    <Text style={styles.emailSuffixText}>{STAFF_EMAIL_DOMAIN}</Text>
                                </View>
                            </View>
                            <Text style={styles.helperText}>
                                Final email: {(form.username || "username") + STAFF_EMAIL_DOMAIN}
                            </Text>

                            <Text style={styles.label}>
                                {editingUserId ? "Password (leave blank to keep current)" : "Temporary Password *"}
                            </Text>

                            <View style={styles.passwordRow}>
                                <TextInput
                                    style={[styles.input, styles.passwordInput]}
                                    value={form.password}
                                    onChangeText={(value) =>
                                        setForm((prev) => ({ ...prev, password: value }))
                                    }
                                    placeholder="Temporary password"
                                    placeholderTextColor={colors.muted}
                                />

                                <TouchableOpacity
                                    style={styles.generateButton}
                                    onPress={() =>
                                        setForm((prev) => ({
                                            ...prev,
                                            password: generateTemporaryPassword(),
                                        }))
                                    }
                                >
                                    <Text style={styles.generateButtonText}>Generate</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.helperText}>
                                Share this temporary password with the user. They should change it after first login.
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={form.password}
                                onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
                                placeholder="Enter password"
                                placeholderTextColor={colors.muted}
                                secureTextEntry
                            />

                            <Text style={styles.label}>Role *</Text>
                            <View style={styles.selectWrapper}>
                                <Picker
                                    selectedValue={form.role}
                                    onValueChange={(value) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            role: value,
                                            branch_id: value === "admin" ? "" : prev.branch_id,
                                        }))
                                    }
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Admin" value="admin" />
                                    <Picker.Item label="Warden" value="warden" />
                                </Picker>
                            </View>

                            {form.role === "warden" ? (
                                <>
                                    <Text style={styles.label}>Branch *</Text>
                                    <View style={styles.selectWrapper}>
                                        <Picker
                                            selectedValue={form.branch_id}
                                            onValueChange={(value) =>
                                                setForm((prev) => ({ ...prev, branch_id: String(value) }))
                                            }
                                            style={styles.picker}
                                        >
                                            <Picker.Item label="Select branch" value="" />
                                            {branches.map((branch) => (
                                                <Picker.Item
                                                    key={branch.id}
                                                    label={branch.name}
                                                    value={String(branch.id)}
                                                />
                                            ))}
                                        </Picker>
                                    </View>
                                </>
                            ) : null}

                            {formMessage ? (
                                <View
                                    style={[
                                        styles.formMessageBox,
                                        formMessageType === "success"
                                            ? styles.successMessageBox
                                            : styles.errorMessageBox,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.formMessageText,
                                            formMessageType === "success"
                                                ? styles.successMessageText
                                                : styles.errorMessageText,
                                        ]}
                                    >
                                        {formMessage}
                                    </Text>
                                </View>
                            ) : null}

                            <View style={styles.modalButtonRow}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => {
                                        resetForm();
                                        setModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalButton, styles.saveButton]}
                                    onPress={handleSaveUser}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {editingUserId ? "Update User" : "Save User"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    imageSection: {
        alignItems: "center",
        marginBottom: 16,
    },
    userPreviewImage: {
        width: 90,
        height: 90,
        borderRadius: 45,
        marginBottom: 12,
    },
    userPreviewPlaceholder: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    userPreviewPlaceholderText: {
        color: colors.white,
        fontSize: 28,
        fontWeight: "700",
    },
    imageButton: {
        backgroundColor: colors.secondary,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 18,
        alignItems: "center",
    },
    imageButtonText: {
        color: colors.white,
        fontWeight: "700",
        fontSize: 14,
    },
    userInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: 12,
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    userAvatarFallback: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    userAvatarFallbackText: {
        color: colors.white,
        fontWeight: "700",
        fontSize: 16,
    },
    page: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 24,
        paddingBottom: 40,
        maxWidth: 1400,
        width: "100%",
        alignSelf: "center",
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 30,
        fontWeight: "700",
        color: colors.secondary,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 15,
        color: colors.muted,
        maxWidth: 760,
        lineHeight: 22,
    },
    toolbarCard: {
        backgroundColor: colors.white,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
    },
    toolbarTopRow: {
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
    },
    searchInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.black,
        backgroundColor: colors.white,
    },
    addButton: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    addButtonText: {
        color: colors.white,
        fontWeight: "700",
    },
    listCard: {
        backgroundColor: colors.white,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyText: {
        color: colors.muted,
        textAlign: "center",
        paddingVertical: 20,
    },
    userRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    userInfo: {
        flex: 1,
        marginRight: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.primary,
        marginBottom: 4,
    },
    userMeta: {
        fontSize: 13,
        color: colors.muted,
        marginBottom: 2,
    },
    editButton: {
        backgroundColor: colors.secondary,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
    },
    editButtonText: {
        color: colors.white,
        fontWeight: "700",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
    },
    modalOverlayContent: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 24,
    },
    modalCard: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 22,
        borderWidth: 1,
        borderColor: colors.border,
        width: "100%",
        maxWidth: 620,
        alignSelf: "center",
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.primary,
        marginBottom: 6,
    },
    modalSubtitle: {
        fontSize: 14,
        color: colors.muted,
        marginBottom: 16,
        lineHeight: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.secondary,
        marginBottom: 6,
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
        marginBottom: 12,
    },
    selectWrapper: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: colors.white,
        marginBottom: 12,
    },
    picker: {
        width: "100%",
    },
    formMessageBox: {
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
    formMessageText: {
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
    modalButtonRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
        marginTop: 8,
    },
    modalButton: {
        paddingVertical: 13,
        paddingHorizontal: 18,
        borderRadius: 12,
    },
    cancelButton: {
        backgroundColor: "#f1f3f5",
    },
    cancelButtonText: {
        color: colors.secondary,
        fontWeight: "700",
    },
    saveButton: {
        backgroundColor: colors.primary,
    },
    saveButtonText: {
        color: colors.white,
        fontWeight: "700",
    },
    emailRow: {
        flexDirection: "row",
        alignItems: "stretch",
        marginBottom: 6,
    },
    emailInput: {
        flex: 1,
        marginBottom: 0,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    emailSuffixBox: {
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 0,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        paddingHorizontal: 14,
        justifyContent: "center",
        backgroundColor: "#f7f8fa",
    },
    emailSuffixText: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.secondary,
    },
    helperText: {
        fontSize: 12,
        color: colors.muted,
        marginBottom: 12,
        lineHeight: 18,
    },
    passwordRow: {
        flexDirection: "row",
        alignItems: "stretch",
        gap: 10,
        marginBottom: 6,
    },
    passwordInput: {
        flex: 1,
        marginBottom: 0,
    },
    generateButton: {
        backgroundColor: colors.secondary,
        borderRadius: 12,
        paddingHorizontal: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    generateButtonText: {
        color: colors.white,
        fontWeight: "700",
        fontSize: 13,
    },
});