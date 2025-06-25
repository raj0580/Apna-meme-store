import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { addToCart } from "./main.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchOtherProducts(currentProductId) {
    const otherProductsGrid = document.getElementById('other-products-grid');
    const otherProductsSection = document.getElementById('other-products-section');
    if (!otherProductsGrid || !otherProductsSection) return;
    otherProductsGrid.innerHTML = '';
    try {
        const q = query(collection(db, "Products"), where("__name__", "!=", currentProductId), limit(4));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
                const product = doc.data();
                const discountedPrice = (product.price || 0) - ((product.price || 0) * (product.discountPercentage || 0) / 100);
                const primaryImage = (product.imageUrls && product.imageUrls[0]) || '';
                const productCard = `
                    <div class="product-card">
                        <a href="/product.html?id=${doc.id}">
                            ${product.discountPercentage > 0 ? `<div class="discount-badge">${product.discountPercentage}% OFF</div>` : ''}
                            <div class="product-image-container" style="background-image: url('${primaryImage}')"></div>
                            <h3 class="product-name">${product.name || 'Untitled'}</h3>
                        </a>
                        <div class="product-price">
                            ${product.discountPercentage > 0 ? `<span class="original-price">₹${(product.price || 0).toFixed(2)}</span>` : ''}
                            <span class="current-price">₹${discountedPrice.toFixed(2)}</span>
                        </div>
                    </div>`;
                otherProductsGrid.innerHTML += productCard;
            });
            otherProductsSection.style.display = 'block';
        }
    } catch (error) { console.error("Error fetching other products: ", error); }
}

async function fetchProductDetails() {
    const productDetailsContainer = document.getElementById('product-details');
    const loader = document.getElementById('loader');
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    if (!productId) { productDetailsContainer.innerHTML = '<p>No product specified.</p>'; return; }
    loader.style.display = 'block';
    try {
        const docSnap = await getDoc(doc(db, "Products", productId));
        if (docSnap.exists()) {
            const product = docSnap.data();
            const discountedPrice = (product.price || 0) - ((product.price || 0) * (product.discountPercentage || 0) / 100);
            const hasImages = product.imageUrls && product.imageUrls.length > 0;
            const primaryImage = hasImages ? product.imageUrls[0] : 'https://via.placeholder.com/500?text=No+Image';
            let thumbnailHTML = '';
            if (hasImages && product.imageUrls.length > 1) {
                product.imageUrls.forEach((url, index) => {
                    thumbnailHTML += `<img src="${url}" alt="Thumbnail ${index + 1}" class="thumbnail-image ${index === 0 ? 'active' : ''}">`;
                });
            }
            productDetailsContainer.innerHTML = `
                <div class="product-gallery">
                    <img id="main-product-image" src="${primaryImage}" alt="${product.name}">
                    <div class="product-thumbnails">${thumbnailHTML}</div>
                </div>
                <div class="product-info-container">
                    <h1>${product.name || 'Untitled'}</h1>
                    <p class="product-description">${product.description || 'No description available.'}</p>
                    <div class="product-price">
                        ${product.discountPercentage > 0 ? `<span class="original-price">₹${(product.price || 0).toFixed(2)}</span>` : ''}
                        <span class="current-price">₹${discountedPrice.toFixed(2)}</span>
                    </div>
                    <button id="add-to-cart-details" class="btn btn-primary">Add to Cart</button>
                </div>`;

            const mainImage = document.getElementById('main-product-image');
            const thumbnails = document.querySelectorAll('.thumbnail-image');
            thumbnails.forEach(thumb => {
                thumb.addEventListener('click', () => {
                    mainImage.src = thumb.src;
                    thumbnails.forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                });
            });
            document.getElementById('add-to-cart-details').addEventListener('click', () => addToCart(product, productId));
            fetchOtherProducts(productId);
        } else { productDetailsContainer.innerHTML = '<p>Product not found.</p>'; }
    } catch (error) { console.error("Error fetching product details: ", error); productDetailsContainer.innerHTML = '<p>Failed to load product details.</p>';
    } finally { loader.style.display = 'none'; }
}
document.addEventListener('DOMContentLoaded', fetchProductDetails);