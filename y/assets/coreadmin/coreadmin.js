import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, getDoc, getDocs, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit, doc, deleteDoc, updateDoc, setDoc, where, writeBatch } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getDatabase, ref, onValue, query as dbQuery, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { firebaseConfig } from "../core/firebase-config.js";
import { handleEmailAuth, handleForgotPassword, handleGoogleAuth } from "../core/portal-auth-helper.js";

// Config imported above

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const auth = getAuth(app);
const id = (i) => document.getElementById(i);

let ROLE_PERMISSIONS = {
    'Admin': ['registrations', 'leaderboard', 'whitelist', 'dates', 'settings', 'review', 'deleted', 'chest', 'appeals', 'certificates', 'results-review'],
    'Main': ['registrations', 'leaderboard', 'whitelist', 'dates', 'settings', 'review', 'deleted', 'chest', 'appeals', 'certificates', 'results-review'],
    'Sub': ['registrations', 'leaderboard', 'review', 'dates', 'appeals'],
    'Leaderboard': ['leaderboard', 'review', 'results-review'],
    'Chest': ['chest'],
    'Stage Manager': ['leaderboard', 'dates']
};

const ALL_MODULES_LABELS = {
    'registrations': 'Registrations Management',
    'leaderboard': 'Global Leaderboard',
    'whitelist': 'Access Control (Whitelist)',
    'dates': 'Program Schedules',
    'settings': 'System Settings',
    'review': 'Scores Verification',
    'deleted': 'Trash Recovery',
    'chest': 'Chest Numbering',
    'appeals': 'Grievance Appeals',
    'certificates': 'Certificate Engine',
    'results-review': 'Provisional Results'
};

const ADMIN_EMAILS = [
    "collageunionprc@gmail.com",
    "artsfest@prc.ac.in"
];

const ALL_MODULES = Object.entries(ALL_MODULES_LABELS).map(([id, name]) => ({ id, name }));

onAuthStateChanged(auth, async (user) => {
    const loginView = id('login-view');
    const restrictedView = id('restricted-view');
    const dashboardWrapper = id('dashboard-wrapper');
    const loginStatus = id('status-message');

    if (!user) {
        console.log("No user session. Showing login.");
        loginView.classList.remove('hidden');
        restrictedView.classList.add('hidden');
        dashboardWrapper.classList.add('hidden');
        return;
    }

    const userEmail = (user.email || "").toLowerCase().trim();
    loginView.classList.add('hidden');

    // Check Authorization
    let isAuthorized = ADMIN_EMAILS.some(email => email.toLowerCase().trim() === userEmail);

    if (!isAuthorized) {
        try {
            const adminDoc = await getDoc(doc(db, "admin_users", userEmail));
            if (adminDoc.exists()) {
                const role = adminDoc.data().role;
                if (role === "Main" || role === "Admin") isAuthorized = true;
            } else {
                const q = query(collection(db, "admin_users"), where("email", "==", userEmail));
                const qSnap = await getDocs(q);
                if (!qSnap.empty) {
                    const role = qSnap.docs[0].data().role;
                    if (role === "Main" || role === "Admin") isAuthorized = true;
                }
            }
        } catch (err) { console.error("Auth check error:", err); }
    }

    if (isAuthorized) {
        console.log("Authorized:", userEmail);
        restrictedView.classList.add('hidden');
        dashboardWrapper.classList.remove('hidden');

        // Initialize App
        fetchAdmins();
        fetchSystemYear();
        fetchArtsIdentity();
        fetchCertificateSettings();
        fetchPayments();
        calculateProjectUsage(); // Added this call

        return;
    }

    // Unauthorized - Show restricted view instead of redirecting
    console.warn("Restricted:", userEmail);
    id('restricted-email-msg').innerHTML = `The account <strong>${userEmail}</strong> is not authorized for the Command Center.`;
    restrictedView.classList.remove('hidden');
    dashboardWrapper.classList.add('hidden');
});

// Independent Login Logic
const emailAuthForm = id('email-auth-form');
if (emailAuthForm) {
    emailAuthForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = id('auth-email-input')?.value.trim();
        const password = id('auth-password-input')?.value;
        const status = id('status-message');
        await handleEmailAuth(auth, email, password, status);
    });
}

const forgotLink = id('forgot-password-link');
if (forgotLink) {
    forgotLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = id('auth-email-input')?.value.trim();
        const status = id('status-message');
        await handleForgotPassword(auth, email, status);
    });
}

const googleBtn = id('google-login-btn');
if (googleBtn) {
    googleBtn.onclick = async () => {
        const provider = new GoogleAuthProvider();
        const status = id('status-message');
        await handleGoogleAuth(auth, provider, status);
    };
}

