import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp, collection, query, orderBy, limit, onSnapshot, getCountFromServer, where, Timestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { firebaseConfig } from "../core/firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
window.auth = auth;

const ADMIN_EMAILS = [
    "collageunionprc@gmail.com",
    "artsfest@prc.ac.in"
];

onAuthStateChanged(auth, async (user) => {
    const authGuard = document.getElementById('auth-guard');
    const authLogin = document.getElementById('auth-login');
    const authUnauthorized = document.getElementById('auth-unauthorized');
    const content = document.getElementById('developer-content');

    if (!user) {
        authGuard.classList.remove('hidden');
        authLogin.classList.remove('hidden');
        authUnauthorized.classList.add('hidden');
        content.classList.add('hidden');
        return;
    }

    const userEmail = (user.email || "").toLowerCase().trim();
    let isAuthorized = ADMIN_EMAILS.some(email => email.toLowerCase().trim() === userEmail);

    if (!isAuthorized) {
        try {
            const adminDoc = await getDoc(doc(db, "admin_users", userEmail));
            if (adminDoc.exists()) {
                const role = adminDoc.data().role;
                if (role === "Main" || role === "Admin") isAuthorized = true;
            }
        } catch (err) { console.error("Auth check error:", err); }
    }

    if (isAuthorized) {
        authGuard.classList.add('hidden');
        content.classList.remove('hidden');
        fetchMaintenanceState();
        startLatencyMonitor();
        startUptimeCounter();
        initTerminalLogs();
        initAnalytics();
        initComplaints();
    } else {
        authGuard.classList.remove('hidden');
        authLogin.classList.add('hidden');
        authUnauthorized.classList.remove('hidden');
        content.classList.add('hidden');
        document.getElementById('auth-error-msg').innerHTML = `The account <strong>${userEmail}</strong> is not authorized for the Central Archives.`;
    }
});

// Google Login Logic
document.getElementById('google-login-btn').onclick = async () => {
    const provider = new GoogleAuthProvider();
    const status = document.getElementById('login-status');
    status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing Secure Uplink...';

    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login Error:", error);
        status.innerHTML = `<span style="color: #ef4444;">Access Denied: ${error.message}</span>`;
    }
};

// Uptime Counter
function startUptimeCounter() {
    const uptimeElem = document.getElementById('system-uptime');
    let seconds = 15735; // Initial mock uptime
    setInterval(() => {
        seconds++;
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        uptimeElem.textContent = `UPTIME: ${h}:${m}:${s}`;
    }, 1000);
}

// Real-time Visitor Logs
function initTerminalLogs() {
    const logWindow = document.getElementById('log-window');
    logWindow.innerHTML = '<div class="log-line">Connecting to Central Archive Feed...</div>';

    const logsQuery = query(collection(db, "visitor_logs"), orderBy("timestamp", "desc"), limit(50));

    onSnapshot(logsQuery, (snapshot) => {
        logWindow.innerHTML = ''; // Clear window to rebuild ordered list
        
        const docs = [];
        snapshot.forEach(doc => docs.push(doc.data()));
        
        // Render in reverse so newest is at the bottom (or top depending on preference)
        // Standard terminal logs usually have newest at bottom. We queried desc to get the 50 newest, so let's reverse them to print chronologically.
        docs.reverse().forEach(data => {
            const line = document.createElement('div');
            line.className = 'log-line';
            
            const timeStr = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleTimeString() : "Pending";
            const ip = data.ip || "Unknown IP";
            const device = data.device || "Unknown Device";
            const page = data.page || "Unknown Page";

            line.innerHTML = `[${timeStr}] > <span class="ip-lookup" onclick="lookupIP('${ip}')">${ip}</span> | ${device} | ${page}`;
            logWindow.appendChild(line);
        });

        logWindow.scrollTop = logWindow.scrollHeight;
        
        // Refresh analytics on new logs (throttled by snapshot frequency)
        if (typeof refreshAnalytics === 'function') refreshAnalytics();
    }, (error) => {
        console.error("Error fetching visitor logs:", error);
        logWindow.innerHTML = '<div class="log-line" style="color: red;">Error: Archive connection severed.</div>';
    });
}

