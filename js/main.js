import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function showUserDetailsModal() { const modal = document.getElementById('user-details-modal'); if (modal) modal.style.display = 'flex'; }
function hideUserDetailsModal() { const modal = document.getElementById('user-details-modal'); if (modal) modal.style.display = 'none'; }
function updateWelcomeMessage() {
    const user = JSON.parse(localStorage.getItem('customerDetails'));
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage && user && user.name) {
        welcomeMessage.textContent = `Welcome, ${user.name}!`;
    }
}
async function handleUserDetailsSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('customer-name').value;
    const phone = document.getElementById('customer-phone').value;
    if (!name || !/^\d{10}$/.test(phone)) { alert('Please enter a valid name and 10-digit phone number.'); return; }
    const customerDetails = { name, phone };
    localStorage.setItem('customerDetails', JSON.stringify(customerDetails));
    try { await addDoc(collection(db, "Leads"), { ...customerDetails, capturedAt: serverTimestamp() }); } 
    catch (error) { console.error("Could not save lead to Firestore:", error); }
    hideUserDetailsModal();
    updateWelcomeMessage();
}
export function getCart() { return JSON.parse(localStorage.getItem('cart')) || []; }
export function saveCart(cart) { localStorage.setItem('cart', JSON.stringify(cart)); updateCartCounter(); }
export function addToCart(product, productId) {
    const cart = getCart();
    const existingProduct = cart.find(item => item.id === productId);
    if (existingProduct) { existingProduct.quantity += 1; } 
    else {
        cart.push({
            id: productId, name: product.name, price: product.price,
            discountPercentage: product.discountPercentage,
            imageUrl: (product.imageUrls && product.imageUrls[0]) || '',
            quantity: 1
        });
    }
    saveCart(cart);
    showToast(`${product.name} added to cart!`);
}
export function updateCartCounter() {
    const cart = getCart();
    const cartCounter = document.getElementById('cart-counter');
    if (cartCounter) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCounter.textContent = totalItems;
        cartCounter.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}
export function showToast(message) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast show'; toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toastContainer.removeChild(toast); }, 500);
    }, 3000);
}
document.addEventListener('DOMContentLoaded', () => {
    updateCartCounter();
    updateWelcomeMessage();
    const userDetailsForm = document.getElementById('user-details-form');
    if (userDetailsForm) {
        if (!localStorage.getItem('customerDetails')) { showUserDetailsModal(); }
        userDetailsForm.addEventListener('submit', handleUserDetailsSubmit);
    }
});