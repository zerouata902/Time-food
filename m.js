let cart = [];
let selectedLatLng = null;
let restaurantLatLng = [29.692874,-9.732683];
let map, customerMarker;

const arabicPhrases = ["     مرحبا بالجميع   ",  " في المطعم  الألذ "];
let currentIndex = 0;
const arabicText = document.getElementById("arabic-text");

function updateArabicText() {
  arabicText.textContent = arabicPhrases[currentIndex];
  currentIndex = (currentIndex + 1) % arabicPhrases.length;
}

updateArabicText();
setInterval(updateArabicText, 3000); // كل 3 ثواني تبدل

// ✅ إضافة منتج للسلة
function addToCart(name, price, image) {
  let item = cart.find(i => i.name === name);
  if (item) {
    item.qty += 1;
  } else {
    cart.push({ name, price, image, qty: 1 });
  }
  updateTotal();
}

// ✅ تحديث المجموع
function updateTotal() {
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  document.getElementById("total").innerText = "Total: " + total + " DH";
}

// ✅ عرض صفحة السلة فقط إذا فيها عناصر
function goToCartPage() {
  if (cart.length === 0) {
    alert("🛒 السلة فارغة");
    return;
  }

  document.getElementById("cart-page").style.display = "block";
  showCartItems();
}

// ✅ عرض العناصر داخل السلة
function showCartItems() {
  const container = document.getElementById("cart-items");
  container.innerHTML = "";

  cart.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <img src="${item.image}">
      <div class="info">
        <strong>${item.name} ×${item.qty}</strong>
        <p>${item.price * item.qty} DH</p>
        <div class="qty-controls">
          <button onclick="changeQty(${index}, 1)">+</button>
          <button onclick="changeQty(${index}, -1)">-</button>
          <button onclick="removeItem(${index})">🗑️</button>
        </div>
      </div>`;
    container.appendChild(div);
  });

  updateTotal();
}

// ✅ تغيير أو حذف العناصر
function changeQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  showCartItems();
  updateTotal();
}

function removeItem(index) {
  cart.splice(index, 1);
  showCartItems();
  updateTotal();
}

// ====== إضافة: تعريف نصف قطر التوصيل (بالمتر)
const deliveryRadius = 2500; // 1000 متر

// ====== إضافة: حساب المسافة بين نقطتين LatLng
function getDistance(latlng1, latlng2) {
  const R = 6371000; // نصف قطر الأرض بالمتر
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(latlng2.lat - latlng1.lat);
  const dLng = toRad(latlng2.lng - latlng1.lng);
  const lat1 = toRad(latlng1.lat);
  const lat2 = toRad(latlng2.lat);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  return d; // بالمتر
}

// ✅ عرض اختيارات الطلب (مطعم / توصيل)
function showOrderOptions() {
  if (cart.length === 0) {
    alert("🛒 السلة فارغة");
    return;
  }
  document.getElementById("order-options").style.display = "block";
}

// ✅ اختيار نوع الطلب
function selectOption(type) {
  if (cart.length === 0) {
    alert("🛒 السلة فارغة");
    return;
  }

  // إخفاء خيارات الطلب فور اختيار النوع
  document.getElementById("order-options").style.display = "none";

  if (type === "delivery") {
    document.getElementById("map-container").style.display = "block";
    initMap();
  } else {
    document.getElementById("map-container").style.display = "none";
    sendWhatsAppOrder(); // مباشرة بدون خريطة
  }
}

// ✅ تهيئة الخريطة عند التوصيل فقط
function initMap() {
  if (window.mapInitialized) return;
  window.mapInitialized = true;

  map = L.map('map').setView(restaurantLatLng, 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  const restaurantIcon = L.icon({
    iconUrl: 'Logotime.png',
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    className: 'circular-icon' // 👈 باش نطبق CSS للتدوير
  });

  // ماركر المطعم
  L.marker(restaurantLatLng, { icon: restaurantIcon }).addTo(map).bindPopup(" دير العلامة في بلاصة لبغيتي اوصلك لها دوموند وشكرا ").openPopup();

  // دائرة حمراء وسط المطعم - نصف قطر 1000 متر
  L.circle(restaurantLatLng, {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.2,
    radius: deliveryRadius
  }).addTo(map);

  // تعامل مع الضغط على الخريطة
  map.on("click", function (e) {
    const dist = getDistance(e.latlng, { lat: restaurantLatLng[0], lng: restaurantLatLng[1] });
    if (dist > deliveryRadius) {
      alert("🛑 الموقع خارج منطقة التوصيل");
      return;
    }

    selectedLatLng = e.latlng;

    if (customerMarker) {
      customerMarker.setLatLng(selectedLatLng);
    } else {
      customerMarker = L.marker(selectedLatLng).addTo(map).bindPopup("✅ موقعك").openPopup();
    }

    document.getElementById("send-order-button").style.display = "block";
  });

  setTimeout(() => {
    map.invalidateSize();
  }, 300);
}
    
// ✅ إرسال الطلب للواتساب
function sendWhatsAppOrder() {
  if (document.getElementById("map-container").style.display === "block" && !selectedLatLng) {
    alert("🛑 من فضلك حدد موقعك على الخريطة أولاً.");
    return;
  }

  let message = "🛒 طلب :\n";
  cart.forEach(item => {
    message += `- ${item.name} ×${item.qty}: ${item.price * item.qty} DH\n`;
  });

  message += `\n✅ Total: ${cart.reduce((sum, i) => sum + i.price * i.qty, 0)} DH`;

  if (selectedLatLng) {
    message += `\n📍 Location: https://www.google.com/maps?q=${selectedLatLng.lat},${selectedLatLng.lng}`;
  }

  const url = "https://wa.me/212675251006?text=" + encodeURIComponent(message);
  window.open(url, "_blank");

  // إخفاء الخريطة وزر الإرسال بعد الطلب
  document.getElementById("map-container").style.display = "none";
  document.getElementById("send-order-button").style.display = "none";
}

// ✅ البحث على الأكلات
document.getElementById("search").addEventListener("input", function () {
  const query = this.value.toLowerCase();
  const items = document.querySelectorAll(".item");

  items.forEach(item => {
    const name = item.querySelector("h3").textContent.toLowerCase();
    item.style.display = name.includes(query) ? "block" : "none";
  });
});