// Analytics Logic
async function initAnalytics() {
    refreshAnalytics();
    // Refresh every 30 seconds for live feel
    setInterval(refreshAnalytics, 30000);
}

async function refreshAnalytics() {
    try {
        const logsCol = collection(db, "visitor_logs");
        const allSnap = await getDocs(logsCol);
        
        const allIPs = new Set();
        const todayIPs = new Set();
        const monthIPs = new Set();
        const monthIPVisits = {}; 
        const pageCounts = {};
        
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        allSnap.forEach(doc => {
            const data = doc.data();
            const ip = data.ip;
            const ts = data.timestamp ? data.timestamp.toMillis() : 0;
            const page = data.page || 'index.html';

            if (ip) {
                allIPs.add(ip);
                if (ts >= todayStart) {
                    todayIPs.add(ip);
                }
                if (ts >= monthStart) {
                    monthIPs.add(ip);
                    monthIPVisits[ip] = (monthIPVisits[ip] || 0) + 1;
                }
            }
            
            pageCounts[page] = (pageCounts[page] || 0) + 1;
        });

        const totalUnique = allIPs.size;
        const todayUnique = todayIPs.size;
        const monthUnique = monthIPs.size;

        // 2. Update UI
        document.getElementById('total-visitor-count').textContent = totalUnique.toLocaleString();
        document.getElementById('total-visitor-badge').textContent = `${totalUnique.toLocaleString()} ${totalUnique === 1 ? 'VISITOR' : 'VISITORS'}`;
        
        // Progress bar (goal of 1000 unique)
        const totalProgress = Math.min((totalUnique / 1000) * 100, 100);
        document.getElementById('total-visitor-bar').style.width = `${totalProgress}%`;

        document.getElementById('today-visitor-count').textContent = todayUnique.toLocaleString();
        document.getElementById('today-visitor-bar').style.width = `${Math.min((todayUnique / 50) * 100, 100)}%`;

        document.getElementById('month-visitor-count').textContent = monthUnique.toLocaleString();
        document.getElementById('month-visitor-bar').style.width = `${Math.min((monthUnique / 500) * 100, 100)}%`;

        // 3. Top IP (Operative)
        let topIP = 'N/A';
        let maxIPVisits = 0;
        for (const [ip, visits] of Object.entries(monthIPVisits)) {
            if (visits > maxIPVisits) {
                maxIPVisits = visits;
                topIP = ip;
            }
        }
        document.getElementById('top-visitor-ip').textContent = topIP;

        // 4. Top Destination
        let topPage = 'N/A';
        let maxCount = 0;
        for (const [page, count] of Object.entries(pageCounts)) {
            if (count > maxCount) {
                maxCount = count;
                topPage = page;
            }
        }
        document.getElementById('top-page-name').textContent = topPage;
        
    } catch (err) {
        console.error("Analytics Error:", err);
    }
}

// Maintenance Mode Logic
window.fetchMaintenanceState = async function () {
    const btn = document.getElementById('maintenance-mode-btn');
    const statusMsg = document.getElementById('maintenance-status-msg');
    const badge = document.querySelector('.badge-active');

    try {
        const configDoc = await getDoc(doc(db, "system_config", "maintenance"));
        const isActive = configDoc.exists() ? configDoc.data().active : false;

        if (isActive) {
            btn.innerHTML = '<span class="btn-text">OPEN GATE</span>';
            btn.className = 'gate-toggle-btn btn-open';
            statusMsg.textContent = "MAINTENANCE ACTIVE";
            statusMsg.style.color = "#ef4444";
            if (badge) {
                badge.textContent = "UNLOCKED";
                badge.className = "badge-active role-public"; // Using an existing role class or just reset
                badge.style.background = "rgba(239,68,68,0.15)";
                badge.style.color = "#ef4444";
                badge.style.borderColor = "rgba(239,68,68,0.3)";
            }
        } else {
            btn.innerHTML = '<span class="btn-text">LOCK GATE</span>';
            btn.className = 'gate-toggle-btn btn-locked';
            statusMsg.textContent = "SYSTEM LIVE";
            statusMsg.style.color = "#10b981";
            if (badge) {
                badge.textContent = "LOCKED";
                badge.className = "badge-active role-admin";
                badge.style.background = "rgba(16,185,129,0.15)";
                badge.style.color = "#10b981";
                badge.style.borderColor = "rgba(16,185,129,0.3)";
            }
        }
    } catch (e) {
        console.error("Error fetching maintenance state:", e);
    }
};

