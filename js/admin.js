import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, deleteDoc, setDoc, getDoc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { auth } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('admin-loader'), content = document.getElementById('admin-content');
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loader.style.display = 'none'; content.style.display = 'block';
            document.getElementById('admin-email').textContent = user.email; loadAllData();
        } else { window.location.href = '/login.html'; }
    });
    document.getElementById('add-product-form').addEventListener('submit', handleProductSubmit);
    document.getElementById('add-coupon-form').addEventListener('submit', handleCouponSubmit);
    document.getElementById('product-list').addEventListener('click', handleProductListClick);
    document.getElementById('coupon-list').addEventListener('click', handleCouponListClick);
    document.getElementById('order-list').addEventListener('click', handleOrderListClick);
    document.getElementById('product-cancel-btn').addEventListener('click', resetProductForm);
    document.getElementById('coupon-cancel-btn').addEventListener('click', resetCouponForm);
});
function loadAllData() { loadProducts(); loadCoupons(); loadOrders(); loadLeads(); }

async function processProductForm(form) {
    const urls = form.imageUrls.value.split('\n').map(url => url.trim()).filter(url => url);
    if (urls.length === 0) { alert("Please provide at least one image URL."); return null; }
    return { name: form.name.value, description: form.description.value, price: parseFloat(form.price.value), discountPercentage: parseFloat(form.discount.value), imageUrls: urls };
}
async function handleProductSubmit(e) { e.preventDefault(); const id = document.getElementById('edit-product-id').value; if (id) await handleUpdateProduct(id); else await handleAddProduct(); }
async function handleAddProduct() {
    const form = document.getElementById('add-product-form'), btn = document.getElementById('product-submit-btn');
    const data = await processProductForm(form); if (!data) return;
    btn.disabled = true; btn.textContent = 'Adding...';
    try {
        await addDoc(collection(db, "Products"), data); alert("Product added successfully!");
        resetProductForm(); loadProducts();
    } catch (e) { console.error("Error adding product: ", e); alert("Failed to add product."); } 
    finally { btn.disabled = false; btn.textContent = 'Add Product'; }
}
async function handleUpdateProduct(id) {
    const form = document.getElementById('add-product-form'), btn = document.getElementById('product-submit-btn');
    const data = await processProductForm(form); if (!data) return;
    btn.disabled = true; btn.textContent = 'Updating...';
    try {
        await updateDoc(doc(db, "Products", id), data); alert("Product updated successfully!");
        resetProductForm(); loadProducts();
    } catch (e) { console.error("Error updating product: ", e); alert("Failed to update product."); } 
    finally { btn.disabled = false; }
}
async function editProduct(id) {
    try {
        const snap = await getDoc(doc(db, "Products", id));
        if (snap.exists()) {
            const product = snap.data(), form = document.getElementById('add-product-form');
            form.name.value = product.name || ''; form.description.value = product.description || '';
            form.price.value = product.price || 0; form.discount.value = product.discountPercentage || 0;
            form.imageUrls.value = (product.imageUrls || []).join('\n');
            document.getElementById('edit-product-id').value = id;
            document.getElementById('product-form-title').textContent = 'Edit Product';
            document.getElementById('product-submit-btn').textContent = 'Update Product';
            document.getElementById('product-cancel-btn').style.display = 'inline-block';
            form.scrollIntoView({ behavior: 'smooth' });
        } else { alert("Product not found."); }
    } catch (e) { console.error("Error fetching product for edit:", e); }
}
function resetProductForm() {
    const form = document.getElementById('add-product-form'); form.reset();
    document.getElementById('edit-product-id').value = '';
    document.getElementById('product-form-title').textContent = 'Add New Product';
    document.getElementById('product-submit-btn').textContent = 'Add Product';
    document.getElementById('product-cancel-btn').style.display = 'none';
}
async function loadProducts() {
    const list = document.getElementById('product-list'); list.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    try {
        const snap = await getDocs(collection(db, "Products"));
        if (snap.empty) { list.innerHTML = '<tr><td colspan="5">No products found.</td></tr>'; return; }
        let html = '';
        snap.forEach(doc => {
            const p = doc.data(); const price = (typeof p.price === 'number') ? p.price : 0;
            const discount = (typeof p.discountPercentage === 'number') ? p.discountPercentage : 0;
            const img = (p.imageUrls && p.imageUrls[0]) || '';
            html += `<tr><td><img src="${img}" alt="${p.name || ''}" width="50"></td><td>${p.name || ''}</td><td>₹${price.toFixed(2)}</td><td>${discount}%</td><td><button class="btn btn-secondary btn-edit-product" data-id="${doc.id}">Edit</button><button class="btn btn-danger btn-delete-product" data-id="${doc.id}">Delete</button></td></tr>`;
        });
        list.innerHTML = html;
    } catch (e) { console.error("Error loading products: ", e); list.innerHTML = '<tr><td colspan="5">Error loading products.</td></tr>'; }
}
function handleProductListClick(e) { if (e.target.classList.contains('btn-edit-product')) editProduct(e.target.dataset.id); if (e.target.classList.contains('btn-delete-product')) deleteProduct(e.target.dataset.id); }
async function deleteProduct(id) { if (!confirm("Are you sure?")) return; try { await deleteDoc(doc(db, "Products", id)); alert("Product deleted!"); loadProducts(); resetProductForm(); } catch (e) { console.error("Error deleting product: ", e); alert("Failed to delete product."); } }

