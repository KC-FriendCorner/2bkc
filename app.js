/**
 * 2BKC Notification System
 * Version: 1.0.0 (Production)
 */

// 1. ตั้งค่าสถานะเริ่มต้น
const VAPID_PUBLIC_KEY =
  "BGul7Ob55G5r8huiGNlqFVtkSAB72MCGD6jEuiSyRJiYYmYiq6PIEEq3jq62xIHKM1odTfDulIZwIviON0MpYmw";

// 2. ลงทะเบียน Service Worker ทันทีที่โหลดไฟล์
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then((registration) => {
      console.log("✅ Service Worker Registered. Scope:", registration.scope);
    })
    .catch((error) => {
      console.error("❌ Service Worker Registration Failed:", error);
    });
}

/**
 * ฟังก์ชันหลักในการตั้งค่าการแจ้งเตือน
 */
async function initNotification() {
  // ตรวจสอบความพร้อมของ Browser
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    console.warn("เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน");
    return;
  }

  // กรณีผู้ใช้เคยบล็อกไว้
  if (Notification.permission === "denied") {
    console.error("Notification permission was previously denied.");
    return;
  }

  try {
    // รอให้ Service Worker พร้อมใช้งานจริงๆ (ลดปัญหา AbortError)
    const registration = await navigator.serviceWorker.ready;

    // ขอสิทธิ์การแจ้งเตือน (Browser จะเด้ง Popup ที่นี่)
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("🔔 Notification permission granted.");

      const messaging = firebase.messaging();

      // ดึง FCM Token
      const token = await messaging.getToken({
        serviceWorkerRegistration: registration,
        vapidKey: VAPID_PUBLIC_KEY,
      });

      if (token) {
        console.log("🎫 Current Token:", token);
        await saveTokenToDatabase(token);
      } else {
        console.warn(
          "No registration token available. Request permission to generate one.",
        );
      }
    } else {
      console.warn("Permission not granted for notifications.");
    }
  } catch (error) {
    // 1. พ่น Error ตัวเต็มออกมาดูว่า Google ฟ้องว่าอะไร
    console.error("❌ FCM Debug Error:", error);

    // 2. ตรวจสอบสาเหตุเฉพาะหน้า
    if (
      error.code === "messaging/permission-blocked" ||
      error.name === "NotAllowedError"
    ) {
      console.error(
        "การลงทะเบียนล้มเหลว: ผู้ใช้ปิดกั้นสิทธิ์หรือเบราว์เซอร์ปฏิเสธ",
      );
    } else if (error.code === "messaging/failed-service-worker-registration") {
      console.error(
        "การจดทะเบียน Service Worker ล้มเหลว (เช็คตำแหน่งไฟล์ .js)",
      );
    } else {
      console.error("เกิดข้อผิดพลาดอื่นๆ:", error.message);
    }
  }
}

/**
 * บันทึก Token ลง Firebase Realtime Database
 */
async function saveTokenToDatabase(token) {
  // เปลี่ยนจุดเป็นขีดล่างเพื่อให้เป็น Key ของ Database ได้
  const safeToken = token.replace(/\./g, "_");
  const database = firebase.database();

  try {
    await database.ref(`fcm_tokens/${safeToken}`).set({
      token: token,
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
      platform: "web",
      userAgent: navigator.userAgent, // เก็บข้อมูลเบราว์เซอร์เพื่อการวิเคราะห์
    });
    console.log("🚀 Token saved to database successfully!");
  } catch (dbError) {
    console.error("❌ Error saving token to database:", dbError);
  }
}

/**
 * รันระบบอัตโนมัติแบบหน่วงเวลา (ป้องกันการโดนเบราว์เซอร์บล็อก Popup)
 */
window.addEventListener("load", () => {
  // หน่วงเวลา 3 วินาทีเพื่อให้หน้าเว็บโหลดทรัพยากรอื่นเสร็จก่อน
  setTimeout(() => {
    initNotification();
  }, 3000);
});
