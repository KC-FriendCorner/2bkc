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

// --- ส่วนที่เพิ่มเข้ามาเพื่อให้เด้งตอนปิดเว็บ ---
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/img/2bkc.jpg', // ใส่ Path ไอคอนเว็บคุณ
    data: {
      link: payload.data?.link || payload.notification?.click_action || '/#news'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// --- ส่วนจัดการการคลิก (ปรับปรุงให้แม่นยำขึ้น) ---
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const targetUrl = event.notification.data?.link || '/#news';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // ตรวจสอบว่ามีหน้าเว็บเปิดอยู่แล้วหรือไม่
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // ถ้ามีหน้าเว็บเปิดอยู่ ให้ Focus และเปลี่ยน URL ไปหน้าข่าว
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // ถ้าไม่มีหน้าเว็บเปิดอยู่เลย ให้เปิดหน้าใหม่
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});