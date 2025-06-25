import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { addToCart } from "./main.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchProducts() {
    const productsGrid = document.getElementById('products-grid');
    const loader = document.getElementById('loader');
    loader.style.display = 'block'; productsGrid.innerHTML = '';
    try {
        const querySnapshot = await getDocs(collection(db, "Products"));
        if (querySnapshot.empty) { productsGrid.innerHTML = '<p>No products found.</p>'; } 
        else {
            const productsData = [];
            querySnapshot.forEach(doc => productsData.push({ id: doc.id, ...doc.data() }));
            productsData.forEach(product => {
                const discountedPrice = (product.price || 0) - ((product.price || 0) * (product.discountPercentage || 0) / 100);
                const primaryImage = (product.imageUrls && product.imageUrls[0]) || '';
                const productCard = `
                    <div class="product-card">
                        <a href="/product.html?id=${product.id}">
                            ${product.discountPercentage > 0 ? `<div class="discount-badge">${product.discountPercentage}% OFF</div>` : ''}
                            <div class="product-image-container" style="background-image: url('${primaryImage}')"></div>
                            <h3 class="product-name">${product.name || 'Untitled'}</h3>
                        </a>
                        <div class="product-price">
                            ${product.discountPercentage > 0 ? `<span class="original-price">₹${(product.price || 0).toFixed(2)}</span>` : ''}
                            <span class="current-price">₹${discountedPrice.toFixed(2)}</span>
                        </div>
                        <button class="btn btn-primary add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
                    </div>`;
                productsGrid.innerHTML += productCard;
            });
            productsGrid.addEventListener('click', (e) => {
                if (e.target.classList.contains('add-to-cart-btn')) {
                    const productId = e.target.dataset.productId;
                    const product = productsData.find(p => p.id === productId);
                    if (product) addToCart(product, productId);
                }
            });
        }
    } catch (error) { console.error("Error fetching products: ", error); productsGrid.innerHTML = '<p>Failed to load products.</p>'; } 
    finally { loader.style.display = 'none'; }
}
document.addEventListener('DOMContentLoaded', fetchProducts);