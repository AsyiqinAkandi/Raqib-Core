import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";
import { API_URL } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

type Student = {
    id: number;
    student_id: string;
    name: string;
    profile_image?: string | null;
    branch_id: number | null;
    branch_name?: string | null;
    unit?: string | null;
    lorong?: string | null;
    room_number?: string | null;
    year_level?: string | null;
    status?: string | null;
};

export default function MobileStudentsPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [students, setStudents] = useState<Student[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    const branchId = user?.branch_id;

    const fetchStudents = async () => {
        if (!branchId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(`${API_URL}/students?branch_id=${branchId}`);
            const data = await response.json().catch(() => []);

            if (!response.ok) {
                throw new Error(data?.error || "Failed to fetch students");
            }

            setStudents(Array.isArray(data) ? data : []);
        } catch (error: any) {
            Alert.alert("Error", error?.message || "Failed to load students.");
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, [branchId]);

    const filteredStudents = useMemo(() => {
        const keyword = search.toLowerCase().trim();

        return students.filter((student) => {
            return (
                student.name?.toLowerCase().includes(keyword) ||
                student.student_id?.toLowerCase().includes(keyword) ||
                student.room_number?.toLowerCase().includes(keyword)
            );
        });
    }, [students, search]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading students...</Text>
            </View>
        );
    }

    const myBranchStudents = filteredStudents.filter(
        (student) => Number(student.branch_id) === Number(user?.branch_id)
    );

    const otherBranchStudents = filteredStudents.filter(
        (student) => Number(student.branch_id) !== Number(user?.branch_id)
    );

    return (
        <ScrollView
            style={styles.page}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator
        >
            <View style={styles.header}>
                <Text style={styles.title}>Student Quick Check</Text>
                <Text style={styles.subtitle}>
                    View student details across branches. Only your branch is accessible.
                </Text>
            </View>

            <View style={styles.searchCard}>
                <Ionicons name="search-outline" size={20} color={colors.muted} />
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search name, student ID, or room"
                    placeholderTextColor={colors.muted}
                    style={styles.searchInput}
                />
            </View>

            <View style={styles.countRow}>
                <Text style={styles.countText}>
                    {filteredStudents.length} student
                    {filteredStudents.length === 1 ? "" : "s"} shown
                </Text>

                <TouchableOpacity onPress={fetchStudents}>
                    <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
            </View>

            {/* ================= MY BRANCH ================= */}
            <Text style={styles.sectionTitle}>My Branch</Text>

            {myBranchStudents.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No students in your branch.</Text>
                </View>
            ) : (
                myBranchStudents.map((student) => (
                    <TouchableOpacity
                        key={student.id}
                        style={styles.studentCard}
                        activeOpacity={0.85}
                        onPress={() =>
                            router.push({
                                pathname: "/student-quick/[id]",
                                params: { id: String(student.id) },
                            })
                        }
                    >
                        {student.profile_image ? (
                            <Image
                                source={{ uri: student.profile_image }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons
                                    name="person-outline"
                                    size={24}
                                    color={colors.muted}
                                />
                            </View>
                        )}

                        <View style={styles.studentInfo}>
                            <Text style={styles.studentName}>{student.name}</Text>
                            <Text style={styles.studentMeta}>{student.student_id}</Text>

                            <Text style={styles.roomText}>
                                {student.room_number
                                    ? `Room ${student.room_number} • Unit ${student.unit || "-"
                                    } • Lorong ${student.lorong || "-"}`
                                    : "No room assigned"}
                            </Text>
                        </View>

                        <Ionicons
                            name="chevron-forward-outline"
                            size={22}
                            color={colors.muted}
                        />
                    </TouchableOpacity>
                ))
            )}

            {/* ================= OTHER BRANCHES ================= */}
            <Text style={styles.sectionTitle}>Other Branches</Text>

            {otherBranchStudents.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No other students found.</Text>
                </View>
            ) : (
                otherBranchStudents.map((student) => (
                    <View
                        key={student.id}
                        style={[styles.studentCard, styles.disabledCard]}
                    >
                        {student.profile_image ? (
                            <Image
                                source={{ uri: student.profile_image }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons
                                    name="person-outline"
                                    size={24}
                                    color={colors.muted}
                                />
                            </View>
                        )}

                        <View style={styles.studentInfo}>
                            <Text style={styles.studentName}>{student.name}</Text>
                            <Text style={styles.studentMeta}>{student.student_id}</Text>

                            <Text style={styles.roomText}>
                                {student.room_number
                                    ? `Room ${student.room_number}`
                                    : "No room assigned"}
                            </Text>
                        </View>

                        <View style={styles.lockedBadge}>
                            <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
                            <Text style={styles.lockedText}>View Only</Text>
                        </View>
                    </View>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 20,
        paddingBottom: 34,
    },
    centered: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    loadingText: {
        marginTop: 12,
        color: colors.muted,
        fontWeight: "600",
    },
    header: {
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: "800",
        color: colors.primary,
    },
    subtitle: {
        marginTop: 6,
        color: colors.secondary,
        lineHeight: 21,
        fontSize: 14,
    },
    searchCard: {
        backgroundColor: colors.white,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 14,
        paddingVertical: 4,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 15,
        color: colors.secondary,
    },
    countRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    countText: {
        color: colors.muted,
        fontWeight: "700",
        fontSize: 13,
    },
    refreshText: {
        color: colors.primary,
        fontWeight: "800",
        fontSize: 13,
    },
    studentCard: {
        backgroundColor: colors.white,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: colors.background,
    },
    avatarPlaceholder: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 16,
        fontWeight: "800",
        color: colors.secondary,
    },
    studentMeta: {
        marginTop: 2,
        fontSize: 13,
        color: colors.muted,
        fontWeight: "600",
    },
    roomText: {
        marginTop: 5,
        fontSize: 12,
        color: colors.secondary,
        opacity: 0.75,
        lineHeight: 17,
    },
    emptyCard: {
        backgroundColor: colors.white,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 24,
        alignItems: "center",
    },
    emptyTitle: {
        marginTop: 10,
        fontSize: 17,
        fontWeight: "800",
        color: colors.secondary,
    },
    emptyText: {
        marginTop: 4,
        color: colors.muted,
        textAlign: "center",
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: colors.secondary,
        marginBottom: 10,
        marginTop: 16,
    },

    disabledCard: {
        opacity: 0.55,
    },

    lockedBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },

    lockedText: {
        fontSize: 11,
        color: colors.muted,
        fontWeight: "700",
    },
});