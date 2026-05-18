import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";

import { colors } from "../../../theme/colors";
import { API_URL } from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";

/* =========================================================
   TYPES
========================================================= */

type RoomStatus = "active" | "inactive";

type Branch = {
  id: number;
  name: string;
};

type Room = {
  id: number;
  branch_id: number;
  branch_name: string;
  unit: string;
  lorong: string;
  room_number: string;
  capacity: number;
  status: RoomStatus;
  occupant_count: string;
  remarks: string | null;
};

type RoomForm = {
  branch_id: string;
  unit: string;
  lorong: string;
  room_number: string;
  capacity: string;
  status: RoomStatus;
  remarks?: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const initialForm: RoomForm = {
  branch_id: "",
  unit: "",
  lorong: "",
  room_number: "",
  capacity: "",
  status: "active",
  remarks: "",
};

/* =========================================================
   COMPONENT
========================================================= */

export default function AdminRoomsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [occupancyFilter, setOccupancyFilter] = useState("all");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomForm>(initialForm);

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusRoom, setStatusRoom] = useState<Room | null>(null);
  const [statusReason, setStatusReason] = useState("");
  /* =========================================================
     HELPERS
  ========================================================= */

  const handleChange = (key: keyof RoomForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const openAddModal = () => {
    setEditingRoom(null);
    setForm(initialForm);
    setModalVisible(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setForm({
      branch_id: String(room.branch_id ?? ""),
      unit: room.unit ?? "",
      lorong: room.lorong ?? "",
      room_number: room.room_number ?? "",
      capacity: String(room.capacity ?? ""),
      status: room.status ?? "active",
      remarks: room.remarks ?? "",
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
    setEditingRoom(null);
    setForm(initialForm);
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
          text: "Yes",
          onPress: () => resolve(true),
        },
      ]);
    });
  };

  const validateForm = () => {
    if (!form.branch_id) {
      Alert.alert("Validation", "Please select a branch.");
      return false;
    }

    if (!form.unit.trim()) {
      Alert.alert("Validation", "Please enter a unit.");
      return false;
    }

    if (!form.lorong.trim()) {
      Alert.alert("Validation", "Please enter a lorong.");
      return false;
    }

    if (!form.room_number.trim()) {
      Alert.alert("Validation", "Please enter a room number.");
      return false;
    }

    if (
      !form.capacity.trim() ||
      isNaN(Number(form.capacity)) ||
      Number(form.capacity) <= 0
    ) {
      Alert.alert("Validation", "Please enter a valid room capacity.");
      return false;
    }

    return true;
  };

  /* =========================================================
     FETCH DATA
  ========================================================= */

  const fetchRooms = async () => {
    try {
      const response = await fetch(`${API_URL}/rooms`);
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch rooms");
      }

      setRooms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("fetchRooms error:", error);
      Alert.alert("Error", "Failed to fetch rooms.");
      setRooms([]);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch(`${API_URL}/branches`);
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch branches");
      }

      setBranches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("fetchBranches error:", error);
      Alert.alert("Error", "Failed to fetch branches.");
      setBranches([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchRooms(), fetchBranches()]);
      setLoading(false);
    };

    load();
  }, []);

  /* =========================================================
    FILTERED DATA
  ========================================================= */

  const filteredRooms = useMemo(() => {
    const searchLower = search.toLowerCase().trim();

    return rooms.filter((room) => {
      const occupantCount = Number(room.occupant_count ?? 0);
      const capacity = Number(room.capacity ?? 0);

      // -------------------------
      // Branch filter
      // -------------------------
      const matchesBranch =
        branchFilter === "all" ||
        Number(room.branch_id) === Number(branchFilter);

      // -------------------------
      // Search filter
      // -------------------------
      const fieldsToSearch = [
        room.room_number,
        room.unit,
        room.lorong,
        room.branch_name,
      ];

      const matchesSearch =
        searchLower === "" ||
        fieldsToSearch.some((field) =>
          (field ?? "")
            .toString()
            .toLowerCase()
            .includes(searchLower)
        );

      // -------------------------
      // Occupancy filter
      // -------------------------
      const matchesOccupancy =
        occupancyFilter === "all" ||
        (occupancyFilter === "occupied" && occupantCount > 0) ||
        (occupancyFilter === "unoccupied" && occupantCount === 0) ||
        (occupancyFilter === "full" && occupantCount >= capacity);

      return matchesBranch && matchesSearch && matchesOccupancy;
    });
  }, [rooms, search, branchFilter, occupancyFilter]);

  /* =========================================================
     CRUD ACTIONS
  ========================================================= */

  const handleSaveRoom = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        branch_id: Number(form.branch_id),
        unit: form.unit.trim(),
        lorong: form.lorong.trim().toUpperCase(),
        room_number: form.room_number.trim(),
        capacity: Number(form.capacity),
        status: form.status,
        remarks: form.remarks?.trim(),
        created_by: user?.id,
        updated_by: user?.id,
      };

      const isEditing = !!editingRoom;
      const url = isEditing
        ? `${API_URL}/rooms/${editingRoom?.id}`
        : `${API_URL}/rooms`;

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Failed to save room");
      }

      Alert.alert(
        "Success",
        isEditing ? "Room updated successfully." : "Room created successfully."
      );

      closeModal();
      await fetchRooms();
    } catch (error: any) {
      console.error("handleSaveRoom error:", error);
      Alert.alert("Error", error?.message || "Failed to save room.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (room: Room) => {
    if (room.status === "active") {
      setStatusRoom(room);
      setStatusReason(room.remarks || "");
      setStatusModalVisible(true);
      return;
    }

    const confirmed = await confirmAction(
      "Enable Room",
      "Are you sure you want to mark this room as active again?"
    );

    if (!confirmed) return;

    await updateRoomStatus(room, "active", "");
  };

  const updateRoomStatus = async (
    room: Room,
    nextStatus: RoomStatus,
    remarks: string
  ) => {
    try {
      const response = await fetch(`${API_URL}/rooms/${room.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branch_id: Number(room.branch_id),
          unit: room.unit,
          lorong: room.lorong,
          room_number: room.room_number,
          capacity: Number(room.capacity),
          status: nextStatus,
          remarks,
          updated_by: user?.id,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update room status");
      }

      await fetchRooms();
      Alert.alert("Success", `Room marked as ${nextStatus}.`);
    } catch (error: any) {
      console.error("updateRoomStatus error:", error);
      Alert.alert("Error", error?.message || "Failed to update room status.");
    }
  };

  /* =========================================================
     RENDER HELPERS
  ========================================================= */

  const cardsPerRow = width >= 1400 ? 3 : width >= 900 ? 2 : 1;

  const renderRoomCard = (item: Room) => {
    const occupantCount = Number(item.occupant_count ?? 0);
    const isDisabled = item.status === "inactive";
    const isFull = occupantCount >= Number(item.capacity);

    const availabilityLabel = isDisabled
      ? "Unavailable"
      : isFull
      ? "Full"
      : "Available";

    const cardWidth =
      cardsPerRow === 3 ? "31.8%" : cardsPerRow === 2 ? "48.8%" : "100%";

    return (
      <View key={item.id} style={[styles.cardWrapper, { width: cardWidth }]}>
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() =>
            router.push({
              pathname: "/(web)/room-details/[id]",
              params: { id: String(item.id) },
            })
          }
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
                <Text style={styles.roomTitle}>Room {item.room_number}</Text>
                <Text style={styles.roomSubtitle}>
                  {item.branch_name} • Unit {item.unit} • Lorong {item.lorong}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  item.status === "active"
                    ? styles.activeBadge
                    : styles.inactiveBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    item.status === "active"
                      ? styles.activeBadgeText
                      : styles.inactiveBadgeText,
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>

            <View style={styles.occupancyRow}>
              <Text style={styles.occupancyText}>
                Occupancy: {occupantCount}/{item.capacity}
              </Text>

              <Text
                style={[
                  styles.capacityState,
                  isDisabled
                    ? styles.unavailableText
                    : isFull
                    ? styles.fullText
                    : styles.availableText,
                ]}
              >
                {availabilityLabel}
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.viewDetailsText}>View room details →</Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => openEditModal(item)}
              >
                <Text style={styles.buttonText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  item.status === "active"
                    ? styles.disableButton
                    : styles.enableButton,
                ]}
                onPress={() => handleToggleStatus(item)}
              >
                <Text style={styles.buttonText}>
                  {item.status === "active" ? "Disable" : "Enable"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  /* =========================================================
     UI
  ========================================================= */

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading rooms...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
      <View style={styles.header}>
        <Text style={styles.title}>Rooms</Text>
        <Text style={styles.subtitle}>
          View, create, update, and monitor rooms across all hostel branches.
        </Text>
      </View>

      <View style={styles.toolbarCard}>
        <View style={styles.toolbarTopRow}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by room, unit, lorong, or branch"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />

          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Add Room</Text>
          </TouchableOpacity>
        </View>

        {/* Branch filter chips */}
        <View style={styles.filterRow}>
        <TouchableOpacity
            style={[
            styles.filterChip,
            branchFilter === "all" && styles.activeFilterChip,
            ]}
            onPress={() => setBranchFilter("all")}
        >
            <Text
            style={[
                styles.filterChipText,
                branchFilter === "all" && styles.activeFilterChipText,
            ]}
            >
            All Branches
            </Text>
        </TouchableOpacity>

        {branches.map((branch) => (
            <TouchableOpacity
            key={branch.id}
            style={[
                styles.filterChip,
                branchFilter === String(branch.id) && styles.activeFilterChip,
            ]}
            onPress={() => setBranchFilter(String(branch.id))}
            >
            <Text
                style={[
                styles.filterChipText,
                branchFilter === String(branch.id) &&
                    styles.activeFilterChipText,
                ]}
            >
                {branch.name}
            </Text>
            </TouchableOpacity>
        ))}
        </View>

        {/* Occupancy filter chips */}
        <View style={styles.filterRow}>
        {[
            { label: "All Rooms", value: "all" },
            { label: "Occupied", value: "occupied" },
            { label: "Unoccupied", value: "unoccupied" },
            { label: "Full", value: "full" },
        ].map((filter) => (
            <TouchableOpacity
            key={filter.value}
            style={[
                styles.filterChip,
                occupancyFilter === filter.value && styles.activeFilterChip,
            ]}
            onPress={() => setOccupancyFilter(filter.value)}
            >
            <Text
                style={[
                styles.filterChipText,
                occupancyFilter === filter.value && styles.activeFilterChipText,
                ]}
            >
                {filter.label}
            </Text>
            </TouchableOpacity>
        ))}
        </View>
      </View>

      <View style={styles.roomsGrid}>
        {filteredRooms.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No rooms found.</Text>
          </View>
        ) : (
          filteredRooms.map((room) => renderRoomCard(room))
        )}
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.modalOverlayContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {editingRoom ? "Edit Room" : "Add Room"}
              </Text>
              <Text style={styles.modalSubtitle}>
                Admin can manage rooms across all branches.
              </Text>

              <Text style={styles.label}>Branch *</Text>
              <View style={styles.optionRow}>
                {branches.map((branch) => (
                  <TouchableOpacity
                    key={branch.id}
                    style={[
                      styles.optionChip,
                      form.branch_id === String(branch.id) &&
                        styles.selectedOptionChip,
                    ]}
                    onPress={() => handleChange("branch_id", String(branch.id))}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        form.branch_id === String(branch.id) &&
                          styles.selectedOptionChipText,
                      ]}
                    >
                      {branch.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Unit *</Text>
              <TextInput
                style={styles.input}
                value={form.unit}
                onChangeText={(value) => handleChange("unit", value)}
                placeholder="Enter unit"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.label}>Lorong *</Text>
              <TextInput
                style={styles.input}
                value={form.lorong}
                onChangeText={(value) => handleChange("lorong", value)}
                placeholder="Enter lorong, e.g. A"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                maxLength={1}
              />

              <Text style={styles.label}>Room Number *</Text>
              <TextInput
                style={styles.input}
                value={form.room_number}
                onChangeText={(value) => handleChange("room_number", value)}
                placeholder="Enter room number"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.label}>Capacity *</Text>
              <TextInput
                style={styles.input}
                value={form.capacity}
                onChangeText={(value) =>
                  handleChange("capacity", value.replace(/[^0-9]/g, ""))
                }
                placeholder="Enter room capacity"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Status</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[
                    styles.optionChip,
                    form.status === "active" && styles.selectedOptionChip,
                  ]}
                  onPress={() => handleChange("status", "active")}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      form.status === "active" &&
                        styles.selectedOptionChipText,
                    ]}
                  >
                    Active
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionChip,
                    form.status === "inactive" && styles.selectedOptionChip,
                  ]}
                  onPress={() => handleChange("status", "inactive")}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      form.status === "inactive" &&
                        styles.selectedOptionChipText,
                    ]}
                  >
                    Inactive
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Remarks</Text>
              <TextInput
                style={[styles.input, styles.remarksInput]}
                value={form.remarks}
                onChangeText={(value) => handleChange("remarks", value)}
                placeholder="Example: Under maintenance"
                placeholderTextColor={colors.muted}
                multiline
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveRoom}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving
                      ? "Saving..."
                      : editingRoom
                      ? "Update Room"
                      : "Save Room"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.statusModalCard}>
            <Text style={styles.modalTitle}>Disable Room</Text>
            <Text style={styles.modalSubtitle}>
              Please state why this room is being disabled.
            </Text>

            <Text style={styles.label}>Reason *</Text>
            <TextInput
              style={[styles.input, styles.remarksInput]}
              value={statusReason}
              onChangeText={setStatusReason}
              placeholder="Example: Under maintenance"
              placeholderTextColor={colors.muted}
              multiline
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setStatusModalVisible(false);
                  setStatusRoom(null);
                  setStatusReason("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={async () => {
                  if (!statusRoom) return;

                  if (!statusReason.trim()) {
                    Alert.alert("Validation", "Please enter a reason.");
                    return;
                  }

                  setStatusModalVisible(false);

                  await updateRoomStatus(
                    statusRoom,
                    "inactive",
                    statusReason.trim()
                  );

                  setStatusRoom(null);
                  setStatusReason("");
                }}
              >
                <Text style={styles.saveButtonText}>Disable Room</Text>
              </TouchableOpacity>
            </View>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 14,
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
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  addButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
  },
  activeFilterChip: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterChipText: {
    color: colors.secondary,
    fontWeight: "700",
    fontSize: 13,
  },
  activeFilterChipText: {
    color: colors.white,
  },
  roomsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardWrapper: {
    marginBottom: 16,
  },
  emptyBox: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    width: "100%",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    height: "100%",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.secondary,
    marginBottom: 4,
  },
  roomSubtitle: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  activeBadge: {
    backgroundColor: "rgba(40,167,69,0.12)",
  },
  activeBadgeText: {
    color: colors.success,
  },
  inactiveBadge: {
    backgroundColor: "rgba(220,53,69,0.12)",
  },
  inactiveBadgeText: {
    color: colors.error,
  },
  occupancyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  occupancyText: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: "600",
  },
  capacityState: {
    fontSize: 13,
    fontWeight: "700",
  },
  availableText: {
    color: colors.success,
  },
  fullText: {
    color: colors.accent,
  },
  unavailableText: {
    color: colors.error,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  editButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    alignItems: "center",
  },
  toggleButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    alignItems: "center",
  },
  disableButton: {
    backgroundColor: colors.error,
  },
  enableButton: {
    backgroundColor: colors.success,
  },
  buttonText: {
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
    color: colors.accent,
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
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
  },
  selectedOptionChip: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionChipText: {
    color: colors.secondary,
    fontWeight: "700",
    fontSize: 13,
  },
  selectedOptionChipText: {
    color: colors.white,
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
    backgroundColor: colors.accent,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  remarksInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  statusModalCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  
  cardFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  viewDetailsText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 13,
    marginBottom: 10,
  },
});