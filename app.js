/**
 * 2BKC Notification System - Self-Healing Production Version (Enhanced iOS Support)
 */

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_KEY ||
  "BGul7Ob55G5r8huiGNlqFVtkSAB72MCGD6jEuiSyRJiYYmYiq6PIEEq3jq62xIHKM1odTfDulIZwIviON0MpYmw";
const isOnline = () => navigator.onLine;

/**
 * 1. ตรวจสอบ Platform & Device Info
 */
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  return {
    platform: isIOS ? "iOS" : "Android/Web",
    isStandalone: isStandalone,
    userAgent: ua,
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
 * 3. ฟังก์ชันตรวจสอบและซ่อมแซม Token (The Smart Repair Core)
 */
async function forceSyncToken() {
  if (!isOnline()) return;

  if (!("PushManager" in window)) {
    console.warn("⚠️ Browser นี้ไม่รองรับ Push Notifications");
    return;
  }

  // หยุดทำงานถ้ายังไม่ได้รับอนุญาต
  if (Notification.permission !== "granted") return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const messaging = firebase.messaging();

    // --- ส่วนที่ปรับปรุง: ตรวจสอบสถานะเดิมก่อน ---

    // 1. ลองดึง Token ที่มีอยู่แล้วในเครื่อง (ถ้ามี)
    const currentToken = await messaging.getToken({
      serviceWorkerRegistration: registration,
      vapidKey: VAPID_PUBLIC_KEY,
    });

    const lastToken = localStorage.getItem("fcm_token_last");
    const lastSync = localStorage.getItem("fcm_token_sync_time");
    const now = Date.now();

    // ตรวจสอบว่า "ต้องสร้างหรืออัปเดตใหม่หรือไม่"
    // เงื่อนไขคือ: ไม่มี Token เลย | Token เปลี่ยนไปจากเดิม | ข้อมูลในเครื่องหายไป
    const needsUpdate =
      !currentToken || currentToken !== lastToken || !lastSync;

    if (needsUpdate) {
      console.log(
        "🆕 ไม่พบ Token เดิมหรือ Token เปลี่ยนแปลง... กำลังสร้างและบันทึกใหม่",
      );

      // บันทึกลง Database และ LocalStorage
      if (currentToken) {
        await saveTokenToDatabase(currentToken);
        localStorage.setItem("fcm_token_last", currentToken);
        localStorage.setItem("fcm_token_sync_time", now.toString());
      }
    } else {
      // กรณีมี Token เดิมอยู่แล้ว และยังไม่ถึงเวลาต้อง Refresh (เช่น ทุก 12 ชม.)
      // เราแค่ส่ง Heartbeat ไปอัปเดต timestamp ว่า User ยัง Online อยู่พอ
      if (now - parseInt(lastSync) > 43200000) {
        // เกิน 12 ชม.
        console.log(
          "♻️ Token เดิมยังใช้ได้ แต่อัปเดตเวลาใช้งานล่าสุด (Heartbeat)",
        );
        await saveTokenToDatabase(currentToken);
        localStorage.setItem("fcm_token_sync_time", now.toString());
      } else {
        console.log("✅ Token ยังสมบูรณ์และเป็นอันล่าสุด ไม่ต้องสร้างใหม่");
      }
    }
  } catch (error) {
    console.error("❌ Token Logic Error:", error);
  }
}

/**
 * 4. บันทึก Token ลง Database
 */
async function saveTokenToDatabase(token) {
  if (!isOnline()) return;

  const safeTokenKey = btoa(token).substring(0, 45).replace(/[+/=]/g, "_");
  const info = getDeviceInfo();

  try {
    await firebase.database().ref(`fcm_tokens/${safeTokenKey}`).update({
      token: token,
      lastActive: firebase.database.ServerValue.TIMESTAMP,
      platform: info.platform,
      isStandalone: info.isStandalone,
      userAgent: info.userAgent,
    });
    console.log("🚀 [2BKC] Token Health: Good!");
  } catch (dbError) {
    console.error("❌ DB Update Failed:", dbError);
  }
}

/**
 * 5. ฟังก์ชันขออนุญาตแจ้งเตือน (Permission Request)
 */
async function checkAndRequestNotificationPermission() {
  if (!("Notification" in window)) return;

  if (Notification.permission === "default") {
    console.log("🔔 Asking for permission...");
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        console.log("✅ Permission Granted");
        await forceSyncToken();
      }
    } catch (error) {
      console.error("❌ Permission Error:", error);
    }
  }
}

/**
 * 6. ระบบจัดการ Navigation & Auto-Permission
 */
// ใช้การหุ้มฟังก์ชันเดิม (Wrapper) เพื่อความปลอดภัย
function wrapNavigation() {
  const originalNavigateTo = window.navigateTo;

  window.navigateTo = function (pageId) {
    // ทำงานเดิมของมัน
    if (typeof originalNavigateTo === "function") {
      originalNavigateTo(pageId);
    }

    // เงื่อนไขพิเศษ: ถ้าไปหน้า news ให้ขออนุญาตทันที
    if (pageId === "news") {
      checkAndRequestNotificationPermission();
    }
  };
}

/**
 * 7. Event Listeners (Runtime)
 */

window.addEventListener("load", () => {
  // หุ้มฟังก์ชันหลังจากโหลดหน้าเว็บเสร็จเพื่อให้แน่ใจว่า navigateTo ตัวจริงโหลดมาแล้ว
  wrapNavigation();

  // ตรวจสอบ Token หลังจากโหลด 3 วิ
  setTimeout(forceSyncToken, 3000);
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    forceSyncToken();
  }
});

window.addEventListener("online", forceSyncToken);

// Firebase Token Refresh logic
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    const messaging = firebase.messaging();
    messaging.onTokenRefresh(async () => {
      const refreshedToken = await messaging.getToken({
        serviceWorkerRegistration: registration,
        vapidKey: VAPID_PUBLIC_KEY,
      });
      await saveTokenToDatabase(refreshedToken);
    });
  });
}
