import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// Shared Firebase Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCrjARB6MTC5s_sMPHzf3a1yW1ajHTKHU4",
  authDomain: "unionartsprc.firebaseapp.com",
  databaseURL: "https://unionartsprc-default-rtdb.firebaseio.com",
  projectId: "unionartsprc",
  storageBucket: "unionartsprc.firebasestorage.app",
  messagingSenderId: "812219989202",
  appId: "1:812219989202:web:cb94548572e7dcb5cc810b",
  measurementId: "G-WR8DBND5YD"
};

// --- Maintenance Mode Check ---
try {
  let appCheck;
  try {
      appCheck = initializeApp(firebaseConfig, "MaintenanceCheckApp");
  } catch (e) {
      // Ignore duplicate
  }

  if (appCheck) {
      const dbCheck = getFirestore(appCheck);

      function setupMaintenanceListener() {
          const path = window.location.pathname.toLowerCase();
          
          // Allow coreadmin to bypass maintenance restrictions completely
          if (path.includes('coreadmin.html') || path.includes('coreadmin')) {
              return;
          }
          
          // Allow developers to bypass if they have authenticated via the maintenance page
          if (sessionStorage.getItem('developer_bypass') === 'true') {
              return;
          }
          
          try {
              const maintDocRef = doc(dbCheck, "system_config", "maintenance");
              onSnapshot(maintDocRef, (docSnap) => {
                  const isMaintenanceActive = docSnap.exists() && docSnap.data().active === true;
                  // Use 'maintenance' so it matches Firebase Hosting's clean URL '/maintenance'
                  const isOnMaintenancePage = path.includes('maintenance');
                  
                  if (isMaintenanceActive) {
                      // If active and NOT already on the maintenance page, redirect there
                      if (!isOnMaintenancePage) {
                          let basePath = window.location.href.split('?')[0];
                          if (basePath.endsWith('/')) basePath += 'index.html';
                          const urlParts = basePath.split('/');
                          // Append .html which Firebase cleanly redirects if configured
                          urlParts[urlParts.length - 1] = 'maintenance.html';
                          window.location.replace(urlParts.join('/'));
                      }
                  } else {
                      // If NOT active but user is ON the maintenance page, redirect to index
                      if (isOnMaintenancePage) {
                          let basePath = window.location.href.split('?')[0];
                          const urlParts = basePath.split('/');
                          urlParts[urlParts.length - 1] = ''; // points back to root/index
                          window.location.replace(urlParts.join('/'));
                      }
                  }
              }, (error) => {
                  console.error("Maintenance listener error:", error);
              });
          } catch (e) {
              console.error("Maintenance configuration failed:", e);
          }
      }

      if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', setupMaintenanceListener);
      } else {
          setupMaintenanceListener();
      }
  }
} catch (globalErr) {
  console.error("Maintenance global error:", globalErr);
}
