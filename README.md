<p align="center">
  <img src="y/assets/Pazhassiraja_College_Pulpally_Logo.png" alt="Pazhassiraja College Logo" width="120">
</p>

# 🎭 Pazhassiraja College Fine Arts Management System

[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg?style=for-the-badge)](https://en.wikipedia.org/wiki/Proprietary_software)

A professional, real-time management portal and appeal system for the **Union Arts Festival**. Built with a modern **glassmorphic aesthetic** and a robust **Firebase backend**, this system streamlines the coordination of Arts competitions—from registration to digital certificate publication.

---

## 🚀 Key Portals & Features

### 🛡️ Command Center (Core Admin)
The super-administrator's gateway for total system control:
- **Active Node Monitoring**: Real-time tracking of online administrators and their session activities.
- **Access Control**: Granular management of admin roles and whitelist-based authentication.
- **Certificate Customization**: Dynamic configuration of festival titles, academic years, and official signatures.
- **Data Audit & Recovery**: Tools for scanning and restoring legacy records to ensure data integrity.

### 🎭 Stage Manager Portal
A dedicated operational dashboard for stage-level coordination:
- **Live Schedule**: Real-time view of upcoming and ongoing programs on assigned stages.
- **Lottery System**: Digital lot drawing to ensure fair and randomized performance order.
- **Performance Capture**: Integrated recording features for documenting performances.
- **Result Submission**: Seamless upload of marks and grades for immediate review.

### 📊 Secretary Hub & Admin Dashboard
Unified tools for department secretaries and festival coordinators:
- **Registration Management**: Field-level control, chest number allocation, and global registration locking.
- **Program Scheduling**: Dynamic management of competition dates, venues, and schedules.
- **Real-time Feedback**: Modern alert system for instant status updates.

### 📝 Student & Appeal Portals
User-friendly interfaces for participants:
- **Streamlined Registration**: Easy-to-use forms for individual and group events with real-time validation.
- **Appeal System**: A dedicated portal for submitting appeals with support for video evidence and resolution tracking.

### 🏆 Real-time Leaderboard
- **Dynamic Standings**: Live-updating department-wise scores and rankings.
- **Mobile Optimized**: A sleek, space-efficient design ensuring a premium experience on any device.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (Glassmorphism & Advanced Animations)
- **Backend**: Firebase (Firestore, Authentication, Hosting, Storage)
- **Icons**: Font Awesome 6
- **Typography**: Outfit, Inter, and Playfair Display (Google Fonts)
- **Mapping**: Leaflet/Mapbox (if applicable) or custom SVG coordinates.

---

## 📁 Project Structure

The project is organized for scalability:

- `/y`: The public web directory containing all application files.
  - `index.html`: Main landing page and primary entry point.
  - `admin.html`: Unified administration console for staff and secretaries.
  - `coreadmin.html`: Super-admin command center.
  - `stagemanager.html`: Operational portal for stage management.
  - `student.html`: Student-facing registration portal.
  - `appeal.html`: Participant appeal submission portal.
  - `leaderboard.html`: Public results and standings page.
  - `/assets`: CSS and JS assets organized by functional modules (`admin/`, `coreadmin/`, etc.).
- `firebase.json`: Configuration for Firebase Hosting and route rewrites.
- `firestore.rules`: Security rules for Firestore data access.

---

## 🔧 Installation & Deployment

### Prerequisites
- [Firebase CLI](https://firebase.google.com/docs/cli) installed (`npm install -g firebase-tools`)
- A Firebase project created in the [Firebase Console](https://console.firebase.google.com/)

### Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/unionprc.git
   cd unionprc
   ```
2. **Setup Firebase**:
   ```bash
   firebase login
   firebase use --add [your-project-id]
   ```
3. **Configure Environment**:
   Update `/y/assets/core/firebase-config.js` with your Firebase project credentials.
4. **Deploy**:
   ```bash
   firebase deploy
   ```

---

## 📱 Mobile Responsiveness

The system features a **mobile-first** design philosophy, utilizing responsive CSS layouts to ensure that every portal—from the Command Center to the Leaderboard—remains functional and visually stunning on smartphones, tablets, and desktops.

---

## 🔐 License & Copyright

This project is **Proprietary and Private**. All rights reserved by **Pazhassiraja College**. 

- **Copyright © 2026 Pazhassiraja College**
- The source code, assets, and design are for the exclusive use of the **Pazhassiraja College Union Arts Festival**.
- Unauthorized copying, distribution, or modifications of this project via any medium is strictly prohibited.
- Technical support and permissions are restricted to authorized institution personnel only.

> [!TIP]
> **Interested in contributing?** Fork the repo and submit a PR. For major changes, please open an issue first to discuss what you would like to change.