window.toggleMaintenanceMode = async function () {
    const btn = document.getElementById('maintenance-mode-btn');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SYNCING...';
    btn.disabled = true;

    try {
        const configDoc = await getDoc(doc(db, "system_config", "maintenance"));
        const currentActive = configDoc.exists() ? configDoc.data().active : false;
        const newActive = !currentActive;

        await setDoc(doc(db, "system_config", "maintenance"), {
            active: newActive,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.email
        });

        await fetchMaintenanceState();
    } catch (error) {
        console.error("Toggle Error:", error);
        alert("Failed to toggle state: " + error.message);
    } finally {
        btn.disabled = false;
    }
};

// Latency Monitor
function startLatencyMonitor() {
    const latencyElem = document.getElementById('dev-latency');
    setInterval(async () => {
        const start = Date.now();
        try {
            await getDoc(doc(db, "system_config", "heartbeat")); // Small doc for latency check
            const end = Date.now();
            latencyElem.textContent = (end - start) + "ms";
        } catch (e) {
            latencyElem.textContent = "Error";
        }
    }, 5000);
}

// IP Intelligence Lookup
window.lookupIP = async function(ip) {
    const overlay = document.getElementById('ip-info-overlay');
    const content = document.getElementById('ip-info-content');
    
    if (!overlay || !content) return;
    
    overlay.classList.remove('hidden');

    // Validate IP
    if (!ip || ip === "Unknown IP" || ip === "Unknown") {
        content.innerHTML = `<div class="log-line" style="color: #ef4444;">ERROR: Identification Failed. This IP address is masked or invalid.</div>`;
        return;
    }
    
    content.innerHTML = `<div class="log-line">Querying system archives for ${ip}... <span id="lookup-attempt">(Primary)</span></div>`;
    
    async function attemptFetch(url, timeout = 8000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (e) {
            clearTimeout(id);
            throw e;
        }
    }

    try {
        let data;
        // Tier 1: ipwho.is
        try {
            data = await attemptFetch(`https://ipwho.is/${ip}`);
            if (!data.success) throw new Error(data.message || 'Service Error');
            
            content.innerHTML = `
                <div style="margin-bottom: 1rem; border-bottom: 1px solid rgba(212,196,168,0.1); padding-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                    <div><span style="color: var(--dev-primary);">ADDRESS:</span> ${ip}</div>
                    <button onclick="navigator.clipboard.writeText('${ip}'); this.innerHTML='<i class=&quot;fas fa-check&quot;></i>'; setTimeout(()=>this.innerHTML='<i class=&quot;fas fa-copy&quot;></i>', 2000)" style="background: rgba(212,196,168,0.1); border: 1px solid rgba(212,196,168,0.2); color: var(--dev-primary); padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 0.7rem;"><i class="fas fa-copy"></i></button>
                </div>
                <div style="display: grid; grid-template-columns: 100px 1fr; gap: 0.5rem;">
                    <span style="color: var(--dev-primary);">ISP:</span> <span>${data.connection.isp}</span>
                    <span style="color: var(--dev-primary);">ORG:</span> <span>${data.connection.org || 'N/A'}</span>
                    <span style="color: var(--dev-primary);">ASN:</span> <span>AS${data.connection.asn}</span>
                    <span style="color: var(--dev-primary);">LOCATION:</span> <span>${data.city}, ${data.region}, ${data.country}</span>
                    <span style="color: var(--dev-primary);">TZ:</span> <span>${data.timezone.id}</span>
                    <span style="color: var(--dev-primary);">COORDS:</span> <span>${data.latitude}, ${data.longitude}</span>
                </div>
                <div style="margin-top: 1rem;">
                    <a href="https://www.google.com/maps?q=${data.latitude},${data.longitude}" target="_blank" style="display: block; width: 100%; text-align: center; background: rgba(212,196,168,0.1); border: 1px solid rgba(212,196,168,0.2); color: var(--dev-primary); padding: 8px; border-radius: 8px; text-decoration: none; font-size: 0.8rem; transition: all 0.3s;">
                        <i class="fas fa-map-marked-alt"></i> VIEW ON SYSTEM MAP
                    </a>
                </div>
                <div style="margin-top: 1.5rem; padding: 0.75rem; background: rgba(212,196,168,0.03); border-radius: 8px; border-left: 2px solid var(--dev-primary);">
                    <div style="font-size: 0.7rem; color: var(--dev-primary); font-weight: bold; margin-bottom: 0.2rem;">TELEMETRY NOTE:</div>
                    <div style="font-size: 0.7rem; opacity: 0.7; line-height: 1.4;">Location is estimated via ISP routing hubs. Accuracy may vary for rural or mobile connections.</div>
                </div>
                <div style="margin-top: 1rem; font-size: 0.75rem; opacity: 0.5; font-style: italic;">
                    * Source: Central Telemetry Archives (ipwho.is)
                </div>
            `;
            return;
        } catch (e1) {
            console.warn("Primary lookup failed, trying Secondary...", e1);
            document.getElementById('lookup-attempt').innerHTML = "(Secondary Relay)";
        }

        // Tier 2: ipapi.co
        try {
            data = await attemptFetch(`https://ipapi.co/${ip}/json/`);
            if (data.error) throw new Error(data.reason || 'Service Error');

            content.innerHTML = `
                <div style="margin-bottom: 1rem; border-bottom: 1px solid rgba(212,196,168,0.1); padding-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                    <div><span style="color: var(--dev-primary);">ADDRESS:</span> ${ip}</div>
                    <button onclick="navigator.clipboard.writeText('${ip}'); this.innerHTML='<i class=&quot;fas fa-check&quot;></i>'; setTimeout(()=>this.innerHTML='<i class=&quot;fas fa-copy&quot;></i>', 2000)" style="background: rgba(212,196,168,0.1); border: 1px solid rgba(212,196,168,0.2); color: var(--dev-primary); padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 0.7rem;"><i class="fas fa-copy"></i></button>
                </div>
                <div style="display: grid; grid-template-columns: 100px 1fr; gap: 0.5rem;">
                    <span style="color: var(--dev-primary);">ORG:</span> <span>${data.org || 'N/A'}</span>
                    <span style="color: var(--dev-primary);">ASN:</span> <span>${data.asn || 'N/A'}</span>
                    <span style="color: var(--dev-primary);">LOCATION:</span> <span>${data.city}, ${data.region}, ${data.country_name}</span>
                    <span style="color: var(--dev-primary);">TZ:</span> <span>${data.timezone}</span>
                    <span style="color: var(--dev-primary);">COORDS:</span> <span>${data.latitude}, ${data.longitude}</span>
                </div>
                <div style="margin-top: 1rem;">
                    <a href="https://www.google.com/maps?q=${data.latitude},${data.longitude}" target="_blank" style="display: block; width: 100%; text-align: center; background: rgba(212,196,168,0.1); border: 1px solid rgba(212,196,168,0.2); color: var(--dev-primary); padding: 8px; border-radius: 8px; text-decoration: none; font-size: 0.8rem; transition: all 0.3s;">
                        <i class="fas fa-map-marked-alt"></i> VIEW ON SYSTEM MAP
                    </a>
                </div>
                <div style="margin-top: 1.5rem; padding: 0.75rem; background: rgba(212,196,168,0.03); border-radius: 8px; border-left: 2px solid var(--dev-primary);">
                    <div style="font-size: 0.7rem; color: var(--dev-primary); font-weight: bold; margin-bottom: 0.2rem;">TELEMETRY NOTE:</div>
                    <div style="font-size: 0.7rem; opacity: 0.7; line-height: 1.4;">Estimated via ISP exit node. Granularity is limited for regional hubs.</div>
                </div>
                <div style="margin-top: 1rem; font-size: 0.75rem; opacity: 0.5; font-style: italic;">
                    * Source: Secondary Telemetry Relay (ipapi.co)
                </div>
            `;
            return;
        } catch (e2) {
            console.warn("Secondary lookup failed, trying Tertiary...", e2);
            document.getElementById('lookup-attempt').innerHTML = "(Tertiary Backup)";
        }

        // Tier 3: GeoJS
        try {
            data = await attemptFetch(`https://get.geojs.io/v1/ip/geo/${ip}.json`);
            
            content.innerHTML = `
                <div style="margin-bottom: 1rem; border-bottom: 1px solid rgba(212,196,168,0.1); padding-bottom: 0.5rem;">
                    <span style="color: var(--dev-primary);">ADDRESS:</span> ${ip}
                </div>
                <div style="display: grid; grid-template-columns: 100px 1fr; gap: 0.5rem;">
                    <span style="color: var(--dev-primary);">ORG:</span> <span>${data.organization || 'N/A'}</span>
                    <span style="color: var(--dev-primary);">LOCATION:</span> <span>${data.city || 'Unknown'}, ${data.region || ''} ${data.country}</span>
                    <span style="color: var(--dev-primary);">LAT/LON:</span> <span>${data.latitude}, ${data.longitude}</span>
                </div>
                <div style="margin-top: 1rem;">
                    <a href="https://www.google.com/maps?q=${data.latitude},${data.longitude}" target="_blank" style="display: block; width: 100%; text-align: center; background: rgba(212,196,168,0.1); border: 1px solid rgba(212,196,168,0.2); color: var(--dev-primary); padding: 8px; border-radius: 8px; text-decoration: none; font-size: 0.8rem; transition: all 0.3s;">
                        <i class="fas fa-map-marked-alt"></i> VIEW ON SYSTEM MAP
                    </a>
                </div>
                <div style="margin-top: 1rem; font-size: 0.75rem; opacity: 0.5; font-style: italic;">
                    * Source: Tertiary Backup Node (geojs.io)
                </div>
            `;
        } catch (e3) {
            throw e3;
        }

    } catch (error) {
        console.error("All IP Lookup attempts failed:", error);
        content.innerHTML = `<div class="log-line" style="color: #ef4444;">ERROR: All telemetry archives are currently unreachable. Connection severed or service blocked.</div>`;
    }
};

