import { Platform } from "react-native";

const LOCAL_IP = "192.168.68.166"; // just ipconfig in powershell if your db isnt connecting

export const API_URL =
  Platform.OS === "web"
    ? "http://localhost:5000"
    : `http://${LOCAL_IP}:5000`;