importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

firebase.initializeApp({
    messagingSenderId: "486986521782" 
});

const messaging = firebase.messaging();

// 1. จัดการเมื่อมีการแจ้งเตือนเข้ามาตอนปิดหน้าจอ (Background)
messaging.onBackgroundMessage((payload) => {
    console.log('ได้รับข้อความแจ้งเตือนขณะปิดหน้าเว็บ:', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/img/2bkc.jpg', // อย่าลืมใส่ / นำหน้า path รูป
        data: {
            click_action: '/#news' // ใส่ข้อมูลหน้าที่จะไปไว้ในนี้
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// 2. จัดการเมื่อผู้ใช้ "คลิก" ที่แถบแจ้งเตือน
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // ปิดแถบแจ้งเตือนเมื่อกด

    // สั่งให้เปิดหน้าเว็บหน้าหลัก และติด Hash #news เพื่อให้ JS พาไปหน้าข่าว
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // ถ้าเปิดหน้าเว็บค้างไว้อยู่แล้ว ให้สลับไปหน้านั้นและเปลี่ยน URL
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes('/') && 'focus' in client) {
                    return client.focus().then(() => client.navigate('/#news'));
                }
            }
            // ถ้าไม่ได้เปิดเว็บไว้ ให้เปิดหน้าต่างใหม่ไปที่หน้าข่าวเลย
            if (clients.openWindow) {
                return clients.openWindow('/#news');
            }
        })
    );
});