// Logout Logic
id('logout-btn').onclick = () => {
    if (confirm("Are you sure you want to sign out?")) {
        signOut(auth);
    }
};

// System Year Management
window.fetchSystemYear = async function () {
    const yearInput = document.getElementById('system-year-input');
    const yearStatus = document.getElementById('year-status');

    try {
        const yearDoc = await getDoc(doc(db, "system_config", "current_year"));

        if (yearDoc.exists()) {
            const data = yearDoc.data();
            const year = data.year || "2025-26";

            yearInput.value = year;

            const updatedBy = data.updatedBy || "System";
            const updatedAt = data.updatedAt ? new Date(data.updatedAt.toDate()).toLocaleDateString() : "Unknown";
            const prevYear = data.previousYear;
            const recordsWrapped = data.recordsWrapped;

            let extraInfo = "";
            if (prevYear) {
                extraInfo = ` &nbsp;|&nbsp; <span style="color: #a78bfa;"><i class="fas fa-archive"></i> Archived: <strong>${prevYear}</strong>${recordsWrapped ? ` (${recordsWrapped} records)` : ''}</span>`;
            }

            yearStatus.innerHTML = `<i class="fas fa-check-circle" style="color: var(--accent-color);"></i> Active: <strong>${year}</strong> &nbsp;·&nbsp; Updated by ${updatedBy} on ${updatedAt}${extraInfo}`;

            // Update wrap-target-year-select default to previous year if available
            const wrapSelect = document.getElementById('wrap-target-year-select');
            if (wrapSelect && prevYear) {
                // Try to select the previous year in dropdown
                for (const opt of wrapSelect.options) {
                    if (opt.value === prevYear) {
                        opt.selected = true;
                        break;
                    }
                }
            }
        } else {
            // No year set, use default
            yearInput.value = "2025-26";
            yearStatus.innerHTML = `<i class="fas fa-info-circle" style="color: #f59e0b;"></i> No year configured. Click "Save Config" to set it.`;
        }
    } catch (error) {
        console.error("Error fetching system year:", error);
        yearStatus.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> Error loading year: ${error.message}`;
        yearInput.value = "2025-26"; // Fallback
    }
};

const ALL_EVENT_COLLECTIONS = [
    'registrations',
    'score_logs',
    'leaderboard',
    'program_dates',
    'whitelisted_emails',
    'pending_registrations',
    'appeals',
    'pending_results',
    'chest_series_configs',
    'registration_links'
];

// Helper to atomically wrap untagged or previous records to a target academic year
async function wrapAllLegacyData(targetYear, onProgress) {
    let grandTotal = 0;

    for (const collName of ALL_EVENT_COLLECTIONS) {
        try {
            const q = query(collection(db, collName));
            const snapshot = await getDocs(q);

            let docsToWrap = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                // If the document is missing academicYear, wrap it to targetYear
                if (!data.academicYear) {
                    docsToWrap.push(docSnap.ref);
                }
            });

            // Write in chunks of 400 to safely stay under Firestore batch limit (500)
            const chunkSize = 400;
            for (let i = 0; i < docsToWrap.length; i += chunkSize) {
                const chunk = docsToWrap.slice(i, i + chunkSize);
                const batch = writeBatch(db);
                chunk.forEach(ref => {
                    batch.update(ref, { academicYear: targetYear });
                });
                await batch.commit();
            }

            grandTotal += docsToWrap.length;
            if (typeof onProgress === 'function') {
                onProgress(collName, docsToWrap.length);
            }
        } catch (err) {
            console.warn(`Error wrapping collection ${collName}:`, err);
        }
    }
    return grandTotal;
}

window.updateSystemYear = async function () {
    const yearInput = document.getElementById('system-year-input');
    const yearStatus = document.getElementById('year-status');
    const newYear = yearInput.value.trim();

    if (!newYear) return;

    yearStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Checking current configuration...`;

    try {
        const yearDocSnap = await getDoc(doc(db, "system_config", "current_year"));
        const prevYear = yearDocSnap.exists() ? (yearDocSnap.data().year || "2025-26") : "2025-26";

        if (newYear === prevYear) {
            yearStatus.innerHTML = `<i class="fas fa-info-circle" style="color: #60a5fa;"></i> Academic Year is already active as <strong>${newYear}</strong>. No changes needed.`;
            return;
        }

        const confirmMsg = `⚠️ SWITCH ACADEMIC YEAR\n\n` +
            `Current Academic Year: ${prevYear}\n` +
            `New Academic Year: ${newYear}\n\n` +
            `When you switch to ${newYear}:\n` +
            `1. ALL existing data across the database (registrations, scores, leaderboard, whitelist, program dates, chest series, etc.) will be permanently preserved and wrapped under '${prevYear}'.\n` +
            `2. The new year '${newYear}' will start with a 100% CLEAN SLATE (0 registrations, 0 score logs, empty whitelist, etc.).\n` +
            `3. No data is lost; old data remains archived under '${prevYear}'.\n\n` +
            `Do you want to proceed?`;

        if (!confirm(confirmMsg)) {
            yearInput.value = prevYear;
            yearStatus.innerHTML = `<i class="fas fa-check-circle" style="color: var(--accent-color);"></i> Kept current year: <strong>${prevYear}</strong>`;
            return;
        }

        yearStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Step 1/3: Wrapping all previous data under '${prevYear}'...`;

        // Step 1: Wrap all untagged records across all event collections to prevYear
        const totalWrapped = await wrapAllLegacyData(prevYear, (collName, count) => {
            yearStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Step 1/3: Wrapping ${collName}... (${count} updated)`;
        });

        yearStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Step 2/3: Initializing fresh leaderboard for '${newYear}'...`;

        // Step 2: Initialize fresh 0-0 leaderboard for newYear
        const DEPARTMENTS = [
            "Department of Biochemistry",
            "Department of Commerce",
            "Department of Economics",
            "Department of English",
            "Department of History",
            "Department of Journalism and Mass Communication",
            "Department of Microbiology",
            "Department of Travel and Tourism"
        ];

        const lbBatch = writeBatch(db);
        DEPARTMENTS.forEach(dept => {
            const lbDocRef = doc(db, "leaderboard", `${dept}_${newYear}`);
            lbBatch.set(lbDocRef, {
                score: 0,
                department: dept,
                academicYear: newYear,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        });
        await lbBatch.commit();

        yearStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Step 3/3: Activating '${newYear}' in system config...`;

        // Step 3: Update system_config/current_year
        await setDoc(doc(db, "system_config", "current_year"), {
            year: newYear,
            previousYear: prevYear,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser?.email || "Core Admin",
            wrappedYear: prevYear,
            recordsWrapped: totalWrapped
        });

        // Record audit transition
        try {
            await addDoc(collection(db, "academic_transitions"), {
                fromYear: prevYear,
                toYear: newYear,
                transitionedAt: serverTimestamp(),
                transitionedBy: auth.currentUser?.email || "Core Admin",
                recordsWrapped: totalWrapped
            });
        } catch (e) {
            console.warn("Could not save transition history:", e);
        }

        yearStatus.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981;"></i> Successfully switched to <strong>${newYear}</strong>! All previous data safely wrapped to <strong>${prevYear}</strong>.`;

        alert(`✅ Academic Year successfully transitioned to ${newYear}!\n\n• All previous data was safely wrapped and tagged as '${prevYear}'.\n• All portals now start with a clean slate for '${newYear}'.\n• Fresh leaderboard initialized to 0.`);

        setTimeout(() => {
            fetchSystemYear();
            auditLegacyData();
        }, 1500);

    } catch (error) {
        console.error("Error updating system year:", error);
        yearStatus.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> Error: ${error.message}`;
        alert("Failed to switch academic year: " + error.message);
    }
};

// Data Audit & Migration Logic
let auditData = {};

window.auditLegacyData = async function () {
    const btn = document.getElementById('audit-btn');
    const resultsDiv = document.getElementById('audit-results');
    const tableBody = id('audit-table-body');
    const controls = id('migration-controls');
    const totalCountSpan = id('total-untagged-count');
    const status = id('migration-status');
    const activeYear = document.getElementById('system-year-input')?.value || "2025-26";

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
    status.textContent = "";
    auditData = {};

    try {
        let totalUntagged = 0;
        let rowsHtml = '';

        for (const collName of ALL_EVENT_COLLECTIONS) {
            const q = query(collection(db, collName));
            const snapshot = await getDocs(q);

            let untaggedCount = 0;
            let currentYearCount = 0;
            let otherYearCount = 0;

            snapshot.forEach(docSnap => {
                const y = docSnap.data().academicYear;
                if (!y) {
                    untaggedCount++;
                } else if (y === activeYear) {
                    currentYearCount++;
                } else {
                    otherYearCount++;
                }
            });

            auditData[collName] = untaggedCount;
            totalUntagged += untaggedCount;

            rowsHtml += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">${collName}</td>
                    <td style="padding: 0.75rem 1rem; color: #93c5fd;">${currentYearCount}</td>
                    <td style="padding: 0.75rem 1rem; color: #a78bfa;">${otherYearCount}</td>
                    <td style="padding: 0.75rem 1rem; font-weight: 700; color: ${untaggedCount > 0 ? '#fca5a5' : 'var(--success)'}">${untaggedCount}</td>
                    <td style="padding: 0.75rem 1rem;">
                        ${untaggedCount > 0 
                            ? '<span style="color: #f87171; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-exclamation-circle"></i> Untagged</span>' 
                            : '<span style="color: var(--success); display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-check-circle"></i> Protected</span>'}
                    </td>
                </tr>
            `;
        }

        tableBody.innerHTML = rowsHtml;
        resultsDiv.style.display = 'block';

        if (totalUntagged > 0) {
            totalCountSpan.textContent = totalUntagged;
            controls.style.display = 'block';
            document.querySelectorAll('.current-year-display').forEach(el => el.textContent = activeYear);
        } else {
            controls.style.display = 'none';
            status.style.color = 'var(--success)';
            status.textContent = "All database records are properly tagged and protected with academic years.";
        }

    } catch (error) {
        console.error("Audit error:", error);
        alert("Scan failed: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync"></i> Re-scan Database';
    }
};

