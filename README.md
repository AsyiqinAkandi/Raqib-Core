# 🧠 Raqib Core – Hostel Management System

## 📌 Overview

**Raqib Core** is a web and mobile-based Hostel Management System developed using the **PERN stack** (PostgreSQL, Express, React Native with Expo, Node.js).

The system is designed for hostel administration in an Islamic school environment, supporting:

* Student management
* Room management
* Barcode-based attendance tracking
* Branch-based dashboards
* Report generation (CSV export)

---

## 🛠️ Tech Stack

### Frontend

* React Native (Expo)
* Expo Router
* Axios (API communication 📡)
* Zustand (state management 🧠)
* React Native Chart Kit
* React Native SVG

### Backend

* Node.js
* Express.js
* PostgreSQL
* pg (database client)
* CORS
* dotenv

### Additional Tools

* Expo Camera (barcode scanning)
* Image Picker (profile images)
* Cloudinary (image storage)

---

## 🚀 Installation Guide

### 1. Create Project

```bash
npx create-expo-app@latest raqib-core
cd raqib-core
npm install
```

---

### 2. Install Core Dependencies

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npm install axios zustand
```

---

### 3. Install Features

```bash
npx expo install expo-camera
npx expo install @react-native-picker/picker
npx expo install expo-image-picker
npx expo install @react-native-community/datetimepicker
npm install react-native-chart-kit react-native-svg
npx expo install react-native-svg
```

---

### 4. Backend Setup

```bash
mkdir server
cd server
npm init -y
npm install express pg cors dotenv
```

Run backend:

```bash
node index.js
```

Auto-restart server:

```bash
npx nodemon index.js
```

---

## 📡 API Configuration (IMPORTANT)

The system uses a **local IP-based connection** instead of hosted backend.

### Example:

```ts
export const API_URL =
  Platform.OS === "web"
    ? "http://localhost:5000"
    : "http://192.168.X.X:5000";
```

---

## ⚠️ IP Address Handling

Since the backend is hosted locally:

* Your **mobile device must be on the same Wi-Fi network** as your laptop
* The **IP address must be updated manually** when switching networks

### Common Issue:

> ❌ "Network request failed"

### Fix:

1. Run `ipconfig` (Windows) or `ifconfig` (Mac)
2. Update your local IP in `API_URL`
3. Restart Expo

---

## 📱 Running the App

```bash
npx expo start
```

* Press `w` → run on web
* Scan QR → run on mobile (Expo Go)

---

## 👥 User Roles

### Admin

* Full system access
* Manage users, students, rooms
* View logs and reports

### Warden

* Branch-specific access
* Manage students and rooms
* Record attendance (manual + barcode)
* Generate reports

---

## 📊 Reports

* Monthly filtering (Admin & Warden)
* CSV Export includes:

  * Monthly Summary
  * Daily Attendance
  * Detailed Attendance Records

---

## 🎯 Key Features

* 📷 Barcode-based attendance scanning
* 🏠 Room capacity tracking
* 📊 Dashboard analytics
* 📝 Notes & attendance categories
* 📁 CSV report export
* 🔐 Role-based access control

---

## 🚧 Known Limitations

* Backend is not hosted (local only)
* IP address must be updated manually
* Mobile performance may vary depending on device

---

## 🧠 Project Status

```txt
✔ Core features complete
✔ Reporting system complete
✔ Demo-ready
✔ Stable for presentation
```

---

## 💬 Notes

> This system prioritizes stability and usability for demonstration purposes.
> Hosting and advanced deployment are intentionally deferred to reduce risk during final submission.

---

## 👨‍💻 Author

Developed as part of a Capstone Project (UTB SCI Programme)
