// Firebase Configuration
// Replace with your values from Firebase Console -> Project Settings -> General -> Web Apps
const firebaseConfig = {
    apiKey: "AIzaSyDmZ0N1IwYj5ENbolYJt10YqJNxl3zVKAE",
    authDomain: "tech-spend-utility.firebaseapp.com",
    projectId: "tech-spend-utility",
    storageBucket: "tech-spend-utility.firebasestorage.app",
    messagingSenderId: "766101035986",
    appId: "1:766101035986:web:d30e519b4c6fcf1c1e460b",
    measurementId: "G-2XY3Y8NVXL"
};

// Admin email for dashboard access
const ADMIN_EMAIL = "vibhorkumar123@gmail.com";

// If you want to use a specific company domain for tracking (optional)
const TARGET_COMPANY_DOMAIN = "yourcompany.com";

// Initialize Firebase once
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, ADMIN_EMAIL, TARGET_COMPANY_DOMAIN };
