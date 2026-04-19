// ==========================================
// 1. ระบบกลีบกุหลาบปลิว (Rose Petals Engine)
// ==========================================
function initPetalSystem() {
    const container = document.getElementById('petal-container');
    if (!container) return;
    const petals = ['🌹', '🌸', '🥀'];
    
    function createPetal() {
        const petal = document.createElement('div');
        petal.classList.add('rose-petal');
        petal.innerText = petals[Math.floor(Math.random() * petals.length)];
        
        const startPos = Math.random() * 100;
        const duration = Math.random() * 5 + 5;
        const size = Math.random() * 10 + 15;
        
        petal.style.left = startPos + 'vw';
        petal.style.animationDuration = duration + 's';
        petal.style.fontSize = size + 'px';
        petal.style.opacity = Math.random() * 0.5 + 0.3;
        
        container.appendChild(petal);
        setTimeout(() => petal.remove(), duration * 1000);
    }
    setInterval(createPetal, 600);
}

// ==========================================
// 2. ระบบนำทางหน้าเว็บ (Single Page Application)
// ==========================================
function navigateTo(pageId) {
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(p => p.classList.remove('active'));
    
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const onClickAttr = item.getAttribute('onclick') || "";
        const isActive = onClickAttr.includes(pageId);
        item.style.color = isActive ? '#E11D48' : '';
        item.style.fontWeight = isActive ? '700' : '400';
    });
}

// ==========================================
// 3. ระบบ Modal (แสดงรายละเอียดสมาชิก)
// ==========================================
function showMemberDetail(encodedData) {
    const member = JSON.parse(decodeURIComponent(encodedData));
    const modal = document.getElementById('memberModal');
    const modalBody = document.getElementById('modalBody');

    if (!modal || !modalBody) return;

    modalBody.innerHTML = `
        <div class="detail-container">
            <div class="detail-img-box">
                <img src="${member.image_url}" class="detail-img" onerror="this.src='https://via.placeholder.com/150'">
            </div>
            <div class="detail-text">
                <h3>${member.prefix}${member.first_name} ${member.last_name}</h3>
                <div class="detail-badge">${member.position}</div>
                <div class="detail-info-grid">
                    <p><strong>ชื่อเล่น:</strong> ${member.nickname || '-'}</p>
                    <p><strong>ฝ่าย:</strong> ${deptNames[member.department_id] || 'ไม่ระบุ'}</p>
                </div>
            </div>
        </div>
    `;
    modal.style.display = "flex";
}

function closeModal() {
    const modal = document.getElementById('memberModal');
    if (modal) modal.style.display = "none";
}

window.onclick = function(event) {
    const modal = document.getElementById('memberModal');
    if (event.target == modal) closeModal();
}

// ==========================================
// 4. เริ่มการทำงาน (Initialization)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initPetalSystem();
    navigateTo('home'); 
    if (typeof changeYear === 'function') {
        changeYear('2568'); 
    }
});