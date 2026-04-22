// 1. นำเข้า SDK (ใช้เวอร์ชัน 8.10.0 ตาม index.html)
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

// 2. ตั้งค่า Config (ต้องเหมือนกับใน index.html เป๊ะๆ)
const firebaseConfig = {
  apiKey: "AIzaSyDi_0wqnyZ8AChvTXguj3Xwv07jEW7TOok",
  authDomain: "bkc-bc48f.firebaseapp.com",
  databaseURL: "https://bkc-bc48f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bkc-bc48f",
  storageBucket: "bkc-bc48f.firebasestorage.app",
  messagingSenderId: "486986521782",
  appId: "1:486986521782:web:da67a6a47d6f01b98e9a17"
};

// 3. เริ่มต้น Firebase ใน Service Worker
firebase.initializeApp(firebaseConfig);

// 4. สร้างตัวแปร Messaging
const messaging = firebase.messaging();

// 5. (ทางเลือก) จัดการเมื่อผู้ใช้คลิกที่การแจ้งเตือน
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/#news') // เมื่อคลิกให้เปิดไปที่หน้าข่าว
    );
});