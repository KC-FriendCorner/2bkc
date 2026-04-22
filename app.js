/**
 * ฟังก์ชันเริ่มต้นระบบแจ้งเตือนอัตโนมัติ
 */
window.onload = () => {
    // หน่วงเวลา 2 วินาทีหลังหน้าเว็บโหลดเสร็จ เพื่อป้องกัน Browser บล็อก Popup อัตโนมัติ
    setTimeout(() => {
        initNotification();
    }, 2000);
};

async function initNotification() {
    // 1. เช็คว่ารองรับไหม
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.warn('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน');
        return;
    }

    // 2. เช็คว่าเคยโดนปฏิเสธไปแล้วหรือยัง
    if (Notification.permission === 'denied') {
        console.error('สิทธิ์แจ้งเตือนถูกบล็อกโดยผู้ใช้');
        return;
    }

    try {
        const messaging = firebase.messaging();

        // 3. รอให้ Service Worker พร้อมทำงาน
        const registration = await navigator.serviceWorker.ready;
        
        // 4. ขอสิทธิ์แจ้งเตือน (Popup จะเด้งที่นี่)
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('ผู้ใช้อนุญาตการแจ้งเตือนแล้ว');

            // 5. ดึง Token 
            // **สำคัญ: ต้องใส่ vapidKey ที่ก๊อปมาจาก Firebase Console**
            const token = await messaging.getToken({
                serviceWorkerRegistration: registration,
                vapidKey: 'คัดลอกรหัส VAPID Key ของคุณมาใส่ที่นี่' 
            });

            if (token) {
                await saveTokenToDatabase(token);
            }
        }
    } catch (err) {
        console.error('เกิดข้อผิดพลาด:', err);
    }
}

// ฟังก์ชันบันทึกลง Database
async function saveTokenToDatabase(token) {
    const safeToken = token.replace(/\./g, '_');
    try {
        await firebase.database().ref(`fcm_tokens/${safeToken}`).set({
            token: token,
            updatedAt: firebase.database.ServerValue.TIMESTAMP,
            platform: 'web'
        });
        console.log('ลงทะเบียน Token สำเร็จ!');
    } catch (error) {
        console.error('ไม่สามารถบันทึก Token ได้:', error);
    }
}