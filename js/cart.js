// js/cart.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { getCart, saveCart, showToast } from "./main.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let couponApplied = JSON.parse(localStorage.getItem('coupon')) || null;

function renderCart() {
    const cart = getCart();
    const cartItemsContainer = document.getElementById('cart-items');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const cartWrapper = document.getElementById('cart-wrapper');

    if (cart.length === 0) {
        emptyCartMessage.style.display = 'block';
        cartWrapper.style.display = 'none';
        return;
    }

    emptyCartMessage.style.display = 'none';
    cartWrapper.style.display = 'flex';
    cartItemsContainer.innerHTML = '';
    
    let subtotal = 0;

    cart.forEach(item => {
        // === THIS IS THE FIX ===
        // Calculate the actual sale price considering the product's own discount
        const salePrice = item.price - (item.price * (item.discountPercentage || 0) / 100);
        const itemTotal = salePrice * item.quantity;
        subtotal += itemTotal;
        
        const cartItemHTML = `
            <div class="cart-item">
                <img src="${item.imageUrl}" alt="${item.name}">
                <div class="cart-item-info">
                    <h3>${item.name}</h3>
                    <p class="product-price">
                        ${item.discountPercentage > 0 ? `<span class="original-price">₹${item.price.toFixed(2)}</span>` : ''}
                        <span class="current-price">₹${salePrice.toFixed(2)}</span>
                    </p>
                    <div class="quantity-control">
                        <button class="quantity-btn" data-id="${item.id}" data-change="-1">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" data-id="${item.id}" data-change="1">+</button>
                    </div>
                </div>
                <div class="cart-item-total">
                    <p>₹${itemTotal.toFixed(2)}</p>
                    <button class="remove-btn" data-id="${item.id}">Remove</button>
                </div>
            </div>
        `;
        cartItemsContainer.innerHTML += cartItemHTML;
    });

    renderSummary(subtotal);
    attachEventListeners();
}

function renderSummary(subtotal) {
    const cartSummaryContainer = document.getElementById('cart-summary');
    let couponDiscount = 0;
    
    // The subtotal is already discounted from products. Now we apply the coupon discount.
    if (couponApplied) {
        couponDiscount = subtotal * (couponApplied.discountPercentage / 100);
    }
    
    const total = subtotal - couponDiscount;

    cartSummaryContainer.innerHTML = `
        <h2>Order Summary</h2>
        <div class="summary-row">
            <span>Subtotal</span>
            <span>₹${subtotal.toFixed(2)}</span>
        </div>
        <div class="summary-row" id="discount-row" style="${couponDiscount > 0 ? '' : 'display: none;'}">
            <span>Coupon Discount (${couponApplied ? couponApplied.code : ''})</span>
            <span>- ₹${couponDiscount.toFixed(2)}</span>
        </div>
        <div class="summary-row total">
            <span>Total</span>
            <span>₹${total.toFixed(2)}</span>
        </div>
        <form id="coupon-form">
            <input type="text" id="coupon-code" placeholder="Enter coupon code" ${couponApplied ? 'disabled' : ''}>
            <button type="submit" class="btn" ${couponApplied ? 'disabled' : ''}>Apply</button>
        </form>
         ${couponApplied ? `<button id="remove-coupon-btn" class="btn btn-secondary">Remove Coupon</button>` : ''}
        <a href="/checkout.html" class="btn btn-primary checkout-btn">Proceed to Checkout</a>
    `;

    document.getElementById('coupon-form').addEventListener('submit', applyCoupon);
    if (couponApplied) {
        document.getElementById('remove-coupon-btn').addEventListener('click', removeCoupon);
    }
}

function attachEventListeners() {
    document.querySelectorAll('.quantity-btn').forEach(button => button.addEventListener('click', handleQuantityChange));
    document.querySelectorAll('.remove-btn').forEach(button => button.addEventListener('click', handleRemoveItem));
}

function handleQuantityChange(e) {
    const id = e.target.dataset.id;
    const change = parseInt(e.target.dataset.change, 10);
    const cart = getCart();
    const item = cart.find(p => p.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeItem(id);
        } else {
            saveCart(cart);
            renderCart();
        }
    }
}

function handleRemoveItem(e) {
    removeItem(e.target.dataset.id);
}

function removeItem(id) {
    let cart = getCart();
    cart = cart.filter(p => p.id !== id);
    saveCart(cart);
    renderCart();
}

async function applyCoupon(e) {
    e.preventDefault();
    const couponCodeInput = document.getElementById('coupon-code');
    const code = couponCodeInput.value.trim().toUpperCase();
    if (!code) return;

    try {
        const docRef = doc(db, "Coupons", code);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().isActive) {
            couponApplied = { code: docSnap.id, ...docSnap.data() };
            localStorage.setItem('coupon', JSON.stringify(couponApplied));
            showToast("Coupon applied successfully!");
            renderCart();
        } else {
            showToast("Invalid or expired coupon code.");
            couponApplied = null;
            localStorage.removeItem('coupon');
        }
    } catch (error) {
        console.error("Error applying coupon: ", error);
        showToast("Could not apply coupon. Please try again.");
    }
}

function removeCoupon() {
    couponApplied = null;
    localStorage.removeItem('coupon');
    showToast("Coupon removed.");
    renderCart();
}

document.addEventListener('DOMContentLoaded', renderCart);