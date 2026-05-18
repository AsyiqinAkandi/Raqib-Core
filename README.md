# Raqib Core – Hostel Management System

## Overview

Raqib Core is a web and mobile-based Hostel Management System developed using the PERN stack (PostgreSQL, Express, React Native with Expo, Node.js).

The system is designed for hostel administration in an Islamic school environment, supporting:

* Student management
* Room management
* Barcode-based attendance tracking
* Branch-based dashboards
* Report generation (CSV export)

---

## Tech Stack

### Frontend

* React Native (Expo)
* Expo Router
* Axios
* Zustand
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

## Database Schema

The full PostgreSQL schema is available in:

/database/schema.sql

To initialize the database:

```bash
psql -U postgres -d your_database -f database/schema.sql

## Installation Guide

### 1. Create Project

```bash
npx create-expo-app@latest raqib-core
cd raqib-core
npm install
````

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

For development:

```bash
npx nodemon index.js
```

---

## API Configuration

The system connects to a locally hosted backend server.

Example:

```ts
export const API_URL =
  Platform.OS === "web"
    ? "http://localhost:5000"
    : "http://YOUR_BACKEND_URL:5000";
```

---

## Running the App

```bash
npx expo start
```

* Press `w` to run web
* Scan QR code to run on mobile (Expo Go)

---

## User Roles

### Admin

* Full system access
* Manage users, students, rooms
* View logs and reports

### Warden

* Branch-specific access
* Manage students and rooms
* Record attendance (manual and barcode)
* Generate reports

---

## Reports

* Monthly filtering for Admin and Warden
* CSV export includes:

  * Monthly summary
  * Daily attendance
  * Detailed attendance records

---

## Key Features

* Barcode-based attendance scanning
* Room capacity tracking
* Dashboard analytics
* Notes and attendance categories
* CSV report export
* Role-based access control

---

## Known Limitations

* Backend is locally hosted
* Requires network access to backend server
* Performance may vary depending on device and network conditions

---

## Project Status

```
Core features complete
Reporting system complete
Demo-ready
Stable for presentation
```

---

## Notes

This system prioritizes stability and usability for demonstration purposes. Hosting and advanced deployment are intentionally deferred to reduce risk during final submission.

---

## Author

Developed as part of a Capstone Project (UTB SCI Programme)