let allCoupons = [];
async function handleCouponSubmit(e) { e.preventDefault(); await handleAddOrUpdateCoupon(); }
async function handleAddOrUpdateCoupon() {
    const form = document.getElementById('add-coupon-form'), btn = document.getElementById('coupon-submit-btn'); btn.disabled = true;
    const code = form.code.value.toUpperCase(), discount = parseFloat(form['coupon-discount'].value);
    if (!code || !discount) { alert("Please fill all fields."); btn.disabled = false; return; }
    const isEditing = !!document.getElementById('edit-coupon-id').value;
    btn.textContent = isEditing ? 'Updating...' : 'Adding...';
    try { await setDoc(doc(db, "Coupons", code), { code, discountPercentage: discount, isActive: true }); alert(`Coupon ${isEditing ? 'updated' : 'added'}!`); resetCouponForm(); loadCoupons(); } catch (e) { console.error("Error saving coupon: ", e); alert("Failed to save coupon."); } finally { btn.disabled = false; }
}
function editCoupon(id) {
    const coupon = allCoupons.find(c => c.id === id);
    if (coupon) {
        const form = document.getElementById('add-coupon-form'); form.code.value = coupon.code; form.code.disabled = true; form['coupon-discount'].value = coupon.discountPercentage;
        document.getElementById('edit-coupon-id').value = id; document.getElementById('coupon-form-title').textContent = 'Edit Coupon';
        document.getElementById('coupon-submit-btn').textContent = 'Update Coupon'; document.getElementById('coupon-cancel-btn').style.display = 'inline-block';
        form.scrollIntoView({ behavior: 'smooth' });
    }
}
function resetCouponForm() {
    const form = document.getElementById('add-coupon-form'); form.reset(); form.code.disabled = false;
    document.getElementById('edit-coupon-id').value = ''; document.getElementById('coupon-form-title').textContent = 'Add New Coupon';
    document.getElementById('coupon-submit-btn').textContent = 'Add Coupon'; document.getElementById('coupon-cancel-btn').style.display = 'none';
}
async function loadCoupons() {
    const list = document.getElementById('coupon-list'); list.innerHTML = '<tr><td colspan="4">Loading...</td></tr>'; allCoupons = [];
    try {
        const snap = await getDocs(collection(db, "Coupons"));
        if (snap.empty) { list.innerHTML = '<tr><td colspan="4">No coupons found.</td></tr>'; return; }
        let html = '';
        snap.forEach(doc => { const c = doc.data(); allCoupons.push({ id: doc.id, ...c }); html += `<tr><td>${c.code}</td><td>${c.discountPercentage}%</td><td>${c.isActive ? 'Active' : 'Inactive'}</td><td><button class="btn btn-secondary btn-edit-coupon" data-id="${doc.id}">Edit</button><button class="btn btn-danger btn-delete-coupon" data-id="${doc.id}">Delete</button></td></tr>`; });
        list.innerHTML = html;
    } catch (e) { console.error("Error loading coupons: ", e); list.innerHTML = '<tr><td colspan="4">Error loading coupons.</td></tr>'; }
}
function handleCouponListClick(e) { if (e.target.classList.contains('btn-edit-coupon')) editCoupon(e.target.dataset.id); if (e.target.classList.contains('btn-delete-coupon')) deleteCoupon(e.target.dataset.id); }
async function deleteCoupon(id) { if (!confirm("Are you sure?")) return; try { await deleteDoc(doc(db, "Coupons", id)); alert("Coupon deleted!"); loadCoupons(); resetCouponForm(); } catch (e) { console.error("Error deleting coupon: ", e); alert("Failed to delete coupon."); } }

