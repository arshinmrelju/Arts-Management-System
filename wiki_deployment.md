<p align="center">
  <img src="https://raw.githubusercontent.com/arshinmrelju/unionprc/master/y/assets/Pazhassiraja_College_Pulpally_Logo.png" alt="Pazhassiraja College Logo" width="120">
</p>

# Getting Started & Deployment Guide

This guide details the steps required to set up the local development environment and deploy the **Pazhassiraja College Fine Arts Management System** to Firebase.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js & npm**: [Download Node.js](https://nodejs.org/)
2. **Firebase CLI**: Install globally using:
   ```bash
   npm install -g firebase-tools
   ```
3. **A Firebase Project**: Create one via the [Firebase Console](https://console.firebase.google.com/).

---

## 🛠️ Local Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/arshinmrelju/Arts-Management-System.git
   cd Arts-Management-System
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize/Use Project**:
   ```bash
   firebase use --add [your-project-id]
   ```

4. **Install Dependencies** (if applicable for helper scripts):
   ```bash
   npm install
   ```

---

## ⚙️ Configuration

You must update the Firebase configuration to point to your specific project instance.

1. Locate the file: `/y/assets/core/firebase-config.js`
2. Update the `firebaseConfig` object with your API keys and project IDs found in the Firebase Console (Project Settings > Web App).

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

---

## 🚀 Deployment

The system is deployed using the Firebase CLI.

### 1. Deploy Security Rules & Indexes
Ensure your Firestore rules are up to date:
```bash
firebase deploy --only firestore:rules
```

### 2. Deploy the Web App
Upload all assets in the `/y` directory to Firebase Hosting:
```bash
firebase deploy --only hosting
```

### 3. Full Deployment
To deploy everything (rules, hosting, storage rules) at once:
```bash
firebase deploy
```

---

## 🧪 Local Testing
You can preview the site locally using the Firebase emulator or hosting preview:

```bash
firebase hosting:serve
```
This will start a local server, usually at `http://localhost:5000`.

---

> [!TIP]
> Always check `firestore.rules` before deployment to ensure your specific admin email addresses are whitelisted in the `isAdmin()` helper function.
