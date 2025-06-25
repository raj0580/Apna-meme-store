import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// --- Login Page Logic ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    // Redirect if already logged in
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.location.href = '/admin.html';
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('login-error');
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // The onAuthStateChanged listener above will handle the redirect
        } catch (error) {
            console.error("Login failed:", error);
            errorElement.textContent = `Login Failed: ${error.message}`;
            errorElement.style.display = 'block';
        }
    });
}

// --- Logout Logic ---
const logoutButton = document.getElementById('logout-btn');
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // The listener on the admin page will automatically redirect
            window.location.href = '/login.html'; 
        } catch (error) {
            console.error('Logout failed:', error);
            alert('Logout failed. Please try again.');
        }
    });
}