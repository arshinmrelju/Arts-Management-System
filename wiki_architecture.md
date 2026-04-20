<p align="center">
  <img src="https://raw.githubusercontent.com/arshinmrelju/unionprc/master/y/assets/Pazhassiraja_College_Pulpally_Logo.png" alt="Pazhassiraja College Logo" width="120">
</p>

# System Architecture & Technical Deep Dive

The **Union Arts Festival Management System** is a serverless web application designed for high concurrency and real-time data synchronization.

---

## 🏛️ Technology Stack

- **Cloud Platform**: Firebase
- **Database**: Cloud Firestore (NoSQL, Real-time)
- **Hosting**: Firebase Hosting
- **Media Storage**: Firebase Storage (for Appeal evidence and assets)
- **Frontend**: Single Page Application (SPA) architecture using Vanilla JS and CSS3.

---

## 🗄️ Database Schema (Firestore)

The system uses a flat collection structure for performance and simplicity:

| Collection | Purpose |
| :--- | :--- |
| `registrations` | Main student enrollment data, status, and chest numbers. |
| `program_dates` | Scheduling data for all events (Time, Venue, Status). |
| `leaderboard` | Aggregated points for each department. |
| `admin_users` | Authorized email addresses for administrative access. |
| `whitelisted_emails` | Department secretaries authorized to manage specific years. |
| `appeals` | Grievance submissions with video links and resolution logs. |
| `news` | Content for the real-time notification/announcement bar. |
| `settings` | Global config (e.g., current academic year, festival name). |

---

## 🔐 Security & Authentication

### Authentication
The system uses **Firebase Authentication** (primarily Google Login). Access is granted based on email address matching.

### Firestore Rules
Fine-grained security is enforced at the database level:
- **Admin Access**: Hardcoded super-admin emails and lookups in the `admin_users` collection.
- **Secretary Access**: Checked via the `whitelisted_emails` collection, scoped by `academicYear`.
- **Public Read**: Leaderboards and News are globally readable for transparency.

---

## 🎨 UI/UX Philosophy: Glassmorphism

The system adheres to a **Glassmorphic** design language:
- **Translucency**: Use of `backdrop-filter: blur()` to create depth.
- **Layering**: Vivid colors behind frosted glass panels to emphasize Hierarchy.
- **Micro-animations**: CSS transitions on hover and state changes to provide instant feedback.
- **Responsiveness**: A mobile-first approach ensuring that the Stage Manager and Leaderboard work flawlessly on handheld devices.

---

## ⚙️ Core Logic Components

### Lottery Drawing
The lottery logic is client-side but synchronized via Firestore to ensure all observers (Stage Manager and Spectators) see the same results instantly.

### Scoring Algorithm
Scores are processed through `pending_results` before being committed to the main `score_logs` and `leaderboard`, allowing for a "review and publish" workflow.
