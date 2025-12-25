// ============================================
// 📱 ELEMENTS
// ============================================
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const closeBtn = document.getElementById("closeBtn");
const overlay = document.getElementById("overlay");
const orderBtn = document.getElementById("orderBtn");
const emailLink = document.getElementById("emailLink");
const socialLink = document.getElementById("socialLink");
const emailModal = document.getElementById("emailModal");
const socialModal = document.getElementById("socialModal");

// ============================================
// 🎯 MENU FUNCTIONS
// ============================================
function openMenu() {
  sidebar.classList.add("active");
  overlay.classList.add("active");
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  sidebar.classList.remove("active");
  overlay.classList.remove("active");
  document.body.style.overflow = '';
}

menuBtn.addEventListener("click", openMenu);
closeBtn.addEventListener("click", closeMenu);
overlay.addEventListener("click", closeMenu);

// Keyboard shortcut (ESC to close)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (sidebar.classList.contains("active")) {
      closeMenu();
    }
    if (emailModal.classList.contains("active")) {
      closeEmailModal();
    }
    if (socialModal.classList.contains("active")) {
      closeSocialModal();
    }
  }
});

// ============================================
// 📧 EMAIL MODAL
// ============================================
function openEmailModal() {
  closeMenu(); // Sidebar yopish
  emailModal.classList.add("active");
  document.body.style.overflow = 'hidden';
}

function closeEmailModal() {
  emailModal.classList.remove("active");
  document.body.style.overflow = '';
}

emailLink.addEventListener("click", (e) => {
  e.preventDefault();
  openEmailModal();
});

emailModal.addEventListener("click", (e) => {
  if (e.target === emailModal) {
    closeEmailModal();
  }
});

// ============================================
// 🌐 SOCIAL MODAL
// ============================================
function openSocialModal() {
  closeMenu(); // Sidebar yopish
  socialModal.classList.add("active");
  document.body.style.overflow = 'hidden';
}

function closeSocialModal() {
  socialModal.classList.remove("active");
  document.body.style.overflow = '';
}

socialLink.addEventListener("click", (e) => {
  e.preventDefault();
  openSocialModal();
});

socialModal.addEventListener("click", (e) => {
  if (e.target === socialModal) {
    closeSocialModal();
  }
});

// ============================================
// 🎯 ORDER BUTTON
// ============================================
orderBtn.addEventListener("click", () => {
  orderBtn.style.transform = "translateX(-50%) scale(0.95)";
  setTimeout(() => {
    window.location.href = "calendar.html";
  }, 150);
});

// ============================================
// 🌌 PARTICLES ANIMATION
// ============================================
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");
let particles = [];
let stars = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initParticles();
  initStars();
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Create Particles
function initParticles() {
  particles = [];
  const particleCount = Math.floor((canvas.width * canvas.height) / 15000);
  
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.5,
      color: Math.random() > 0.5 ? '#00ff9d' : '#00d4ff'
    });
  }
}

// Create Stars
function initStars() {
  stars = [];
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5,
      opacity: Math.random(),
      twinkleSpeed: Math.random() * 0.02 + 0.005
    });
  }
}

// Draw Function
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw Stars
  stars.forEach(star => {
    ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
    
    star.opacity += star.twinkleSpeed;
    if (star.opacity >= 1 || star.opacity <= 0) {
      star.twinkleSpeed *= -1;
    }
  });
  
  // Draw Particles
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.opacity;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    
    p.x += p.dx;
    p.y += p.dy;
    
    if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    
    p.opacity += Math.sin(Date.now() * 0.001) * 0.01;
    p.opacity = Math.max(0.3, Math.min(1, p.opacity));
  });
  
  ctx.globalAlpha = 1;
  requestAnimationFrame(draw);
}

draw();

// ============================================
// 🎞️ SLIDESHOW
// ============================================
const slides = document.querySelectorAll(".presentation .slide");
const firstVideo = document.querySelector(".presentation .first");
const lastVideo = document.querySelector(".presentation .last");
const finalImage = document.querySelector(".presentation .final");

let current = 0;
let isTransitioning = false;

const transitionEffects = [
  'fade',
  'zoom',
  'slide',
  'blur',
  'rotate'
];

slides[current].classList.add("active");

firstVideo.style.opacity = '0';
firstVideo.play();
setTimeout(() => {
  firstVideo.style.transition = 'opacity 1s ease';
  firstVideo.style.opacity = '1';
}, 100);

firstVideo.addEventListener("ended", () => {
  transitionToNext(1);
  startImageSlideshow();
});

