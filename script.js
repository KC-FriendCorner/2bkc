// ==========================================
// 1. ระบบนำทางหน้าเว็บ (Single Page Application)
// ==========================================
// ==========================================
// ระบบนำทาง (Navigation System) แบบ Hash
// ==========================================

function navigateTo(pageId) {
    // 1. อัปเดต URL เป็นแบบ Hash (เช่น index.html#members)
    // วิธีนี้ Refresh ยังไงก็ไม่ Error 404
    window.location.hash = pageId;

    // 2. เรียกฟังก์ชันแสดงผลหน้าจอ
    showPage(pageId);
}

function showPage(pageId) {
    const pages = document.querySelectorAll(".page-content");
    let targetFound = false;

    // 3. จัดการการซ่อน/แสดง Content ด้วย Class และ Display
    pages.forEach((page) => {
        if (page.id === pageId) {
            page.style.display = "block";
            // เพิ่ม class active สำหรับทำแอนิเมชั่น Fade-in (ถ้ามี)
            setTimeout(() => page.classList.add("active"), 10); 
            targetFound = true;
        } else {
            page.style.display = "none";
            page.classList.remove("active");
        }
    });

    // ถ้าพิมพ์ URL มั่วมา ให้กลับไปหน้าหลัก
    if (!targetFound && pageId !== 'home') {
        navigateTo('home');
        return;
    }

    // 4. เลื่อนขึ้นบนสุด
    window.scrollTo({ top: 0, behavior: "smooth" });

    // 5. อัปเดตสถานะเมนู (Navbar)
    updateNavUI(pageId);
}

// ฟังก์ชันอัปเดตสีปุ่มใน Navbar
function updateNavUI(pageId) {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
        // ตรวจสอบว่าปุ่มนี้มี onclick ที่ตรงกับหน้าปัจจุบันไหม
        const isSelected = item.getAttribute("onclick")?.includes(`'${pageId}'`);
        if (isSelected) {
            item.classList.add("nav-active"); // ใช้ class ตามที่คุณตั้งใน CSS
        } else {
            item.classList.remove("nav-active");
        }
    });
}

// ==========================================
// ระบบตรวจจับเหตุการณ์ (Event Listeners)
// ==========================================

// 1. เมื่อโหลดหน้าเว็บครั้งแรก (รวมถึงตอน Refresh)
window.addEventListener("load", () => {
    // อ่านค่าจาก Hash เช่น #members -> members
    const path = window.location.hash.replace("#", "") || "home";
    showPage(path);
});

// 2. เมื่อมีการเปลี่ยน Hash (เช่น กดปุ่ม Back/Forward ของ Browser)
window.addEventListener("hashchange", () => {
    const path = window.location.hash.replace("#", "") || "home";
    showPage(path);
});

// ==========================================
// 2. ระบบ Modal (แสดงรายละเอียดสมาชิก)
// ==========================================
function showMemberDetail(encodedData) {
  const member = JSON.parse(decodeURIComponent(encodedData));
  const modal = document.getElementById("memberModal");
  const modalBody = document.getElementById("modalBody");

  if (!modal || !modalBody) return;

  modalBody.innerHTML = `
    <div class="member-detail-wrapper">
        <div class="member-header">
            <div class="profile-circle">
                <img src="${member.image_url}" loading="lazy" onerror="this.src='https://via.placeholder.com/150'">
            </div>
            <div class="profile-main-info">
                <h2>${member.prefix}${member.first_name} ${member.last_name} (${member.nickname || "-"})</h2>
                <span class="position-badge"><i class="fas fa-id-badge"></i> ${member.position}</span>
            </div>
        </div>

        <hr class="divider">

        <div class="info-section">
            <div class="info-item">
                <div class="info-icon"><i class="fas fa-users"></i></div>
                <div class="info-content">
                    <label>ฝ่าย</label>
                    <span>${deptNames[member.department_id] || "ไม่ระบุ"}</span>
                </div>
            </div>

            <div class="info-item">
                <div class="info-icon"><i class="fas fa-graduation-cap"></i></div>
                <div class="info-content">
                    <label>ระดับชั้น / ปีการศึกษา</label>
                    <span>${member.student_level || "ไม่ระบุ"} | ${member.academic_year}</span>
                </div>
            </div>

            <div class="info-item">
                <div class="info-icon"><i class="fab fa-instagram"></i></div>
                <div class="info-content">
                    <label>ช่องทางการติดต่อ</label>
                    ${
                      member.instagram
                        ? `<a href="https://www.instagram.com/${member.instagram.replace("@", "")}/" 
                              target="_blank" 
                              style="text-decoration: none; color: #E4405F; font-weight: 500; display: flex; align-items: center; gap: 4px;">
                              @${member.instagram.replace("@", "")} 
                              <i class="fas fa-external-link-alt" style="font-size: 0.7rem;"></i>
                           </a>`
                        : `<span style="color: #999;">ไม่มีข้อมูล</span>`
                    }
                </div>
            </div>
        </div>
    </div>
`;
  modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("memberModal");
  if (modal) modal.style.display = "none";
}

