import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Tracks a visitor login event and stores enriched metadata in Firestore.
 * @param {Object} user - Firebase User object
 */
export async function trackVisitor(user) {
    try {
        // 1. Get fundamental browser metadata
        const emailDomain = user.email ? user.email.split('@')[1] : 'Unknown';
        const metadata = {
            userAgent: navigator.userAgent,
            browser: getBrowserInfo(),
            operatingSystem: getOSInfo(),
            device: getDeviceInfo(),
            screenSize: `${window.screen.width}x${window.screen.height}`,
            referrer: document.referrer || 'Direct',
            timestamp: serverTimestamp(),
            email: user.email,
            user_id: user.uid,
            company_domain: emailDomain,
            page_visited: window.location.pathname
        };

        // 2. Fetch IP and Geographic information (using free ipapi.co)
        let geoData = {};
        try {
            const response = await fetch('https://ipapi.co/json/');
            geoData = await response.json();
        } catch (error) {
            console.warn('IP tracking failed or was blocked by browser:', error);
        }

        const enrichedData = {
            ...metadata,
            ip: geoData.ip || 'Unknown',
            country: geoData.country_name || 'Unknown',
            city: geoData.city || 'Unknown',
            organization: geoData.org || 'Unknown',
            isp: geoData.asn || 'Unknown'
        };

        // 3. Save to 'visitor_logs' (Historical event log)
        await addDoc(collection(db, "visitor_logs"), enrichedData);

        // 4. Save to 'users' (Latest state for specific user)
        await setDoc(doc(db, "users", user.uid), {
            ...enrichedData,
            login_timestamp: serverTimestamp()
        }, { merge: true });

        console.log('Visitor session tracked successfully');
    } catch (e) {
        console.error("Error tracking visitor: ", e);
    }
}

// Helpers for browser detection
function getBrowserInfo() {
    const ua = navigator.userAgent;
    if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Edg")) return "Edge";
    return "Unknown Browser";
}

function getOSInfo() {
    const ua = navigator.userAgent;
    if (ua.includes("Win")) return "Windows";
    if (ua.includes("Mac")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
    return "Unknown OS";
}

function getDeviceInfo() {
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) return "Mobile";
    if (/Tablet|iPad/i.test(ua)) return "Tablet";
    return "Desktop";
}
