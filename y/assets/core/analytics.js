import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { firebaseConfig } from "/assets/core/firebase-config.js";

// Initialize Firebase for analytics
// We use a specific app name to avoid conflicting with the main app if it's already initialized
const analyticsApp = initializeApp(firebaseConfig, "Analytics_App");
const db = getFirestore(analyticsApp);

async function logVisitor() {
    try {
        // 1. Fetch IP Address
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        const ipAddress = ipData.ip || "Unknown IP";

        // 2. Gather Device Info
        const userAgent = navigator.userAgent;
        let deviceName = "Unknown Device";
        
        if (/windows phone/i.test(userAgent)) { deviceName = "Windows Phone"; }
        else if (/android/i.test(userAgent)) { deviceName = "Android"; }
        else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) { deviceName = "iOS"; }
        else if (/Macintosh/.test(userAgent)) { deviceName = "Mac OS"; }
        else if (/Windows/.test(userAgent)) { deviceName = "Windows PC"; }
        else if (/Linux/.test(userAgent)) { deviceName = "Linux"; }

        // 3. Get Current Page
        const pageVisited = window.location.pathname.split('/').pop() || 'index.html';

        // 4. Save to Firestore
        const docRef = await addDoc(collection(db, "visitor_logs"), {
            ip: ipAddress,
            device: deviceName,
            userAgent: userAgent,
            page: pageVisited,
            timestamp: serverTimestamp()
        });


    } catch (error) {
        // Silently fail - tracking shouldn't break the user experience
        console.warn("Analytics tracking failed:", error.message);
    }
}

// Execute the tracking function once the DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', logVisitor);
} else {
    logVisitor();
}