window.onclick = function (event) {
  const modal = document.getElementById("memberModal");
  if (event.target == modal) closeModal();
};

// ==========================================
// 3. เริ่มการทำงาน (Initialization)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // ยกเลิกระบบกุหลาบแล้ว
  navigateTo("home");
  if (typeof changeYear === "function") {
    changeYear("2568");
  }
});

function toggleMobileMenu() {
  const btn = document.getElementById("mobileMenuBtn");
  const overlay = document.getElementById("mobileMenuOverlay");

  btn.classList.toggle("active");
  overlay.classList.toggle("show");
}

function handleMobileNav(pageId) {
  navigateTo(pageId); // ฟังก์ชันเปลี่ยนหน้าเดิมของคุณ
  toggleMobileMenu(); // ปิดเมนูหลังจากเลือก
}

// ปิดเมนูเมื่อคลิกข้างนอก
window.onclick = function (event) {
  const overlay = document.getElementById("mobileMenuOverlay");
  const btn = document.getElementById("mobileMenuBtn");
  if (!overlay.contains(event.target) && !btn.contains(event.target)) {
    overlay.classList.remove("show");
    btn.classList.remove("active");
  }
};

// --- 1. ตัวแปร Global และการตั้งค่า ---
let activeSliders = []; // เก็บ Interval สำหรับล้างค่า
let localNewsData = {}; // เก็บข้อมูลข่าวไว้ชั่วคราวเพื่อใช้เปิด Modal โดยไม่ต้องดึงจาก Firebase ซ้ำ

