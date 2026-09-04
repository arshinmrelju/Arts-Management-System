import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail, 
    signInWithPopup, 
    GoogleAuthProvider 
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/**
 * Handles Email/Password sign in or automatic user creation if email is new.
 */
export async function handleEmailAuth(auth, email, password, statusEl) {
    if (!email || !password) {
        if (statusEl) {
            statusEl.className = "portal-auth-status error";
            statusEl.textContent = "Please enter both email and password.";
        }
        return false;
    }

    if (statusEl) {
        statusEl.className = "portal-auth-status";
        statusEl.textContent = "Authenticating...";
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        if (statusEl) {
            statusEl.className = "portal-auth-status success";
            statusEl.textContent = "Sign-in successful! Redirecting...";
        }
        return true;
    } catch (error) {
        console.warn("Email auth error:", error.code, error.message);

        // If user not found or invalid credentials on first try, attempt registration
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            try {
                await createUserWithEmailAndPassword(auth, email, password);
                if (statusEl) {
                    statusEl.className = "portal-auth-status success";
                    statusEl.textContent = "Account registered successfully! Redirecting...";
                }
                return true;
            } catch (createError) {
                if (statusEl) {
                    statusEl.className = "portal-auth-status error";
                    statusEl.textContent = getFriendlyErrorMessage(createError);
                }
                return false;
            }
        }

        if (statusEl) {
            statusEl.className = "portal-auth-status error";
            statusEl.textContent = getFriendlyErrorMessage(error);
        }
        return false;
    }
}

/**
 * Handles password reset email dispatch.
 */
export async function handleForgotPassword(auth, email, statusEl) {
    if (!email) {
        const inputEmail = prompt("Please enter your email address to receive password reset instructions:");
        email = inputEmail ? inputEmail.trim() : "";
    }

    if (!email) {
        if (statusEl) {
            statusEl.className = "portal-auth-status error";
            statusEl.textContent = "Email address required for password reset.";
        }
        return;
    }

    try {
        if (statusEl) {
            statusEl.className = "portal-auth-status";
            statusEl.textContent = "Sending password reset email...";
        }
        await sendPasswordResetEmail(auth, email);
        if (statusEl) {
            statusEl.className = "portal-auth-status success";
            statusEl.textContent = `Password reset link sent to ${email}`;
        }
    } catch (error) {
        if (statusEl) {
            statusEl.className = "portal-auth-status error";
            statusEl.textContent = getFriendlyErrorMessage(error);
        }
    }
}

/**
 * Handles Google Popup sign in.
 */
export async function handleGoogleAuth(auth, provider, statusEl) {
    if (statusEl) {
        statusEl.className = "portal-auth-status";
        statusEl.textContent = "Signing in with Google...";
    }
    try {
        const result = await signInWithPopup(auth, provider);
        if (statusEl) {
            statusEl.className = "portal-auth-status success";
            statusEl.textContent = "Signed in successfully!";
        }
        return result.user;
    } catch (error) {
        console.error("Google login error:", error);
        if (statusEl) {
            statusEl.className = "portal-auth-status error";
            statusEl.textContent = getFriendlyErrorMessage(error);
        }
        return null;
    }
}

function getFriendlyErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email':
            return 'Invalid email address format.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in window closed before completing.';
        default:
            return error.message || 'Authentication failed.';
    }
}

/**
 * Initialize interactive UI features: Password Toggle and Remember Me
 */
export function initAuthInteractions(storageKey = 'prc_saved_email') {
    // 1. Password Visibility Toggle
    const toggleBtns = document.querySelectorAll('.portal-password-toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target') || 'auth-password-input';
            const input = document.getElementById(targetId);
            const icon = btn.querySelector('i');
            if (input) {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                if (icon) {
                    icon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
                }
            }
        });
    });

    // 2. Remember Me Feature
    const emailInput = document.getElementById('auth-email-input');
    const rememberCheckbox = document.getElementById('remember-me-checkbox');
    const emailForm = document.getElementById('email-auth-form');

    if (emailInput && rememberCheckbox) {
        const savedEmail = localStorage.getItem(storageKey);
        if (savedEmail) {
            emailInput.value = savedEmail;
            rememberCheckbox.checked = true;
        }

        if (emailForm) {
            emailForm.addEventListener('submit', () => {
                if (rememberCheckbox.checked) {
                    localStorage.setItem(storageKey, emailInput.value.trim());
                } else {
                    localStorage.removeItem(storageKey);
                }
            });
        }
    }
}

// Auto-run UI enhancements when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initAuthInteractions());
    } else {
        initAuthInteractions();
    }
}
