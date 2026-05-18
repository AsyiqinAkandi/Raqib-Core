import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
  Alert,
  Image,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { colors } from "../../../theme/colors";
import { API_URL } from "../../../config/api";
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
} from "../../../config/cloudinary";
import { useAuth } from "@/context/AuthContext";
import { validateDobParts } from "@/context/validateDob";

/* =========================================================
   TYPES
========================================================= */

type Branch = {
  id: number;
  name: string;
};

type Student = {
  id: number;
  student_id: string;
  name: string;
  barcode: string;
  profile_image?: string | null;
  dob?: string | null;
  gender?: string | null;
  year_level?: string | null;
  phone_number?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  address?: string | null;
  branch_id?: number | null;
  room_id?: number | null;
  status?: string | null;
  remarks?: string | null;
  created_at?: string | null;
  branch_name?: string | null;
  unit?: string | null;
  lorong?: string | null;
  room_number?: string | null;
  capacity?: number | null;
};

type Room = {
  id: number;
  branch_id: number;
  branch_name: string;
  unit: string;
  lorong: string;
  room_number: string;
  capacity: number;
  status: string;
  occupant_count: string;
};

type FormState = {
  student_id: string;
  name: string;
  barcode: string;
  profile_image: string;
  dob: string;
  dob_day: string;
  dob_month: string;
  dob_year: string;
  gender: string;
  year_level: string;
  phone_number: string;
  guardian_name: string;
  guardian_phone: string;
  address: string;
  branch_id: string;
  unit: string;
  lorong: string;
  room_id: string;
  status: string;
  remarks: string;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function AdminStudentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dobError, setDobError] = useState("");

  const [form, setForm] = useState<FormState>({
    student_id: "",
    name: "",
    barcode: "",
    profile_image: "",
    dob: "",
    dob_day: "",
    dob_month: "",
    dob_year: "20",
    gender: "",
    year_level: "",
    phone_number: "",
    guardian_name: "",
    guardian_phone: "",
    address: "",
    branch_id: "",
    unit: "",
    lorong: "",
    room_id: "",
    status: "active",
    remarks: "",
  });

  /* =========================================================
     HELPERS
  ========================================================= */

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      student_id: "",
      name: "",
      barcode: "",
      profile_image: "",
      dob: "",
      dob_day: "",
      dob_month: "",
      dob_year: "20",
      gender: "",
      year_level: "",
      phone_number: "",
      guardian_name: "",
      guardian_phone: "",
      address: "",
      branch_id: "",
      unit: "",
      lorong: "",
      room_id: "",
      status: "active",
      remarks: "",
    });

    setEditingStudentId(null);
    setShowDatePicker(false);
  };

  const confirmAction = async (title: string, message: string) => {
    if (Platform.OS === "web") {
      return window.confirm(`${title}\n\n${message}`);
    }

    return await new Promise<boolean>((resolve) => {
      Alert.alert(title, message, [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => resolve(true),
        },
      ]);
    });
  };

  /* =========================================================
     IMAGE UPLOAD
  ========================================================= */

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow access to your photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"] as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0];
      const formData = new FormData();

      if (Platform.OS === "web") {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        formData.append("file", blob, "student-photo.jpg");
      } else {
        formData.append("file", {
          uri: asset.uri,
          name: asset.fileName || `student-${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        } as any);
      }

      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData?.error?.message || "Failed to upload image");
      }

      if (!uploadData.secure_url) {
        throw new Error("Cloudinary did not return an image URL");
      }

      handleChange("profile_image", uploadData.secure_url);
    } catch (error: any) {
      console.error("Cloudinary upload error:", error);
      Alert.alert("Error", error?.message || "Failed to upload image");
    }
  };

  /* =========================================================
     FETCH DATA
  ========================================================= */

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/students`);
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch students:", error);
      Alert.alert("Error", "Failed to fetch students");
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API_URL}/rooms`);
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      Alert.alert("Error", "Failed to fetch rooms");
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${API_URL}/branches`);
      const data = await res.json();
      setBranches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch branches:", error);
      Alert.alert("Error", "Failed to fetch branches");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStudents(), fetchRooms(), fetchBranches()]);
      setLoading(false);
    };

    loadData();
  }, []);

  /* =========================================================
     DROPDOWN OPTIONS
  ========================================================= */

  const unitOptions = useMemo(() => {
    if (!form.branch_id) return [];

    const filtered = rooms.filter(
      (room) =>
        Number(room.branch_id) === Number(form.branch_id) &&
        room.status === "active"
    );

    return Array.from(new Set(filtered.map((room) => room.unit))).sort();
  }, [rooms, form.branch_id]);

  const lorongOptions = useMemo(() => {
    if (!form.branch_id || !form.unit) return [];

    const filtered = rooms.filter(
      (room) =>
        Number(room.branch_id) === Number(form.branch_id) &&
        room.unit === form.unit &&
        room.status === "active"
    );

    return Array.from(new Set(filtered.map((room) => room.lorong))).sort();
  }, [rooms, form.branch_id, form.unit]);

  const roomOptions = useMemo(() => {
    if (!form.branch_id || !form.unit || !form.lorong) return [];

    return rooms.filter((room) => {
      const matchesBranch = Number(room.branch_id) === Number(form.branch_id);
      const matchesUnit = room.unit === form.unit;
      const matchesLorong = room.lorong === form.lorong;
      const isActive = room.status === "active";

      const count = Number(room.occupant_count ?? 0);
      const isCurrentAssignedRoom =
        editingStudentId !== null && String(room.id) === String(form.room_id);

      const hasCapacity = count < room.capacity || isCurrentAssignedRoom;

      return matchesBranch && matchesUnit && matchesLorong && isActive && hasCapacity;
    });
  }, [rooms, form.branch_id, form.unit, form.lorong, form.room_id, editingStudentId]);

  /* =========================================================
     FILTERED LIST
  ========================================================= */

  const filteredStudents = useMemo(() => {
    const searchLower = search.toLowerCase().trim();

    return students
      .filter((student) => {
        const matchesSearch =
          student.name?.toLowerCase().includes(searchLower) ||
          student.student_id?.toLowerCase().includes(searchLower) ||
          student.branch_name?.toLowerCase().includes(searchLower);

        const matchesBranch =
          !selectedBranch || Number(student.branch_id) === Number(selectedBranch);

        return matchesSearch && matchesBranch;
      })
      .sort((a, b) => {
        if (sortBy === "name-asc") return a.name.localeCompare(b.name);
        if (sortBy === "name-desc") return b.name.localeCompare(a.name);
        if (sortBy === "oldest") {
          return (
            new Date(a.created_at || "").getTime() -
            new Date(b.created_at || "").getTime()
          );
        }

        return (
          new Date(b.created_at || "").getTime() -
          new Date(a.created_at || "").getTime()
        );
      });
  }, [students, search, sortBy, selectedBranch]);

  /* =========================================================
     CRUD ACTIONS
  ========================================================= */

  const handleEditStudent = (student: Student) => {
    setEditingStudentId(student.id);

    const dobValue = student.dob ? String(student.dob).slice(0, 10) : "";
    const [year = "", month = "", day = ""] = dobValue.split("-");

    setForm({
      student_id: student.student_id || "",
      name: student.name || "",
      barcode: student.barcode || "",
      profile_image: student.profile_image || "",
      dob: dobValue,
      dob_day: day,
      dob_month: month,
      dob_year: year,
      gender: student.gender || "",
      year_level: student.year_level || "",
      phone_number: student.phone_number
        ? student.phone_number.replace("+673", "")
        : "",
      guardian_name: student.guardian_name || "",
      guardian_phone: student.guardian_phone
        ? student.guardian_phone.replace("+673", "")
        : "",
      address: student.address || "",
      branch_id: student.branch_id ? String(student.branch_id) : "",
      unit: student.unit || "",
      lorong: student.lorong || "",
      room_id: student.room_id ? String(student.room_id) : "",
      status: student.status || "active",
      remarks: student.remarks || "",
    });

    setModalVisible(true);
  };

  const handleSaveStudent = async () => {
    const trimmedStudentId = form.student_id.trim();
    const trimmedName = form.name.trim();

    if (!trimmedStudentId) {
      Alert.alert("Missing Student ID", "Please fill in the student ID.");
      return;
    }

    if (!trimmedName) {
      Alert.alert("Missing Name", "Please fill in the student name.");
      return;
    }

    if (!form.branch_id) {
      Alert.alert("Missing Branch", "Please select a branch.");
      return;
    }

    if (!form.gender) {
      Alert.alert("Missing Gender", "Please select gender.");
      return;
    }

    const dobResult = validateDobParts(
      form.dob_day,
      form.dob_month,
      form.dob_year
    );

    if (!dobResult.valid) {
      Alert.alert("Invalid Date", dobResult.error);
      return;
    }

    const dobValue = dobResult.value;

    if (
      Platform.OS === "web" &&
      (form.dob_day.trim() || form.dob_month.trim() || form.dob_year.trim()) &&
      !dobValue
    ) {
      return;
    }

    const payload = {
      student_id: trimmedStudentId,
      name: trimmedName,
      barcode: trimmedStudentId,
      profile_image: form.profile_image || null,
      dob: dobValue,
      gender: form.gender || null,
      year_level: form.year_level || null,
      phone_number:
        form.phone_number.trim() !== ""
          ? `+673${form.phone_number.replace(/\D/g, "")}`
          : null,
      guardian_name: form.guardian_name.trim() || null,
      guardian_phone:
        form.guardian_phone.trim() !== ""
          ? `+673${form.guardian_phone.replace(/\D/g, "")}`
          : null,
      address: form.address.trim() || null,
      branch_id: Number(form.branch_id),
      room_id: form.room_id ? Number(form.room_id) : null,
      status: form.status || "active",
      remarks: form.remarks.trim() || null,
      created_by: user?.id,
      updated_by: user?.id,
    };

    try {
      const isEditing = editingStudentId !== null;

      const res = await fetch(
        isEditing
          ? `${API_URL}/students/${editingStudentId}`
          : `${API_URL}/students`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.error || "Failed to save student");
        return;
      }

      await fetchStudents();
      resetForm();
      setModalVisible(false);

      Alert.alert(
        "Success",
        isEditing ? "Student updated successfully" : "Student added successfully"
      );
    } catch (error) {
      console.error("Failed to save student:", error);
      Alert.alert("Error", "Failed to save student");
    }
  };

  const handleDeleteStudent = async (studentId: number, studentName?: string) => {
    const confirmed = await confirmAction(
      "Delete Student",
      `Are you sure you want to delete ${studentName || "this student"}?`
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/students/${studentId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deleted_by: user?.id,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete student");
      }

      setStudents((prev) => prev.filter((student) => student.id !== studentId));

      await fetchStudents();

      Alert.alert("Success", "Student deleted successfully");
    } catch (error: any) {
      console.error("Failed to delete student:", error);
      Alert.alert("Error", error?.message || "Failed to delete student");
    }
  };

  /* =========================================================
     DATE PICKER
  ========================================================= */

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(false);

    if (!selectedDate) return;

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");

    handleChange("dob", `${year}-${month}-${day}`);
  };

  /* =========================================================
     RENDER HELPERS
  ========================================================= */

  const renderStudentRow = ({ item }: { item: Student }) => {
    const roomLabel = item.room_number
      ? `${item.unit} • Lorong ${item.lorong} • Room ${item.room_number}`
      : "Unassigned";

    return (
        <TouchableOpacity
            style={styles.row}
            activeOpacity={0.85}
            onPress={() =>
            router.push({
                pathname: "/(web)/student-details/[id]",
                params: { id: String(item.id) },
            })
            }
        >
        {item.profile_image ? (
          <Image source={{ uri: item.profile_image }} style={styles.studentAvatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {item.name?.charAt(0)?.toUpperCase() || "S"}
            </Text>
          </View>
        )}

        <View style={styles.infoCell}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentMeta}>Student ID: {item.student_id}</Text>
          <Text style={styles.studentMeta}>Branch: {item.branch_name || "-"}</Text>
          <Text style={styles.studentMeta}>
            Gender: {item.gender ? item.gender : "-"}
          </Text>
          <Text style={styles.studentMeta}>Year: {item.year_level || "-"}</Text>
          <Text style={styles.studentMeta}>Room: {roomLabel}</Text>
          <Text style={styles.viewDetailsText}>View more details →</Text>
        </View>

        <View style={styles.actionCell}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={(event) => {
                event.stopPropagation();
                handleEditStudent(item);
            }}
            >
            <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(event) => {
                event.stopPropagation();
                handleDeleteStudent(item.id, item.name);
            }}
            >
            <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  /* =========================================================
     UI
  ========================================================= */

return (
  <ScrollView
    style={styles.page}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator
  >
    <View style={styles.header}>
      <Text style={styles.title}>Students</Text>
      <Text style={styles.subtitle}>
        View and manage student records across all branches.
      </Text>
    </View>

    <View style={styles.toolbarCard}>
      <View style={styles.toolbarTopRow}>
        <TextInput
          placeholder="Search by name, student ID, or branch"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.branchFilterWrapper}>
          <Picker
            selectedValue={selectedBranch}
            onValueChange={(value) => setSelectedBranch(String(value))}
          >
            <Picker.Item label="All Branches" value="" />
            {branches.map((branch) => (
              <Picker.Item
                key={branch.id}
                label={branch.name}
                value={String(branch.id)}
              />
            ))}
          </Picker>
        </View>

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortMenu((prev) => !prev)}
        >
          <Text style={styles.sortButtonText}>Sort ▼</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Add Student</Text>
        </TouchableOpacity>
      </View>

      {showSortMenu && (
        <View style={styles.sortMenu}>
          {[
            { label: "Newest Added", value: "newest" },
            { label: "Oldest Added", value: "oldest" },
            { label: "Name (A-Z)", value: "name-asc" },
            { label: "Name (Z-A)", value: "name-desc" },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => {
                setSortBy(option.value);
                setShowSortMenu(false);
              }}
            >
              <Text style={styles.sortOption}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>

    {loading ? (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>Loading students...</Text>
      </View>
    ) : (
      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderStudentRow}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No students found.</Text>
          </View>
        }
      />
    )}

    <Modal visible={modalVisible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>
              {editingStudentId ? "Edit Student" : "Add Student"}
            </Text>
            <Text style={styles.modalSubtitle}>
              Admin can assign branch, gender, and room details manually.
            </Text>

            <Text style={styles.label}>Student Photo</Text>
            <TouchableOpacity
              style={styles.imageUploadBox}
              onPress={handlePickImage}
            >
              {form.profile_image ? (
                <Image
                  source={{ uri: form.profile_image }}
                  style={styles.previewImage}
                />
              ) : (
                <Text style={styles.imageUploadText}>Tap to upload photo</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Student ID *</Text>
            <TextInput
              style={styles.input}
              placeholder="Student ID"
              value={form.student_id}
              onChangeText={(text) => handleChange("student_id", text)}
            />

            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={form.name}
              onChangeText={(text) => handleChange("name", text)}
            />

            <Text style={styles.label}>Branch *</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={form.branch_id}
                onValueChange={(value) => {
                  handleChange("branch_id", String(value));
                  handleChange("unit", "");
                  handleChange("lorong", "");
                  handleChange("room_id", "");
                }}
              >
                <Picker.Item label="Select Branch" value="" />
                {branches.map((branch) => (
                  <Picker.Item
                    key={branch.id}
                    label={branch.name}
                    value={String(branch.id)}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Gender *</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={form.gender}
                onValueChange={(value) => handleChange("gender", String(value))}
              >
                <Picker.Item label="Select Gender" value="" />
                <Picker.Item label="Male" value="male" />
                <Picker.Item label="Female" value="female" />
              </Picker>
            </View>

            <Text style={styles.label}>Date of Birth</Text>
            {Platform.OS === "web" ? (
              <>
                <View style={styles.webDateLabelsRow}>
                  <Text style={styles.webDateLabel}>Day</Text>
                  <Text style={styles.webDateLabel}>Month</Text>
                  <Text style={styles.webDateLabelYear}>Year</Text>
                </View>

                <View style={styles.webDateRow}>
                  <TextInput
                    style={styles.webDateInput}
                    placeholder="DD"
                    value={form.dob_day}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9]/g, "").slice(0, 2);

                      if (cleaned === "") {
                        handleChange("dob_day", "");
                        return;
                      }

                      const num = Number(cleaned);
                      if (num >= 1 && num <= 31) {
                        handleChange("dob_day", cleaned);
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={2}
                  />

                  <TextInput
                    style={styles.webDateInput}
                    placeholder="MM"
                    value={form.dob_month}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9]/g, "").slice(0, 2);

                      if (cleaned === "") {
                        handleChange("dob_month", "");
                        return;
                      }

                      const num = Number(cleaned);
                      if (num >= 1 && num <= 12) {
                        handleChange("dob_month", cleaned);
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={2}
                  />

                  <TextInput
                    style={[
                      styles.webDateInputYear,
                      dobError && { borderColor: "red" }
                    ]}
                    placeholder="YYYY"
                    value={form.dob_year}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9]/g, "");

                      // allow clearing
                      if (cleaned === "") {
                        handleChange("dob_year", "");
                        return;
                      }

                      // auto-pre-fill "20"
                      if (cleaned.length === 2 && !form.dob_year.startsWith("20")) {
                        const auto = "20" + cleaned;
                        handleChange("dob_year", auto);
                        return;
                      }

                      // limit to 4 digits
                      const yearStr = cleaned.slice(0, 4);
                      const year = Number(yearStr);

                      const currentYear = new Date().getFullYear();

                      handleChange("dob_year", yearStr);

                      if (yearStr.length === 4) {
                        if (year < 1900 || year > currentYear) {
                          setDobError("Invalid year");
                        } else {
                          setDobError("");
                        }
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text
                    style={form.dob ? styles.inputText : styles.placeholderText}
                  >
                    {form.dob || "Select date of birth"}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={form.dob ? new Date(form.dob) : new Date("2012-01-01")}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </>
            )}

            <Text style={styles.label}>Year / Class</Text>
            <View style={styles.chipOptions}>
              {["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"].map(
                (year) => {
                  const active = form.year_level === year;

                  return (
                    <TouchableOpacity
                      key={year}
                      style={[styles.chip, active && styles.activeChip]}
                      onPress={() => handleChange("year_level", year)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.activeChipText,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>

            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phoneRow}>
              <View style={styles.phonePrefixBox}>
                <Text style={styles.phonePrefixText}>+673</Text>
              </View>

              <TextInput
                style={styles.phoneInput}
                placeholder="Enter phone number"
                value={form.phone_number.replace("+673", "")}
                onChangeText={(text) =>
                  handleChange("phone_number", text.replace(/[^0-9]/g, ""))
                }
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.label}>Guardian Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Guardian Name"
              value={form.guardian_name}
              onChangeText={(text) => handleChange("guardian_name", text)}
            />

            <Text style={styles.label}>Guardian Phone</Text>
            <View style={styles.phoneRow}>
              <View style={styles.phonePrefixBox}>
                <Text style={styles.phonePrefixText}>+673</Text>
              </View>

              <TextInput
                style={styles.phoneInput}
                placeholder="Enter guardian phone"
                value={form.guardian_phone.replace("+673", "")}
                onChangeText={(text) =>
                  handleChange("guardian_phone", text.replace(/[^0-9]/g, ""))
                }
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Address"
              value={form.address}
              onChangeText={(text) => handleChange("address", text)}
            />

            <Text style={styles.label}>Unit</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={form.unit}
                onValueChange={(value) => {
                  handleChange("unit", String(value));
                  handleChange("lorong", "");
                  handleChange("room_id", "");
                }}
                enabled={!!form.branch_id}
              >
                <Picker.Item
                  label={form.branch_id ? "Select Unit" : "Select branch first"}
                  value=""
                />
                {unitOptions.map((unit) => (
                  <Picker.Item key={unit} label={unit} value={unit} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Lorong</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={form.lorong}
                onValueChange={(value) => {
                  handleChange("lorong", String(value));
                  handleChange("room_id", "");
                }}
                enabled={!!form.branch_id && !!form.unit}
              >
                <Picker.Item
                  label={form.unit ? "Select Lorong" : "Select unit first"}
                  value=""
                />
                {lorongOptions.map((lorong) => (
                  <Picker.Item
                    key={lorong}
                    label={`Lorong ${lorong}`}
                    value={lorong}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Room</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={form.room_id}
                onValueChange={(value) => handleChange("room_id", String(value))}
                enabled={!!form.branch_id && !!form.unit && !!form.lorong}
              >
                <Picker.Item
                  label={form.lorong ? "Select Room" : "Select lorong first"}
                  value=""
                />
                {roomOptions.map((room) => {
                  const count = Number(room.occupant_count ?? 0);
                  const label = `Room ${room.room_number} (${count}/${room.capacity})`;

                  return (
                    <Picker.Item
                      key={room.id}
                      label={label}
                      value={String(room.id)}
                    />
                  );
                })}
              </Picker>
            </View>

            <Text style={styles.label}>Status</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={form.status}
                onValueChange={(value) => handleChange("status", String(value))}
              >
                <Picker.Item label="Active" value="active" />
                <Picker.Item label="Inactive" value="inactive" />
                <Picker.Item label="Graduated" value="graduated" />
                <Picker.Item label="Suspended" value="suspended" />
              </Picker>
            </View>

            <Text style={styles.label}>Remarks</Text>
            <TextInput
              style={styles.input}
              placeholder="Remarks"
              value={form.remarks}
              onChangeText={(text) => handleChange("remarks", text)}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveStudent}
              >
                <Text style={styles.saveButtonText}>
                  {editingStudentId ? "Update Student" : "Save Student"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </ScrollView>
);
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
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
  color: colors.secondary, // readable dark blue
  marginBottom: 6,
},

subtitle: {
  fontSize: 15,
  color: colors.secondary,
  opacity: 0.75,
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
  backgroundColor: colors.white,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.secondary,
},

addButton: {
  backgroundColor: colors.accent,
  paddingHorizontal: 18,
  paddingVertical: 12,
  borderRadius: 12,
},

addButtonText: {
  color: colors.white,
  fontWeight: "700",
  fontSize: 15,
},
  branchFilterWrapper: {
    minWidth: 190,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.white,
  },
  sortButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortButtonText: {
    color: colors.secondary,
    fontWeight: "700",
  },
  sortMenu: {
    marginTop: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    width: 220,
  },
  sortOption: {
    paddingVertical: 10,
    color: colors.secondary,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 24,
    gap: 14,
  },
  row: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 14,
  },
  studentAvatar: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: colors.black,
    fontWeight: "700",
    fontSize: 22,
  },
  infoCell: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 4,
  },
  studentMeta: {
    fontSize: 13,
    color: colors.secondary,
    marginBottom: 2,
  },
  actionCell: {
    gap: 10,
  },
  editButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  editButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  deleteButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  deleteButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  emptyBox: {
    backgroundColor: colors.white,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  emptyText: {
    color: colors.secondary,
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "90%",
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.secondary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 18,
  },
  imageUploadBox: {
    width: 120,
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  imageUploadText: {
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.black,
  },
  inputText: {
    color: colors.black,
  },
  placeholderText: {
    color: colors.muted,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.secondary,
    marginBottom: 10,
    marginTop: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.background,
    marginBottom: 12,
  },
  chipOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  activeChip: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.secondary,
    fontWeight: "600",
  },
  activeChipText: {
    color: colors.black,
    fontWeight: "700",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  phonePrefixBox: {
    backgroundColor: "#f7f8fa",
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  phonePrefixText: {
    color: colors.secondary,
    fontWeight: "700",
  },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.black,
  },
  webDateLabelsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  webDateLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
  },
  webDateLabelYear: {
    flex: 1.5,
    fontSize: 12,
    color: colors.muted,
  },
  webDateRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  webDateInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.black,
  },
  webDateInputYear: {
    flex: 1.5,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.black,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    backgroundColor: "#f1f3f5",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelButtonText: {
    color: colors.secondary,
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  viewDetailsText: {
    marginTop: 10,
    color: colors.primary,
    fontWeight: "800",
    fontSize: 13,
  },
});