// --- 2. ฟังก์ชันหลัก: ดึงข้อมูลและแสดงผลข่าวสาร ---
function initNewsSystem() {
  const newsContainer = document.getElementById("newsContainer");
  if (!newsContainer) return;

  // ดึงข้อมูล Real-time จาก Firebase
  database.ref("news").on("value", (snapshot) => {
    // ล้างค่าเก่า
    activeSliders.forEach((interval) => clearInterval(interval));
    activeSliders = [];
    newsContainer.innerHTML = "";
    localNewsData = snapshot.val() || {};

    if (!snapshot.exists()) {
      newsContainer.innerHTML =
        '<div class="loading-status">ยังไม่มีข่าวสารในขณะนี้</div>';
      return;
    }

    // แปลงเป็น Array และเรียงลำดับ (วันที่ล่าสุดขึ้นก่อน)
    const newsList = Object.keys(localNewsData)
      .map((key) => ({
        id: key,
        ...localNewsData[key],
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    newsList.forEach((news) => {
      // จัดเตรียมรูปสำหรับ Slider หน้าปก (รูปปก + รูปเพิ่มเติม)
      const slideImages =
        news.more_images && news.more_images.length > 0
          ? news.more_images
          : [news.image || "img/default-news.jpg"];

      const card = document.createElement("div");
      card.className = "news-card";
      // ให้คลิกที่ตัว Card เพื่อเปิด Modal ได้เลย
      card.onclick = (e) => {
        if (!e.target.closest(".btn-view-more")) openNewsModal(news.id);
      };

      const sliderHtml = `
                <div class="news-slider">
                    <div class="slider-track" id="track-${news.id}" style="width: ${slideImages.length * 100}%; display: flex; transition: transform 0.8s cubic-bezier(0.45, 0, 0.55, 1);">
                        ${slideImages
                          .map(
                            (url) => `
                            <img src="${url}" class="slider-img" style="width: ${100 / slideImages.length}%; height: 240px; object-fit: cover;" onerror="this.src='img/default-news.jpg'">
                        `,
                          )
                          .join("")}
                    </div>
                </div>
            `;

      card.innerHTML = `
                ${sliderHtml}
                <div class="news-info">
                    <span class="news-date"><i class="far fa-calendar-alt"></i> ${news.date}</span>
                    <h3 class="news-title">${news.title}</h3>
                    <p class="news-desc">${news.content.substring(0, 100)}${news.content.length > 100 ? "..." : ""}</p>
                    <button class="btn-view-more" onclick="openNewsModal('${news.id}')">
                        <i class="fas fa-plus-circle"></i> ดูรายละเอียด
                    </button>
                </div>
            `;

      newsContainer.appendChild(card);

      // เริ่ม Auto Slide ถ้ามีมากกว่า 1 รูป
      if (slideImages.length > 1) {
        startAutoSlide(news.id, slideImages.length);
      }
    });
  });
}

// --- 3. ระบบ Auto-Slide หน้าปก ---
function startAutoSlide(newsId, totalImages) {
  let currentIdx = 0;
  const interval = setInterval(() => {
    const track = document.getElementById(`track-${newsId}`);
    if (track) {
      currentIdx = (currentIdx + 1) % totalImages;
      const movePercentage = currentIdx * (100 / totalImages);
      track.style.transform = `translateX(-${movePercentage}%)`;
    } else {
      clearInterval(interval); // ล้างถ้าหา Element ไม่เจอแล้ว
    }
  }, 4000); // เปลี่ยนรูปทุก 4 วินาที

  activeSliders.push(interval);
}

function openNewsModal(newsId) {
  const item = localNewsData[newsId];
  if (!item) return;

  // 1. เติมข้อมูลลงในหน้า Detail
  document.getElementById("newsModalTitle").innerText = item.title;
  document.getElementById("newsModalDate").innerHTML =
    `<i class="far fa-calendar-alt"></i> โพสต์เมื่อ: ${item.date}`;
  document.getElementById("newsModalBody").innerHTML = item.content.replace(
    /\n/g,
    "<br>",
  ); // รองรับการขึ้นบรรทัดใหม่

  // 2. จัดการรูปภาพประกอบ
  const gallery = document.getElementById("newsModalImages");
  gallery.innerHTML = "";
  const allImages = item.more_images || (item.image ? [item.image] : []);

  allImages.forEach((imgUrl) => {
    gallery.innerHTML += `
            <div class="news-gallery-item">
                <img src="${imgUrl}" onclick="window.open('${imgUrl}', '_blank')" alt="News Image">
            </div>`;
  });

  // 3. สลับหน้า: ซ่อน List และโชว์ Detail
  document.getElementById("newsListView").style.display = "none";
  document.getElementById("newsDetailView").style.display = "block";

  // เลื่อนหน้าจอขึ้นไปบนสุด
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeNewsDetail() {
  // สลับหน้ากลับ: โชว์ List และซ่อน Detail
  document.getElementById("newsDetailView").style.display = "none";
  document.getElementById("newsListView").style.display = "block";

  // เลื่อนกลับมาตำแหน่ง Section ข่าว
  document.getElementById("news").scrollIntoView({ behavior: "smooth" });
}

// --- 5. Event Listeners ---
document.addEventListener("DOMContentLoaded", initNewsSystem);

// ปิด Modal เมื่อคลิกนอกหน้าต่าง
window.addEventListener("click", (e) => {
  const modal = document.getElementById("newsModal");
  if (e.target === modal) {
    closeNewsModal();
  }
});
