//INITIAL VERSION. WORKS ON WEB BUT NOT ON MOBILE. BECAUSE OF IP CONFIGURATION. CHECK YOUR IP WITH IPCONFIG AND CHANGE THE LOCAL_IP VARIABLE BELOW
// import { Platform } from "react-native";

// const LOCAL_IP = "192.168.100.99"; //will change once you change wifi, just check your ip with ipconfig

// export const API_URL =
//   Platform.OS === "web"
//   ? "http://localhost:5000"
//   : `http://${LOCAL_IP}:5000`;

//THIS ONE WAS NICE. NO NEED OF MANUAL IPCIONFIG. JUST WORKS ON BOTH WEB AND MOBILE WITHOUT ANY CHANGE. THANKS EXPO
import { Platform } from "react-native";
import Constants from "expo-constants";

const DEV_API = Constants.expoConfig?.hostUri
  ? `http://${Constants.expoConfig.hostUri.split(":")[0]}:5000`
  : "http://localhost:5000";

export const API_URL =
  Platform.OS === "web"
    ? "http://localhost:5000"
    : DEV_API;

//TESTING NGROK. NO NEED OF MANUAL IPCONFIG. JUST WORKS ON BOTH WEB AND MOBILE WITHOUT ANY CHANGE. THANKS EXPO
//DIDNT WORK. MAYBE NGROK DOESNT SUPPORT WEBSOCKETS. CHECK THEIR DOCS. ALSO CHECK IF YOUR NGROK URL IS CORRECT
//------------------------------------------------------------------------------------------------------------
// import { Platform } from "react-native";
// import Constants from "expo-constants";

// // Automatically gets your laptop IP from Expo
// const LOCAL_API = Constants.expoConfig?.hostUri
//   ? `http://${Constants.expoConfig.hostUri.split(":")[0]}:5000`
//   : "http://localhost:5000";

// // Your ngrok URL
// const NGROK_API = "https://posh-joystick-shopping.ngrok-free.dev";

// // Toggle this manually
// const USE_NGROK = true;

// export const API_URL =
//   Platform.OS === "web"
//     ? "http://localhost:5000"
//     : USE_NGROK
//     ? NGROK_API
//     : LOCAL_API;