async function loadOrders() {
    const list = document.getElementById('order-list'); list.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
    try {
        const q = query(collection(db, "Orders"), orderBy("orderDate", "desc"));
        const snap = await getDocs(q);
        if (snap.empty) { list.innerHTML = '<tr><td colspan="6">No orders found.</td></tr>'; return; }
        let html = '';
        snap.forEach(doc => { const o = doc.data(); const items = o.items.map(i => `${i.name} (x${i.quantity})`).join('<br>'); html += `<tr><td>${doc.id}</td><td>${o.orderDate ? new Date(o.orderDate.seconds * 1000).toLocaleString() : ''}</td><td><strong>${o.customerInfo.name || ''}</strong><br>${o.customerInfo.phone || ''}<br>${o.customerInfo.address || ''}, ${o.customerInfo.pincode || ''}</td><td>${items}</td><td>Sub: ₹${(o.subtotal || 0).toFixed(2)}<br>Disc: ₹${(o.discountApplied || 0).toFixed(2)}<br><strong>Total: ₹${(o.totalAmount || 0).toFixed(2)}</strong></td><td><button class="btn btn-danger btn-delete-order" data-id="${doc.id}">Delete</button></td></tr>`; });
        list.innerHTML = html;
    } catch (e) { console.error("Error loading orders: ", e); list.innerHTML = '<tr><td colspan="6">Error loading orders.</td></tr>'; }
}
function handleOrderListClick(e) { if (e.target.classList.contains('btn-delete-order')) deleteOrder(e.target.dataset.id); }
async function deleteOrder(id) { if (!confirm("Are you sure?")) return; try { await deleteDoc(doc(db, "Orders", id)); alert("Order deleted!"); loadOrders(); } catch (e) { console.error("Error deleting order: ", e); alert("Failed to delete order."); } }

async function loadLeads() {
    const list = document.getElementById('leads-list'); list.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
    try {
        const q = query(collection(db, "Leads"), orderBy("capturedAt", "desc"));
        const snap = await getDocs(q);
        if (snap.empty) { list.innerHTML = '<tr><td colspan="3">No leads captured yet.</td></tr>'; return; }
        let html = '';
        snap.forEach(doc => { const lead = doc.data(); html += `<tr><td>${lead.name}</td><td>${lead.phone}</td><td>${lead.capturedAt ? new Date(lead.capturedAt.seconds * 1000).toLocaleString() : ''}</td></tr>`; });
        list.innerHTML = html;
    } catch (e) { console.error("Error loading leads: ", e); list.innerHTML = '<tr><td colspan="3">Error loading leads.</td></tr>'; }
}