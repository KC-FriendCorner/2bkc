async function notifyAllMembers(newsText) {
  try {
    // 1. ดึง Tokens ทั้งหมดจาก Database
    const snapshot = await firebase.database().ref("fcm_tokens").once("value");
    const tokensData = snapshot.val();
    
    if (!tokensData) {
      console.log("ไม่มีผู้รับในระบบ");
      return;
    }

    // กรอง Token ซ้ำ
    const allTokens = [...new Set(Object.values(tokensData).map((item) => item.token))];

    // 2. ส่งไปที่ Vercel API
    // หมายเหตุ: เราจะไม่ส่งโครงสร้าง 'notification' แต่ส่งเป็น 'data' ทั้งหมด
    // เพื่อให้ Service Worker ในเครื่องผู้ใช้เป็นคนสั่งเด้งอันเดียวตาม Tag ที่เราตั้งไว้
    const response = await fetch("https://2bkc.smtekc.com/api/send-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        admin_key: "2BKC_SECRET_2026", 
        tokens: allTokens,
        // ปรับ Payload ให้เป็นมิตรกับ Service Worker
        dataPayload: {
          title: "📢 ข่าวใหม่จาก 2BKC!",
          body: newsText,
          link: "https://2bkc.smtekc.com/#news",
          icon: "https://2bkc.smtekc.com/img/2bkc.jpg"
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`🚀 Success: ${result.successCount}, Failure: ${result.failureCount}`);
    
    alert(`แจ้งเตือนส่งออกไปแล้ว! (ส่งสำเร็จ ${result.successCount} เครื่อง)`);

  } catch (err) {
    console.error("❌ Notification Error:", err);
    alert(`การส่งแจ้งเตือนล้มเหลว: ${err.message}`);
  }
}