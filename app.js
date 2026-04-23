/**
 * 2BKC Notification System - Self-Healing Production Version (Enhanced iOS Support)
 */

// ดึงค่า VAPID KEY (ใส่ Fallback เผื่อไว้กันพลาด)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || "BGul7Ob55G5r8huiGNlqFVtkSAB72MCGD6jEuiSyRJiYYmYiq6PIEEq3jq62xIHKM1odTfDulIZwIviON0MpYmw";

const isOnline = () => navigator.onLine;

/**
 * 1. ตรวจสอบ Platform (iOS มีความสำคัญมากต่อ Web Push)
 */
const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    return {
        platform: isIOS ? "iOS" : "Android/Web",
        isStandalone: isStandalone,
        userAgent: ua
    };
};

/**
 * 2. ลงทะเบียน Service Worker
 */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/firebase-messaging-sw.js")
            .then((reg) => console.log("✅ SW Scope:", reg.scope))
            .catch((err) => console.error("❌ SW Failed:", err));
    });
}

/**
 * 3. ฟังก์ชันซ่อมแซมและ Sync Token (Core Logic)
 */
async function forceSyncToken() {
    if (!isOnline()) return;

    // เช็คการรองรับ Web Push (iOS 16.4+ ถึงจะรองรับ)
    if (!('PushManager' in window)) {
        console.warn("⚠️ Browser นี้ไม่รองรับ Push Notifications");
        return;
    }

    // กรณี Permission ยังไม่ได้รับอนุญาต (ให้หยุดรอจนกว่า User จะเปิดใช้งานจากหน้าเว็บ)
    if (Notification.permission !== "granted") {
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const messaging = firebase.messaging();

        // ดึง Token
        const token = await messaging.getToken({
            serviceWorkerRegistration: registration,
            vapidKey: VAPID_PUBLIC_KEY,
        });

        if (token) {
            const lastToken = localStorage.getItem("fcm_token_last");
            const lastSync = localStorage.getItem("fcm_token_sync_time");
            const now = Date.now();

            // เงื่อนไขการ Sync: Token เปลี่ยน | ข้อมูลหาย | เกิน 12 ชม.
            if (token !== lastToken || !lastSync || now - parseInt(lastSync) > 43200000) {
                console.log("♻️ Syncing/Repairing Token...");
                await saveTokenToDatabase(token);
                localStorage.setItem("fcm_token_last", token);
                localStorage.setItem("fcm_token_sync_time", now.toString());
            }
        }
    } catch (error) {
        // กรณี Error messaging/permission-blocked ให้ทำความสะอาด LocalStorage
        if (error.code === 'messaging/permission-blocked') {
            console.warn("🚫 Notification permission blocked by user.");
        }
        console.error("❌ Token Sync Error:", error);
    }
}

/**
 * 4. บันทึก Token ลง Database
 */
async function saveTokenToDatabase(token) {
    if (!isOnline()) return;

    // สร้าง Key ที่สั้นลงและไม่มีตัวอักษรต้องห้ามของ Firebase
    const safeTokenKey = btoa(token).substring(0, 45).replace(/[+/=]/g, "_");
    const info = getDeviceInfo();

    try {
        await firebase.database().ref(`fcm_tokens/${safeTokenKey}`).set({
            token: token,
            lastActive: firebase.database.ServerValue.TIMESTAMP,
            platform: info.platform,
            isStandalone: info.isStandalone,
            userAgent: info.userAgent
        });
        console.log("🚀 [2BKC] Token Health: Good!");
    } catch (dbError) {
        console.error("❌ DB Update Failed:", dbError);
    }
}

/**
 * 5. ระบบตรวจจับสถานะ (Event Listeners)
 */

// ก. เช็คเมื่อเปิดแอป (Delay 3 วิ เพื่อให้ระบบ OS รันเรียบร้อย)
window.addEventListener("load", () => {
    setTimeout(forceSyncToken, 3000);
});

// ข. หัวใจสำคัญของ iOS PWA: เมื่อสลับแอปกลับมา (Focus) ให้เช็ค Token ทันที
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        forceSyncToken();
    }
});

// ค. เช็คเมื่อต่อเน็ต
window.addEventListener("online", forceSyncToken);

// ง. Token Refresh (สำหรับ Firebase v8)
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
        const messaging = firebase.messaging();
        messaging.onTokenRefresh(async () => {
            console.log("🔄 Firebase Triggered: Token Refresh");
            const refreshedToken = await messaging.getToken({
                serviceWorkerRegistration: registration,
                vapidKey: VAPID_PUBLIC_KEY
            });
            await saveTokenToDatabase(refreshedToken);
        });
    });
}