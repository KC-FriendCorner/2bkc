async function notifyAllMembers(newsText) {
  try {
    // 1. ดึง Tokens ทั้งหมดจาก Database
    const snapshot = await firebase.database().ref("fcm_tokens").once("value");
    const tokensData = snapshot.val();
    
    if (!tokensData) {
      console.log("ไม่มีผู้รับในระบบ");
      return;
    }

    // ใช้ Set เพื่อกรอง Token ที่อาจจะซ้ำกันออก (ป้องกันส่งซ้ำเครื่องเดิม)
    const allTokens = [...new Set(Object.values(tokensData).map((item) => item.token))];

    // 2. ส่งไปที่ Vercel API
    const response = await fetch("https://2bkc.smtekc.com/api/send-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        admin_key: "2BKC_SECRET_2026", // ใส่ Key เพื่อยืนยันตัวตนกับ API (ถ้าคุณเพิ่มในฝั่ง Vercel)
        tokens: allTokens,
        title: "📢 ข่าวใหม่จาก 2BKC!",
        body: newsText,
        link: "https://2bkc.smtekc.com/#news"
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`🚀 ส่งสำเร็จ: ${result.successCount} เครื่อง, ล้มเหลว: ${result.failureCount} เครื่อง`);
    
    // แสดง Alert ให้แอดมินทราบ
    alert(`แจ้งเตือนส่งออกไปแล้ว! (สำเร็จ ${result.successCount} เครื่อง)`);

  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการส่งแจ้งเตือน:", err);
    alert("การส่งแจ้งเตือนล้มเหลว กรุณาเช็ค Console");
  }
}