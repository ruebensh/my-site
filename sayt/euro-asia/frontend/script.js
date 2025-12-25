const logo = document.getElementById('logo');
const flash = document.getElementById('flash');
const intro = document.getElementById('intro');
const sound = document.getElementById('welcomeSound');
const content = document.getElementById('content');
const startOverlay = document.getElementById('startOverlay');
const startBtn = document.getElementById('startBtn');
const blur = document.getElementById("blur");

function doFlash() {
  // qisqa chaqmoq: tez ochilib o'chadi
  flash.style.opacity = '1';
  setTimeout(() => { flash.style.opacity = '0'; }, 120);
}

function runIntroSequence() {
  // 1) kichik kechikishdan so'ng chaqmoq + ovoz
  setTimeout(async () => {
    try {
      await sound.play();
    } catch (e) {
      // agar autoplay bloklansa, Start tugmasini ko'rsatamiz
      showStartButton();
    }
    doFlash();
  }, 300);

  // 2) logo markazda paydo bo'lish (porlab)
  setTimeout(() => {
    logo.classList.add('show');
  }, 700);

  // 3) Logo kattalashib yo‘qoladi (vanish effekti)
  setTimeout(() => {
    logo.classList.add("vanish");
    doFlash();
  }, 3000);

  // 4) Intro sekin yo‘qoladi va kontent ko‘rinadi
  setTimeout(() => {
    intro.style.pointerEvents = 'none';
    intro.style.opacity = '0';
    setTimeout(() => { intro.style.display = 'none'; }, 900);
    content.classList.add('visible');
  }, 4300);

  // 5) Blur tozalanadi
  setTimeout(() => {
    blur.classList.add("clear");
  }, 4800);

  // ⚡ 6) Yakunda asosiy sahifaga yo‘naltiramiz (main.html)
  setTimeout(() => {
    window.location.href = "main.html";
  }, 5500); // 5.5 soniyadan keyin avtomatik o‘tish
}

function showStartButton() {
  startOverlay.style.pointerEvents = 'auto';
  startOverlay.querySelector('button').style.display = 'inline-block';
  startOverlay.setAttribute('aria-hidden', 'false');
  startOverlay.querySelector('button').addEventListener('click', async () => {
    try { await sound.play(); } catch (e) { /* no-op */ }
    startOverlay.style.display = 'none';
    runIntroSequence();
  }, { once: true });
}

window.addEventListener('DOMContentLoaded', () => {
  runIntroSequence();
});