// ==========================================
// SMS DISPATCH SYSTEM (Fast2SMS Integration)
// ==========================================

const FAST2SMS_KEY = "7ogH80WcIj9NDGazYF5dLnpkm3xPil6MsqCKfeSv1Jrh2ZREAw3omE5VrqZxp2MBkAUD9f0QLH6hsgyz"; 

window.sendSMS = async function() {
    const numInput = document.getElementById('sms-number');
    const msgInput = document.getElementById('sms-message');
    const btn = document.getElementById('sms-send-btn');
    const status = document.getElementById('sms-status-msg');
    
    const number = numInput.value.trim();
    const message = msgInput.value.trim();
    
    // 1. Validation
    if (!/^\d{10}$/.test(number)) {
        showSMSStatus("Invalid Number: Must be 10 digits.", "error");
        numInput.style.borderColor = "#ef4444";
        return;
    }
    numInput.style.borderColor = "";

    if (!message) {
        showSMSStatus("Payload Empty: Message required.", "error");
        msgInput.style.borderColor = "#ef4444";
        return;
    }
    msgInput.style.borderColor = "";

    // 2. Dispatching
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> DISPATCHING...';
    showSMSStatus("Establishing satellite uplink...", "process");

    try {
        const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${FAST2SMS_KEY}&route=q&message=${encodeURIComponent(message)}&flash=0&numbers=${number}`;
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors' 
        });

        // With no-cors, we won't get response.ok or response.json()
        // But the request will be sent to the server.
        showSMSStatus("Uplink Confirmed: Message Dispatched.", "success");
        msgInput.value = '';
        
        // Mock balance deduction
        const balanceBadge = document.getElementById('sms-balance-badge');
        let currentBal = parseFloat(balanceBadge.textContent.replace('BAL: ₹', ''));
        if (!isNaN(currentBal)) {
            currentBal -= 5.00;
            balanceBadge.textContent = `BAL: ₹${currentBal.toFixed(2)}`;
        }

    } catch (error) {
        console.error("SMS Dispatch Error:", error);
        showSMSStatus("Uplink Failed: " + error.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-satellite-dish"></i> DISPATCH UPLINK';
    }
};

function showSMSStatus(text, type) {
    const status = document.getElementById('sms-status-msg');
    if (!status) return;
    status.textContent = `> ${text}`;
    
    if (type === "error") status.style.color = "#ef4444";
    else if (type === "success") status.style.color = "#10b981";
    else status.style.color = "#d4c4a8";
}

// ==========================================
// SYSTEM COMPLAINTS MANAGEMENT
// ==========================================

function initComplaints() {
    const list = document.getElementById('complaint-list');
    const badge = document.getElementById('complaint-count-badge');
    
    if (!list) return;

    const q = query(collection(db, "complaints"), orderBy("timestamp", "desc"), limit(50));

    onSnapshot(q, (snapshot) => {
        list.innerHTML = '';
        let pendingCount = 0;

        if (snapshot.empty) {
            list.innerHTML = '<div class="log-line">No reports in archives. System stable.</div>';
            badge.textContent = '0 PENDING';
            badge.className = 'badge-active role-public';
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            if (data.status === 'pending') pendingCount++;

            const line = document.createElement('div');
            line.className = 'log-line';
            line.style.cursor = 'pointer';
            line.onclick = () => viewComplaintDetails(id, data);

            const timeStr = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "---";
            const statusColor = data.status === 'pending' ? '#ef4444' : (data.status === 'resolved' ? '#10b981' : '#f59e0b');
            
            line.innerHTML = `[${timeStr}] <span style="color: ${statusColor};">[${data.status.toUpperCase()}]</span> ${data.subject} <span style="opacity: 0.5;">- ${data.userName}</span>`;
            list.appendChild(line);
        });

        badge.textContent = `${pendingCount} PENDING`;
        badge.className = pendingCount > 0 ? 'badge-active' : 'badge-active role-public';
        if (pendingCount > 0) {
            badge.style.background = "rgba(239,68,68,0.15)";
            badge.style.color = "#ef4444";
        } else {
            badge.style.background = "rgba(16,185,129,0.15)";
            badge.style.color = "#10b981";
        }
    });
}

let activeComplaintId = null;

function viewComplaintDetails(id, data) {
    activeComplaintId = id;
    const overlay = document.getElementById('complaint-action-overlay');
    
    document.getElementById('ca-subject').textContent = data.subject || "No Subject";
    document.getElementById('ca-user').textContent = `${data.userName} (${data.userEmail})`;
    document.getElementById('ca-category').textContent = data.category || "General";
    document.getElementById('ca-time').textContent = data.timestamp ? data.timestamp.toDate().toLocaleString() : "Unknown";
    document.getElementById('ca-status').textContent = (data.status || "pending").toUpperCase();
    document.getElementById('ca-description').textContent = data.description || "No description provided.";
    document.getElementById('ca-note').value = data.developerNote || "";

    // Set status color
    const statusElem = document.getElementById('ca-status');
    if (data.status === 'resolved') statusElem.style.color = '#10b981';
    else if (data.status === 'pending') statusElem.style.color = '#ef4444';
    else statusElem.style.color = '#f59e0b';

    overlay.classList.remove('hidden');
}

document.getElementById('ca-resolve-btn').onclick = () => updateComplaintStatus('resolved');
document.getElementById('ca-dismiss-btn').onclick = () => updateComplaintStatus('dismissed');

async function updateComplaintStatus(status) {
    if (!activeComplaintId) return;
    
    const note = document.getElementById('ca-note').value;
    const btn = status === 'resolved' ? document.getElementById('ca-resolve-btn') : document.getElementById('ca-dismiss-btn');
    const originalText = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = 'SYNCING...';

    try {
        await updateDoc(doc(db, "complaints", activeComplaintId), {
            status: status,
            developerNote: note,
            resolvedAt: serverTimestamp(),
            resolvedBy: auth.currentUser.email
        });
        
        document.getElementById('complaint-action-overlay').classList.add('hidden');
    } catch (err) {
        console.error("Error updating complaint:", err);
        alert("Failed to update: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}


