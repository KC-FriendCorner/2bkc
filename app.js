function initNotification() {
    const messaging = firebase.messaging();
    
    messaging.requestPermission()
        .then(() => messaging.getToken())
        .then((token) => {
            if (token) {
                // เก็บ Token ลง Database (เปลี่ยนจุดเป็น _ เพื่อให้ DB ยอมรับ)
                const safeToken = token.replace(/\./g, '_');
                firebase.database().ref('fcm_tokens/' + safeToken).set({
                    token: token,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                });
            }
        })
        .catch((err) => console.log('User denied notification', err));
}