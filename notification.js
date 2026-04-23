async function notifyAllMembers(newsText) {
    if (!newsText) return;

    try {
        // 1. ดึง Tokens
        const snapshot = await firebase.database().ref("fcm_tokens").once("value");
        const tokensData = snapshot.val();
        
        if (!tokensData) {
            console.warn("⚠️ ไม่มีผู้รับในระบบ (No tokens found)");
            return;
        }

        // กรอง Token ซ้ำให้สะอาดที่สุด
        const allTokens = [...new Set(Object.values(tokensData).map(item => item.token))];

        // 2. ยิงไปที่ Vercel API
        const response = await fetch("https://2bkc.smtekc.com/api/send-notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                admin_key: "2BKC_SECRET_2026", 
                tokens: allTokens,
                dataPayload: {
                    title: "📢 ข่าวใหม่จาก 2BKC!",
                    body: newsText,
                    link: "https://2bkc.smtekc.com/#news",
                    icon: "https://2bkc.smtekc.com/img/2bkc.jpg"
                }
            }),
        });

        // ตรวจสอบสถานะการส่ง
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Server Error: ${response.status}`);
        }

        console.log(`🚀 Success: ${result.successCount}, Failed: ${result.failureCount}`);
        alert(`🔔 แจ้งเตือนสำเร็จ!\nส่งถึง: ${result.successCount} เครื่อง\nล้มเหลว: ${result.failureCount} เครื่อง`);

    } catch (err) {
        console.error("❌ Notification Error:", err);
        alert(`เกิดข้อผิดพลาด: ${err.message}`);
    }
}