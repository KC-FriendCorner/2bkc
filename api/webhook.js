const express = require('express');
const { middleware } = require('@line/bot-sdk');
const app = express();

// 🚨 CRITICAL: นำ Channel Secret (ความลับแชนเนล) ของคุณมาใส่ที่นี่ 🚨
const config = {
  channelSecret: 'YOUR_LINE_CHANNEL_SECRET_FROM_OA_MANAGER', 
};

// Vercel จะสร้าง Endpoint ที่ /api/webhook ให้
app.post('/api/webhook', middleware(config), (req, res) => {
    
    // ตรวจสอบ Event และ Log User ID (เพื่อหา ADMIN_LINE_ID)
    if (req.body.events && req.body.events.length) {
        req.body.events.forEach(event => {
            if (event.source.userId) {
                // ข้อมูลนี้จะถูก Log ไปยัง Dashboard ของ Vercel
                console.log('✅ Found ADMIN User ID:', event.source.userId); 
            }
        });
    }

    // 💡 สำคัญ: ต้องตอบกลับด้วย HTTP 200 (OK) เสมอ
    res.status(200).send('OK'); 
});

module.exports = app;