window.migrateLegacyData = async function () {
    const btn = document.getElementById('migrate-btn');
    const status = document.getElementById('migration-status');
    const originalText = btn.innerHTML;
    const wrapYearSelect = document.getElementById('wrap-target-year-select');
    const targetYear = (wrapYearSelect ? wrapYearSelect.value : null) || document.getElementById('system-year-input').value || "2025-26";

    if (!confirm(`Are you sure you want to wrap all untagged records and tag them with Academic Year '${targetYear}'?`)) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Wrapping records...';
    status.style.display = 'block';
    status.style.color = 'var(--text-secondary)';
    status.textContent = `Wrapping records to ${targetYear}...`;

    try {
        let totalUpdated = await wrapAllLegacyData(targetYear, (collName, count) => {
            status.textContent = `Wrapping ${collName}... (${count} updated)`;
        });

        status.style.color = 'var(--success)';
        status.innerHTML = `<i class="fas fa-check-circle"></i> Success! ${totalUpdated} records successfully wrapped and tagged with '${targetYear}'.`;

        setTimeout(() => auditLegacyData(), 1200);

        alert(`Wrap complete! ${totalUpdated} records are now safely archived under '${targetYear}'.`);
    } catch (error) {
        console.error("Migration error:", error);
        status.style.color = 'var(--error)';
        status.textContent = "Error: " + error.message;
        alert("Wrap failed: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// Admin Management Logic
window.fetchAdmins = function () {
    const adminList = document.getElementById('admins-list-container');

    onSnapshot(collection(db, "admin_users"), (snapshot) => {
        adminList.innerHTML = '';

        if (snapshot.empty) {
            adminList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">No custom admins added yet.</div>';
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const email = data.email || id; // Document ID might be the email

            const row = document.createElement('div');
            row.className = 'admin-row';
            const roleClass = `role-${(data.role || 'Admin').toLowerCase().replace(/\s+/g, '')}`;
            
            row.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span class="admin-email-badge">${email}</span>
                            <span class="admin-role-badge ${roleClass}">${data.role || 'Admin'}</span>
                        </div>
                        <button class="btn-icon btn-delete" onclick="removeAdmin('${id}', '${email}')" title="Remove Admin">
                            <i class="fas fa-trash-can"></i>
                        </button>
                    `;
            adminList.appendChild(row);
        });
    }, (error) => {
        console.error("Error fetching admins:", error);
        adminList.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 1rem;">
                    <i class="fas fa-triangle-exclamation"></i> Error loading list: ${error.message}
                </div>`;
    });
}

window.addAdmin = async function () {
    const emailInput = document.getElementById('new-admin-email');
    const roleInput = document.getElementById('new-admin-role');

    const email = emailInput.value.toLowerCase().trim();
    const role = roleInput.value;

    if (!email || !email.includes('@')) {
        alert("Please enter a valid email address.");
        return;
    }

    try {
        // Use Email as document ID (replacing UID)
        await setDoc(doc(db, "admin_users", email), {
            email: email,
            role: role,
            addedBy: auth.currentUser.email,
            addedAt: serverTimestamp()
        });

        emailInput.value = '';
        alert(`Admin ${email} added successfully.`);
    } catch (err) {
        console.error("Failed to add admin:", err);
        alert("Error adding admin: " + err.message);
    }
}

window.removeAdmin = async function (id, email) {
    // Prevent removing self or important accounts if needed
    if (email === auth.currentUser.email) {
        alert("You cannot remove your own access.");
        return;
    }

    if (!confirm(`Are you sure you want to remove admin access for ${email}?`)) return;

    try {
        await deleteDoc(doc(db, "admin_users", id));
        alert("Admin removed successfully.");
    } catch (err) {
        console.error("Failed to remove admin:", err);
        alert("Error removing admin: " + err.message);
    }
}

// Role Access Strategy Matrix Rendering
window.renderRoleAccessStrategy = function() {
    const headRow = id('matrix-head-row');
    const matrixBody = id('matrix-body');
    if (!headRow || !matrixBody) return;

    // Build header (Roles)
    const roles = Object.keys(ROLE_PERMISSIONS);
    headRow.innerHTML = '<th>Module / Feature</th>'; // Reset
    roles.forEach(role => {
        const th = document.createElement('th');
        th.textContent = role;
        th.style.textAlign = 'center';
        headRow.appendChild(th);
    });

    // Build rows (Modules)
    matrixBody.innerHTML = '';
    ALL_MODULES.forEach(module => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${module.name}</td>`;
        
        roles.forEach(role => {
            const hasAccess = ROLE_PERMISSIONS[role].includes(module.id);
            const cell = document.createElement('td');
            cell.className = 'perm-cell';
            
            if (hasAccess) {
                cell.innerHTML = '<i class="fas fa-check-circle" style="color: var(--accent);"></i>';
            } else {
                cell.innerHTML = '<i class="fas fa-times-circle" style="color: rgba(255,255,255,0.05);"></i>';
            }
            tr.appendChild(cell);
        });
        matrixBody.appendChild(tr);
    });
};

// Clock logic
setInterval(() => {
    document.getElementById('clock').textContent = new Date().toLocaleTimeString();
}, 1000);

// Real-time Users List from RTDB
const usersListRef = ref(rtdb, 'status');
let previousUserStates = {};
let isInitialLoad = true;

onValue(usersListRef, (snapshot) => {
    const users = snapshot.val();
    const listElem = document.getElementById('users-list');
    const countElem = document.getElementById('user-count');
    listElem.innerHTML = '';

    if (users) {
        const userEntries = Object.entries(users).sort((a, b) => (b[1].last_changed || 0) - (a[1].last_changed || 0));
        const onlineCount = userEntries.filter(e => e[1].state === 'online').length;
        countElem.textContent = onlineCount;
        userEntries.forEach(([uid, userData]) => {
            const item = document.createElement('div');
            item.className = 'user-item';
            item.innerHTML = `
                        <div class="${userData.state === 'online' ? 'online-dot' : 'offline-dot'}"></div>
                        <div class="user-info">
                            <span class="user-email">${userData.email}</span>
                            <div class="user-details">
                                <span>${userData.role || 'User'}</span>
                                <span>•</span>
                                <span>${userData.state ? userData.state.toUpperCase() : 'OFFLINE'}</span>
                            </div>
                        </div>
                    `;
            item.onclick = () => openUserModal(uid, userData);
            item.style.cursor = 'pointer';
            listElem.appendChild(item);
        });
        isInitialLoad = false;
    } else {
        listElem.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">No active sessions found.</div>';
        countElem.textContent = '0';
    }
});

// Modal Logic
const modal = document.getElementById('user-details-modal');

window.closeUserModal = function () {
    modal.classList.remove('open');
};

window.openUserModal = async function (userUid, user) {
    document.getElementById('modal-user-email').textContent = user.email;
    document.getElementById('modal-user-role').textContent = user.role || 'User';

    const statusElem = document.getElementById('modal-user-status');
    statusElem.textContent = user.state ? user.state.toUpperCase() : 'UNKNOWN';
    statusElem.style.color = user.state === 'online' ? 'var(--accent)' : '#64748b';

    // Calculate "Session Duration" or "Last Seen"
    const timeElem = document.getElementById('modal-session-time');
    const now = Date.now();
    const lastChanged = user.last_changed || now;
    const diffMinutes = Math.floor((now - lastChanged) / 60000);

    if (user.state === 'online') {
        timeElem.textContent = `${diffMinutes}m`;
    } else {
        timeElem.textContent = `Offline`;
    }

    // Fetch Real History from status_history
    const historyList = document.getElementById('modal-history-list');
    historyList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;"><i class="fas fa-spinner fa-spin"></i> Loading history...</div>';

    if (!userUid) {
        historyList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">No history available (UID missing)</div>';
        modal.classList.add('open');
        return;
    }

    // Fetch last 10 history entries
    try {
        const historyRef = ref(rtdb, `status_history/${userUid}`);
        // Try fetching without complex query first if it fails, or just wrap in try/catch
        const historyQuery = dbQuery(historyRef, limitToLast(10));

        onValue(historyQuery, (snapshot) => {
            historyList.innerHTML = '';
            const historyData = snapshot.val();

            if (!historyData) {
                historyList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">No activity recorded yet</div>';
                return;
            }

            // Convert to array and reverse to show newest first
            const historyArray = Object.entries(historyData)
                .map(([key, value]) => ({ ...value, key }))
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            historyArray.forEach(entry => {
                const date = entry.timestamp ? new Date(entry.timestamp) : null;
                const timeStr = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time';
                const dateStr = date ? date.toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

                const item = document.createElement('div');
                item.className = `history-item ${entry.state === 'online' ? 'login' : 'logout'}`;
                item.innerHTML = `
                            <span>${entry.state === 'online' ? 'Logged In' : 'Logged Out'}</span>
                            <span class="history-time">${dateStr} ${timeStr}</span>
                        `;
                historyList.appendChild(item);
            });
        }, (error) => {
            console.error("History fetch error:", error);
            historyList.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 1rem;">Error loading history: ${error.message}</div>`;
        }, { onlyOnce: true });
    } catch (err) {
        console.error("History query setup error:", err);
    }
    modal.classList.add('open');
}

// Arts Identity Logic
window.fetchArtsIdentity = async function () {
    const nameInput = document.getElementById('arts-name-input');
    const fontSelect = document.getElementById('arts-font-select');

    try {
        const docSnap = await getDoc(doc(db, "system_config", "ui_identity"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            nameInput.value = data.artsName || "";
            fontSelect.value = data.fontFamily || "'Rozha One', serif";
        } else {
            nameInput.value = "Pazhassiraja College Fine Arts";
            fontSelect.value = "'Rozha One', serif";
        }
        updateArtsPreview();
    } catch (error) {
        console.error("Error fetching arts identity:", error);
    }
};

window.updateArtsPreview = function () {
    const name = document.getElementById('arts-name-input').value || "Pazhassiraja College Fine Arts";
    const font = document.getElementById('arts-font-select').value;
    const preview = document.getElementById('arts-preview-text');

    preview.textContent = name;
    preview.style.fontFamily = font.replace(/'/g, "").split(',')[0]; // Simple clean for preview style
};

window.saveArtsIdentity = async function () {
    const name = document.getElementById('arts-name-input').value;
    const font = document.getElementById('arts-font-select').value;
    const status = document.getElementById('arts-save-status');
    const btn = document.querySelector('button[onclick="saveArtsIdentity()"]');

    if (!name) {
        alert("Please enter a name");
        return;
    }

    btn.disabled = true;
    status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        await setDoc(doc(db, "system_config", "ui_identity"), {
            artsName: name,
            fontFamily: font,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.email
        });
        status.innerHTML = '<span style="color: var(--accent);"><i class="fas fa-check-circle"></i> Saved!</span>';
        setTimeout(() => status.innerHTML = '', 3000);
    } catch (error) {
        console.error("Error saving arts identity:", error);
        status.innerHTML = '<span style="color: #ef4444;">Error saving</span>';
        alert("Failed to save: " + error.message);
    } finally {
        btn.disabled = false;
    }
};
 
 
 // Certificate Settings Logic
 window.fetchCertificateSettings = async function () {
     try {
         const docSnap = await getDoc(doc(db, "system_config", "certificate_settings"));
         if (docSnap.exists()) {
             const data = docSnap.data();
             id('cert-event-name').value = data.eventName || "NAVARANG";
             id('cert-event-year').value = data.eventYear || "2025-26";
             id('cert-fest-subtitle').value = data.festSubtitle || "Fine Arts Fest";
             
             id('cert-sig1-title').value = data.sig1Title || "SECRETARY";
             id('cert-sig1-name').value = data.sig1Name || "";
             id('cert-sig1-org').value = data.sig1Org || "";
             id('cert-sig2-title').value = data.sig2Title || "CONVENOR";
             id('cert-sig2-name').value = data.sig2Name || "";
             id('cert-sig2-org').value = data.sig2Org || "";
             id('cert-sig3-title').value = data.sig3Title || "CONVENOR";
             id('cert-sig3-name').value = data.sig3Name || "";
             id('cert-sig3-org').value = data.sig3Org || "";
             id('cert-sig4-title').value = data.sig4Title || "PRINCIPAL";
             id('cert-sig4-name').value = data.sig4Name || "";
             id('cert-sig4-org').value = data.sig4Org || "";
         }
     } catch (error) {
         console.error("Error fetching certificate settings:", error);
     }
 };
 
 window.saveCertificateSettings = async function () {
     const status = id('cert-save-status');
     const btn = document.querySelector('button[onclick="saveCertificateSettings()"]');
 
     btn.disabled = true;
     status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
 
     const settings = {
         eventName: id('cert-event-name').value,
         eventYear: id('cert-event-year').value,
         festSubtitle: id('cert-fest-subtitle').value,
         sig1Title: id('cert-sig1-title').value,
         sig1Name: id('cert-sig1-name').value,
         sig2Title: id('cert-sig2-title').value,
         sig2Name: id('cert-sig2-name').value,
         sig3Title: id('cert-sig3-title').value,
         sig3Name: id('cert-sig3-name').value,
         sig4Title: id('cert-sig4-title').value,
         sig4Name: id('cert-sig4-name').value,
         updatedAt: serverTimestamp(),
         updatedBy: auth.currentUser.email
     };
 
     try {
         await setDoc(doc(db, "system_config", "certificate_settings"), settings);
         status.innerHTML = '<span style="color: var(--accent);"><i class="fas fa-check-circle"></i> Saved!</span>';
         setTimeout(() => status.innerHTML = '', 3000);
     } catch (error) {
         console.error("Error saving certificate settings:", error);
         status.innerHTML = '<span style="color: #ef4444;">Error saving</span>';
         alert("Failed to save: " + error.message);
     } finally {
         btn.disabled = false;
     }
 };


// Click outside to close
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeUserModal();
});




// Secure PIN Logic
async function hashPIN(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const SYSTEM_LOCK_DOC = "admin_settings/system_lock";

// Initialize/Migrate PIN if missing
window.initPinSystem = async function () {
    try {
        const docSnap = await getDoc(doc(db, "admin_settings", "system_lock"));
        if (!docSnap.exists()) {
            console.log("Initializing System PIN...");
            // Default PIN: 673579
            const defaultHash = await hashPIN("673579");
            await setDoc(doc(db, "admin_settings", "system_lock"), {
                pinHash: defaultHash,
                updatedAt: serverTimestamp(),
                updatedBy: "System Migration"
            });
            console.log("System PIN initialized.");
        }
    } catch (e) {
        console.error("PIN Init Error:", e);
    }
};

// Call init on load (authorized only)
setTimeout(initPinSystem, 2000);

// System Config Lock Logic
window.unlockSystemConfig = async function () {
    const pinInput = document.getElementById('config-pin-input');
    const overlay = document.getElementById('config-lock-overlay');
    const content = document.getElementById('sys-config-content');
    const errorMsg = document.getElementById('pin-error-display');
    const btn = document.querySelector('#config-lock-overlay button');

    errorMsg.classList.remove('visible'); // Reset error state

    const enteredPin = pinInput.value;
    if (!enteredPin) return;

    // Loading state
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
    btn.disabled = true;

    try {
        const inputHash = await hashPIN(enteredPin);
        const docSnap = await getDoc(doc(db, "admin_settings", "system_lock"));

        let valid = false;

        if (docSnap.exists()) {
            const storedHash = docSnap.data().pinHash;
            valid = (inputHash === storedHash);
        } else {
            // Fallback: compute hash dynamically for default PIN
            const fallbackHash = await hashPIN("673579");
            valid = (inputHash === fallbackHash);
            // Trigger initialization if missing
            initPinSystem();
        }

        if (valid) {
            overlay.classList.add('unlocked');
            content.classList.remove('blur-locked');
        } else {
            throw new Error("Incorrect PIN");
        }
    } catch (error) {
        pinInput.style.borderColor = '#ef4444';
        pinInput.classList.add('shake-animation');

        // Show custom error msg
        errorMsg.classList.add('visible');

        setTimeout(() => {
            pinInput.classList.remove('shake-animation');
            pinInput.style.borderColor = 'rgba(255,255,255,0.1)';
        }, 500);

        pinInput.value = '';
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
    }
};


// Allow pressing Enter to unlock
document.getElementById('config-pin-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        unlockSystemConfig();
    }
});

