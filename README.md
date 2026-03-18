# Union Arts PRC

A professional management portal and appeal system for the Union Arts Arts Festival, built with a modern glassmorphic aesthetic and real-time Firebase backend.

## 🚀 Features

- **Admin Dashboard**: Comprehensive control panel for managing students, programs, scores, and system settings.
- **Secretary Hub**: Advanced tools for department secretaries to generate registration links and manage pending entries.
- **Premium Alert System**: Modern, positive-minded pop-up notifications for real-time system feedback and registration updates.
- **Student Registration**: Streamlined flow for individual and group events with embedded real-time limit validation.
- **Appeal Portal**: A dedicated, user-friendly interface for participants to submit appeals with video evidence support.
- **Real-time Leaderboard**: Live-updating results and department-wise standings.
- **Access Control**: Secure authentication with whitelisted access for administrators and secretaries.
- **Registration Control**: Field-level control, chest number drawing, and global registration locking.
- **Program Scheduling**: Dynamic management of competition dates and schedules.

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (Glassmorphism)
- **Backend**: Firebase (Firestore, Authentication, Hosting)
- **Icons**: Font Awesome 6
- **Typography**: Outfit & Inter (Google Fonts)

## 📁 Project Structure

- `/y`: The public web directory containing the application files.
  - `index.html`: Main landing page and primary dashboard.
  - `student.html`: Student-facing registration portal for individual and group events.
  - `admin.html`: Unified administration console for staff and secretaries.
  - `appeal.html`: Participant appeal submission portal.
  - `leaderboard.html`: Public results and standings page.
  - `/assets`: CSS, JS, and image assets organized by section (core, admin, etc.).
- `firebase.json`: Configuration for Firebase Hosting and rules.
- `firestore.rules`: Security rules for Firestore data access.
- `package.json`: Project metadata and dependencies.

## 🔧 Installation & Deployment

1. **Clone the repository**:
   ```bash
   git clone [repository-url]
   ```
2. **Setup Firebase**:
   Ensure you have the Firebase CLI installed and are logged in. Initialize the project with your Firebase project ID.
3. **Deploy to Firebase**:
   ```bash
   firebase deploy
   ```

## 📄 License

This project is developed for the Union Arts PRC. All rights reserved.
