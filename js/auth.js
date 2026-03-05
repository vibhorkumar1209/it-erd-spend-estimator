import { auth, ADMIN_EMAIL } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { trackVisitor } from './tracking.js';

const ADMIN_STORAGE_KEY = 'is_admin';

/**
 * CORE AUTHENTICATION FUNCTIONS
 */

export async function loginWithEmail(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await trackVisitor(user);
        handlePostAuth(user);
    } catch (error) {
        throw error;
    }
}

export async function loginWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;
        await trackVisitor(user);
        handlePostAuth(user);
    } catch (error) {
        throw error;
    }
}

export async function logout() {
    try {
        await signOut(auth);
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Logout failed:", error);
    }
}

function handlePostAuth(user) {
    if (user.email === ADMIN_EMAIL) {
        localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
    } else {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
    }
    // Success redirect
    window.location.href = '/app.html';
}

/**
 * AUTH GUARD: PREVENTS UNAUTHORIZED ACCESS
 */
export function checkAuth(requiresAdmin = false) {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // Not logged in -> Login
            window.location.href = 'index.html';
        } else if (requiresAdmin && user.email !== ADMIN_EMAIL) {
            // Logged in but not admin -> App
            alert('Access Denied: Admin privileges required.');
            window.location.href = '/app.html';
        }
    });
}

/**
 * LOGIN STATUS: FOR UI UPDATES
 */
export function onAuthStatus(callback) {
    onAuthStateChanged(auth, callback);
}
