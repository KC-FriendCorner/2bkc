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
// 5. จัดการเมื่อผู้ใช้คลิกที่การแจ้งเตือน (เวอร์ชันรองรับลิงก์จากแอดมิน)
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    // ดึง URL จากข้อมูลที่ส่งมา (ถ้าไม่มีให้ไปหน้าข่าว)
    const targetUrl = event.notification.data?.link || '/#news';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // ถ้าเปิดหน้าเว็บค้างไว้แล้ว ให้ focus ไปที่หน้านั้น
            for (let client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // ถ้ายังไม่ได้เปิดหน้าเว็บ ให้เปิดหน้าใหม่
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});