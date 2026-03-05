# Tech Spend Utility - Secure Authentication Layer

This project adds a secure login wall and visitor tracking layer to the existing Tech Spend Utility. It is designed for static hosting on **GitHub Pages** using **Firebase** as the backend for Authentication and Database.

## Features
- **Login Gate**: Secure Email/Password and Google Login.
- **Visitor Tracking**: Captures IP, Geo-location, Browser, Device, and Referrer data.
- **Admin Dashboard**: Visual analytics using Chart.js (protected for admin email).
- **Session Persistence**: Users stay logged in across sessions.
- **GDPR Ready**: Built-in simple cookie/privacy consent banner.

---

## 🚀 Installation & Setup

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new project (e.g., "Tech Spend Tracker").
3. Disable Google Analytics (optional, we use our own tracking).

### 2. Enable Authentication
1. Go to **Build > Authentication**.
2. Click **Get Started**.
3. Enable **Email/Password** and **Google** as Sign-in providers.
4. For Google, you will need to provide a public-facing name and support email.

### 3. Enable Cloud Firestore
1. Go to **Build > Firestore Database**.
2. Click **Create Database**.
3. Start in **Production Mode** (ensure rules allow authenticated reads/writes).
4. Select a location near your target users.

### 4. Firestore Security Rules
Go to the **Rules** tab in Firestore and paste the following to allow tracking and admin access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow any authenticated user to write their own log and create visitor events
    match /visitor_logs/{logId} {
      allow create: if request.auth != null;
      allow read: if request.auth.token.email == 'YOUR_ADMIN_EMAIL@domain.com';
    }
    match /users/{userId} {
      allow write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth.token.email == 'YOUR_ADMIN_EMAIL@domain.com';
    }
  }
}
```
*Note: Replace `YOUR_ADMIN_EMAIL@domain.com` with your actual admin email.*

### 5. Configure the Application
Open `js/firebase-config.js` and:
1. Copy your Firebase Web App configuration keys (found in Project Settings > General > Your Apps).
2. Set your `ADMIN_EMAIL` to the email you used for Firestore rules.

---

## 🛠 Deployment to GitHub Pages

### Moving your existing Tech Spend Utility
Your existing "Tech Spend Utility" is likely a Vite/React app. To protect it:
1. Run `npm run build` in your `web-app` folder.
2. The output will be in the `dist` folder.
3. Open `app.html` in the root of this project.
4. Replace the sample content in the `#root` div with your built app's HTML.
5. Ensure the `<script>` tags in `app.html` point to your JS bundles (usually in `/assets/`).

### Pushing to GitHub
1. Commit all files (including `login.html`, `app.html`, `admin.html`, `/js`, and `/css`).
2. Push to your GitHub repository.
3. Go to **Settings > Pages**.
4. Select `main` branch (and `/root` folder if everything is in the root).
5. Your app should now be live at `https://[username].github.io/[repo-name]/login.html`.

---

## 📊 Accessing Analytics
Visit your deployment URL ended with `/admin.html`. 
- Ensure you are logged in with the email defined in `js/firebase-config.js` as `ADMIN_EMAIL`.
- The dashboard will show real-time visitor logs and aggregate metrics.

## 🛡 Disclaimer
Ensure your use of IP and location tracking complies with your local data privacy regulations (GDPR/CCPA). The privacy banner provided should be updated based on your specific requirements.
