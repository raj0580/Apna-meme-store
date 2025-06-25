import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { getCart } from "./main.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function prefillCheckoutForm() {
    const user = JSON.parse(localStorage.getItem('customerDetails'));
    if (user) {
        document.getElementById('name').value = user.name || '';
        document.getElementById('phone').value = user.phone || '';
    }
}

function renderCheckoutSummary() {
    const cart = getCart();
    const coupon = JSON.parse(localStorage.getItem('coupon')) || null;
    const summaryContainer = document.getElementById('order-summary-container');
    
    if (cart.length === 0) {
        window.location.href = '/cart.html';
        return;
    }

    let subtotal = 0;
    let summaryItemsHTML = '';

    cart.forEach(item => {
        const salePrice = (item.price || 0) - ((item.price || 0) * (item.discountPercentage || 0) / 100);
        subtotal += salePrice * item.quantity;
        
        // === NEW HTML structure for items with images ===
        summaryItemsHTML += `
            <div class="summary-item">
                <img src="${item.imageUrl}" alt="${item.name}">
                <div class="summary-item-details">
                    <span>${item.name} (x${item.quantity})</span>
                    <span>₹${(salePrice * item.quantity).toFixed(2)}</span>
                </div>
            </div>
        `;
    });

    let couponDiscount = 0;
    if (coupon) {
        couponDiscount = subtotal * (coupon.discountPercentage / 100);
    }
    const total = subtotal - couponDiscount;
    
    // Assemble the final summary HTML
    summaryContainer.innerHTML = `
        <h3>Order Summary</h3>
        ${summaryItemsHTML}
        <hr>
        <div class="summary-row"><strong>Subtotal:</strong> <span>₹${subtotal.toFixed(2)}</span></div>
        ${couponDiscount > 0 ? `<div class="summary-row"><strong>Coupon Discount:</strong> <span>-₹${couponDiscount.toFixed(2)}</span></div>` : ''}
        <div class="summary-row total"><strong>Total:</strong> <span>₹${total.toFixed(2)}</span></div>
    `;
}

async function handlePlaceOrder(e) {
    e.preventDefault();
    const placeOrderBtn = document.getElementById('place-order-btn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Placing Order...';

    const customerInfo = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        pincode: document.getElementById('pincode').value,
    };
    
    if (!customerInfo.name || !/^\d{10}$/.test(customerInfo.phone) || !customerInfo.address || !customerInfo.pincode) {
        alert("Please fill in all fields with valid information (10-digit phone number required).");
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = 'Place Order';
        return;
    }

    const cart = getCart();
    const coupon = JSON.parse(localStorage.getItem('coupon')) || null;

    let subtotal = 0;
    cart.forEach(item => {
        const salePrice = (item.price || 0) - ((item.price || 0) * (item.discountPercentage || 0) / 100);
        subtotal += salePrice * item.quantity;
    });

    let couponDiscountValue = 0;
    if (coupon) {
        couponDiscountValue = subtotal * (coupon.discountPercentage / 100);
    }
    const totalAmount = subtotal - couponDiscountValue;
    
    const order = {
        customerInfo, items: cart, subtotal,
        discountApplied: couponDiscountValue,
        couponCode: coupon ? coupon.code : null,
        totalAmount, orderDate: serverTimestamp(), status: "Placed"
    };

    try {
        const docRef = await addDoc(collection(db, "Orders"), order);
        localStorage.removeItem('cart');
        localStorage.removeItem('coupon');
        window.location.href = `/order-success.html?orderId=${docRef.id}`;
    } catch (error) {
        console.error("Error placing order: ", error);
        alert("Failed to place order. Please try again.");
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = 'Place Order';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    prefillCheckoutForm();
    renderCheckoutSummary();
    document.getElementById('checkout-form').addEventListener('submit', handlePlaceOrder);
});