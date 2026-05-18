import { Platform } from "react-native";

const LOCAL_IP = "192.168.100.99"; //will change once you change wifi, just check your ip with ipconfig

export const API_URL =
  Platform.OS === "web"
  ? "http://localhost:5000"
  : `http://${LOCAL_IP}:5000`;