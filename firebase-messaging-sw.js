/* Updated: 2026-04-23 17:15 - Forcing browser to update SW */
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

const firebaseConfig = {
  apiKey: "AIzaSyDi_0wqnyZ8AChvTXguj3Xwv07jEW7TOok",
  authDomain: "bkc-bc48f.firebaseapp.com",
  databaseURL: "https://bkc-bc48f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bkc-bc48f",
  storageBucket: "bkc-bc48f.firebasestorage.app",
  messagingSenderId: "486986521782",
  appId: "1:486986521782:web:da67a6a47d6f01b98e9a17"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ติดตั้งและบังคับใช้ Service Worker ตัวใหม่ทันที
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

/**
 * 🛠 ระบบจัดการการแจ้งเตือนขณะแอปอยู่เบื้องหลัง (Background Message)
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background Message Received:', payload);

  // 1. แยกแยะข้อมูล (Data Extraction)
  // พยายามดึงข้อมูลจากทั้ง payload.notification และ payload.data เพื่อความเสถียรสูงสุด
  const title = payload.notification?.title || payload.data?.title || "📢 ข่าวใหม่จาก 2BKC!";
  const body = payload.notification?.body || payload.data?.body || "กดเพื่ออ่านรายละเอียดเพิ่มเติม";
  const image = payload.notification?.image || payload.data?.image || payload.data?.icon || '/img/2bkc.jpg';
  const link = payload.data?.link || payload.notification?.click_action || '/#news';

  // 2. ป้องกันการเด้งซ้ำ (Double Notification Guard)
  // บน Android/Chrome ถ้ามี payload.notification มันจะเด้งเองอยู่แล้ว
  // แต่บน iOS หรือบางเบราว์เซอร์ การสั่ง showNotification เองจะชัวร์กว่าในกรณี Data-only
  if (payload.notification && !isIOS()) {
    console.log('[SW] Browser handles standard notification.');
    return;
  }

  const notificationOptions = {
    body: body,
    icon: '/img/2bkc.jpg', // ไอคอนเล็กด้านซ้าย
    image: image,         // รูปภาพประกอบขนาดใหญ่ (ถ้ามี)
    badge: '/img/2bkc.jpg',
    tag: '2bkc-news-sync', // ส่งกี่ครั้งก็ได้ แต่จะทับอันเดิม ไม่รก Notification Center
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: link
    },
    // สำหรับ iOS/PWA: ช่วยให้การแจ้งเตือนดูเป็น Native มากขึ้น
    actions: [
      { action: 'open', title: '📂 เปิดอ่าน' },
      { action: 'close', title: 'ปิด' }
    ]
  };

  return self.registration.showNotification(title, notificationOptions);
});

/**
 * 🖱 ระบบจัดการเมื่อมีการคลิกที่การแจ้งเตือน
 */
self.addEventListener('notificationclick', function(event) {
  const clickedAction = event.action;
  event.notification.close();

  if (clickedAction === 'close') return;

  // จัดการ URL
  const targetUrl = new URL(event.notification.data?.url || '/#news', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // 1. ถ้ามีหน้าเว็บเปิดค้างไว้แล้ว ให้สลับไปที่หน้านั้นแล้ว Refresh หรือ Navigate
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(targetUrl).then(c => c.focus());
        }
      }
      // 2. ถ้ายังไม่มีหน้าเว็บเปิดอยู่ ให้เปิดหน้าใหม่
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ฟังก์ชันช่วยตรวจสอบว่าเป็น iOS หรือไม่
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}