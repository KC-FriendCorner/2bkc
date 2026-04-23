async function sendNotificationToAll(newsTitle) {
  const SERVER_KEY = "คัดลอกจาก Firebase Console (Legacy Server Key)";

  // 1. ดึง Token ทั้งหมดจาก Database
  const snapshot = await firebase.database().ref("fcm_tokens").once("value");
  const tokensData = snapshot.val();
  if (!tokensData) return;

  const tokens = Object.values(tokensData).map((t) => t.token);

  // 2. ส่ง Request ไปที่ FCM Server
  // หมายเหตุ: วิธีนี้ใช้ Firebase Legacy API ซึ่งยังใช้งานได้ดีในแผน Spark
  const fcmUrl = "https://fcm.googleapis.com/fcm/send";

  const message = {
    registration_ids: tokens, // ส่งแบบกลุ่ม
    notification: {
      title: "📢 ข่าวใหม่จาก 2BKC!",
      body: newsTitle,
      icon: "/img/logo.png",
      click_action: "https://2bkc.smtekc.com/#news",
    },
  };

  try {
    await fetch(fcmUrl, {
      method: "POST",
      headers: {
        Authorization: "key=" + SERVER_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
    console.log("ส่งแจ้งเตือนสำเร็จ!");
  } catch (error) {
    console.error("ส่งแจ้งเตือนไม่สำเร็จ:", error);
  }
}

async function notifyAllMembers(newsText) {
  try {
    // 1. ดึง Tokens ทั้งหมดจาก DB ใหม่ของคุณ (bkc-bc48f)
    const snapshot = await firebase.database().ref("fcm_tokens").once("value");
    const tokensData = snapshot.val();
    if (!tokensData) return console.log("ไม่มีผู้รับ");

    const allTokens = Object.values(tokensData).map((item) => item.token);

    // 2. ส่งไปที่ API (เปลี่ยน URL เป็นของโปรเจกต์ใหม่คุณบน Vercel)
    const response = await fetch("https://2bkc.smtekc.com/api/send-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokens: allTokens,
        title: "📢 ข่าวใหม่จาก 2BKC!",
        body: newsText,
        link: "https://2bkc.smtekc.com/#news", // เพิ่มลิงก์เข้าไปด้วย
      }),
    });

    const result = await response.json();
    // เปลี่ยนจาก result.count เป็น result.successCount ให้ตรงกับที่ API ส่งมา
    console.log("ส่งสำเร็จ:", result.successCount, "เครื่อง");
  } catch (err) {
    console.error("ผิดพลาด:", err);
  }
}