function startImageSlideshow() {
  const imageInterval = setInterval(() => {
    if (current >= slides.length - 3) {
      clearInterval(imageInterval);
      playLastVideo();
      return;
    }
    
    transitionToNext(current + 1);
  }, 5000);
}

function transitionToNext(nextIndex) {
  if (isTransitioning) return;
  isTransitioning = true;
  
  const currentSlide = slides[current];
  const nextSlide = slides[nextIndex];
  
  const effect = transitionEffects[Math.floor(Math.random() * transitionEffects.length)];
  
  applyExitAnimation(currentSlide, effect);
  
  setTimeout(() => {
    currentSlide.classList.remove("active");
    current = nextIndex;
    nextSlide.classList.add("active");
    applyEnterAnimation(nextSlide, effect);
    
    setTimeout(() => {
      isTransitioning = false;
    }, 100);
  }, 800);
}

function applyExitAnimation(slide, effect) {
  switch(effect) {
    case 'fade':
      slide.style.transition = 'opacity 0.8s ease';
      slide.style.opacity = '0';
      break;
    case 'zoom':
      slide.style.transition = 'transform 0.8s ease, opacity 0.8s ease';
      slide.style.transform = 'scale(0.8)';
      slide.style.opacity = '0';
      break;
    case 'slide':
      slide.style.transition = 'transform 0.8s ease, opacity 0.8s ease';
      slide.style.transform = 'translateX(-100%)';
      slide.style.opacity = '0';
      break;
    case 'blur':
      slide.style.transition = 'filter 0.8s ease, opacity 0.8s ease';
      slide.style.filter = 'blur(20px)';
      slide.style.opacity = '0';
      break;
    case 'rotate':
      slide.style.transition = 'transform 0.8s ease, opacity 0.8s ease';
      slide.style.transform = 'rotate(15deg) scale(0.8)';
      slide.style.opacity = '0';
      break;
  }
}

function applyEnterAnimation(slide, effect) {
  slide.style.transition = 'none';
  
  switch(effect) {
    case 'fade':
      slide.style.opacity = '0';
      break;
    case 'zoom':
      slide.style.transform = 'scale(1.2)';
      slide.style.opacity = '0';
      break;
    case 'slide':
      slide.style.transform = 'translateX(100%)';
      slide.style.opacity = '0';
      break;
    case 'blur':
      slide.style.filter = 'blur(20px)';
      slide.style.opacity = '0';
      break;
    case 'rotate':
      slide.style.transform = 'rotate(-15deg) scale(1.2)';
      slide.style.opacity = '0';
      break;
  }
  
  setTimeout(() => {
    slide.style.transition = 'all 1s cubic-bezier(0.4, 0, 0.2, 1)';
    slide.style.transform = 'scale(1) translateX(0) rotate(0)';
    slide.style.opacity = '1';
    slide.style.filter = 'blur(0)';
  }, 50);
}

function playLastVideo() {
  isTransitioning = true;
  const currentSlide = slides[current];
  
  currentSlide.style.transition = 'opacity 1s ease';
  currentSlide.style.opacity = '0';
  
  setTimeout(() => {
    currentSlide.classList.remove("active");
    lastVideo.classList.add("active");
    lastVideo.style.opacity = '0';
    lastVideo.play();
    
    setTimeout(() => {
      lastVideo.style.transition = 'opacity 1s ease';
      lastVideo.style.opacity = '1';
    }, 100);
    
    isTransitioning = false;
  }, 1000);
}

lastVideo.addEventListener("ended", () => {
  lastVideo.style.transition = 'opacity 1s ease';
  lastVideo.style.opacity = '0';
  
  setTimeout(() => {
    lastVideo.classList.remove("active");
    finalImage.classList.add("active");
    finalImage.style.opacity = '0';
    finalImage.style.transform = 'scale(1.1)';
    
    setTimeout(() => {
      finalImage.style.transition = 'all 2s ease';
      finalImage.style.opacity = '1';
      finalImage.style.transform = 'scale(1)';
      
      // Final image static qolishi uchun
      finalImage.style.animation = 'none';
    }, 100);
  }, 1000);
});

// ============================================
// 🎨 SMOOTH SCROLL
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// ============================================
// 🎯 PRELOAD IMAGES
// ============================================
window.addEventListener('load', () => {
  slides.forEach(slide => {
    if (slide.tagName === 'IMG') {
      const img = new Image();
      img.src = slide.src;
    }
  });
});

// ============================================
// 📊 PERFORMANCE OPTIMIZATION
// ============================================
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(draw);
  } else {
    draw();
  }
});