// Hide error on typing and auto-unlock when 6 digits entered
document.getElementById('config-pin-input').addEventListener('input', function () {
    const errorMsg = document.getElementById('pin-error-display');
    if (errorMsg) errorMsg.classList.remove('visible');
    this.style.borderColor = 'rgba(255,255,255,0.1)';

    // Auto-unlock when 6 digits are entered
    if (this.value.length === 6) {
        unlockSystemConfig();
    }
});

// Developer Payment Logic
window.fetchPayments = function () {
    const listBody = document.getElementById('payment-history-body');
    const totalDisplay = document.getElementById('total-paid-display');

    // Order by date desc
    const q = query(collection(db, "project_payments"), orderBy("date", "desc"));

    onSnapshot(q, (snapshot) => {
        listBody.innerHTML = '';
        let total = 0;

        if (snapshot.empty) {
            listBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 2rem;">No payments recorded yet.</td></tr>';
            totalDisplay.textContent = '0';
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;

            total += Number(data.amount) || 0;

            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            row.innerHTML = `
                <td style="padding: 1rem;">${data.date}</td>
                <td style="padding: 1rem;">
                    <div style="font-weight: 500; color: white;">${data.ref || 'N/A'}</div>
                    ${data.note ? `<div style="font-size: 0.8rem; color: var(--text-secondary);">${data.note}</div>` : ''}
                </td>
                <td style="padding: 1rem;">
                    <span style="font-size: 0.8rem; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">
                        ${data.recordedBy || 'Unknown'}
                    </span>
                </td>
                <td style="padding: 1rem; text-align: right; font-family: monospace; font-size: 1rem; color: #34d399;">
                    ₹${Number(data.amount).toLocaleString()}
                </td>
                <td style="padding: 1rem; text-align: center;">
                    <button class="btn-icon" onclick="deletePayment('${id}', '${data.amount}')" style="color: #ef4444; opacity: 0.7;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            listBody.appendChild(row);
        });

        totalDisplay.textContent = total.toLocaleString();

    }, (error) => {
        console.error("Error fetching payments:", error);
        listBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444; padding: 2rem;">Error loading data: ${error.message}</td></tr>`;
    });
};

window.recordPayment = async function () {
    const amountIn = document.getElementById('pay-amount');
    const dateIn = document.getElementById('pay-date');
    const refIn = document.getElementById('pay-ref');
    const btn = document.querySelector('button[onclick="recordPayment()"]');

    const amount = amountIn.value;
    const date = dateIn.value;
    const ref = refIn.value;

    if (!amount || !date) {
        alert("Please enter amount and date.");
        return;
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recording...';
    btn.disabled = true;

    try {
        await addDoc(collection(db, "project_payments"), {
            amount: Number(amount),
            date: date,
            ref: ref,
            recordedBy: auth.currentUser.email,
            timestamp: serverTimestamp()
        });

        // Clear form
        amountIn.value = '';
        refIn.value = '';
        // Keep date for convenience or set to today

        // Show success briefly on button (optional, or just reset)
        btn.innerHTML = '<i class="fas fa-check"></i> Recorded!';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 1500);

    } catch (error) {
        console.error("Payment record error:", error);
        alert("Failed to record: " + error.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

window.deletePayment = async function (id, amount) {
    if (!confirm(`Are you sure you want to delete this payment of ₹${amount}? This cannot be undone.`)) return;

    try {
        await deleteDoc(doc(db, "project_payments", id));
    } catch (error) {
        console.error("Delete error:", error);
        alert("Failed to delete: " + error.message);
    }
};

// Project Usage Calculation Logic
window.calculateProjectUsage = async function () {
    const firestoreText = id('firestore-usage-text');
    const firestoreBar = id('firestore-usage-bar');
    const totalDocCountElem = id('total-doc-count');
    const usagePercentageElem = id('usage-percentage');
    const remainingSpaceElem = id('remaining-space-text');

    if (!firestoreText) return;

    firestoreText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';

    try {
        const collectionsToScan = ['registrations', 'score_logs', 'leaderboard', 'program_dates', 'whitelisted_emails', 'admin_users', 'project_payments'];
        let totalDocs = 0;

        for (const collName of collectionsToScan) {
            const q = query(collection(db, collName));
            const snapshot = await getDocs(q);
            totalDocs += snapshot.size;
        }

        // Estimate weight: standard document overhead is ~0.5KB
        const estimatedSizeKB = totalDocs * 0.5;
        const estimatedSizeMB = (estimatedSizeKB / 1024).toFixed(2);
        
        // Firebase Free Tier Limit: 1GB = 1,048,576 KB
        const totalLimitKB = 1024 * 1024; 
        const usagePercent = ((estimatedSizeKB / totalLimitKB) * 100).toFixed(4);
        const displayPercent = usagePercent < 0.01 ? "< 0.01%" : usagePercent + "%";

        // Update UI
        totalDocCountElem.textContent = totalDocs.toLocaleString();
        firestoreText.textContent = `${estimatedSizeMB} MB of 1 GB`;
        firestoreBar.style.width = `${Math.min(Math.max(usagePercent * 10, 0.5), 100)}%`; // Scale slightly for visibility if very small
        
        // Update color based on usage
        if (usagePercent > 80) firestoreBar.className = 'usage-bar critical';
        else if (usagePercent > 50) firestoreBar.className = 'usage-bar warning';
        else firestoreBar.className = 'usage-bar';

        usagePercentageElem.textContent = displayPercent;
        remainingSpaceElem.textContent = (100 - usagePercent).toFixed(2) + "%";

    } catch (error) {
        console.error("Usage calculation error:", error);
        firestoreText.textContent = "Error calculating usage";
        firestoreText.style.color = "#ef4444";
    }
};


