/* ─── Particles ─────────────────────────────────────────── */
(function () {
  const canvas = document.getElementById('particles');
  const ctx    = canvas.getContext('2d');
  let W, H, particles = [];
  const COLORS = ['rgba(179,136,255,', 'rgba(124,77,255,', 'rgba(255,179,217,'];

  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }

  function makeParticle() {
    const c = COLORS[Math.floor(Math.random() * COLORS.length)];
    return { x: Math.random()*W, y: Math.random()*H, r: 0.6+Math.random()*1.8,
             dx: (Math.random()-0.5)*0.18, dy: -(0.08+Math.random()*0.22),
             alpha: 0.15+Math.random()*0.5, color: c };
  }

  function init() { particles = Array.from({ length: 90 }, makeParticle); }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = p.color + p.alpha + ')'; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r*3, 0, Math.PI*2);
      ctx.fillStyle = p.color + (p.alpha*0.12) + ')'; ctx.fill();
    }
  }

  function update() {
    for (const p of particles) {
      p.x += p.dx; p.y += p.dy;
      if (p.y < -10)   { p.y = H+10; p.x = Math.random()*W; }
      if (p.x < -10)   p.x = W+10;
      if (p.x > W+10)  p.x = -10;
    }
  }

  function loop() { update(); draw(); requestAnimationFrame(loop); }
  window.addEventListener('resize', () => { resize(); init(); });
  resize(); init(); loop();
})();

/* ─── Scroll Reveal ─────────────────────────────────────── */
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      const delay = e.target.closest('.gallery-card')
        ? (Array.from(revealEls).indexOf(e.target) % 3) * 80 : 0;
      setTimeout(() => e.target.classList.add('visible'), delay);
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
revealEls.forEach(el => revealObs.observe(el));

/* ─── Audio setup ───────────────────────────────────────── */
const bgAudio = document.getElementById('bgAudio');
const wmBtn   = document.getElementById('wmBtn');
const globalMuteBtn = document.getElementById('globalMuteBtn');

// Save the watermelon song src from the <source> tag
const WM_SONG = bgAudio.querySelector('source')
  ? new URL(bgAudio.querySelector('source').getAttribute('src'), location.href).href
  : bgAudio.src;

let globalMuted = false; // top-left mute button
let wmPlaying   = false; // watermelon song active
let cardMuted   = false; // in-lightbox mute for current card
let cardSongSrc = null;  // src of card song (null = no card open)

/* ── Helpers ── */
function applyMuteState() {
  // Global mute wins; card mute is secondary
  bgAudio.muted = globalMuted || cardMuted;
}

function updateGlobalMuteBtn() {
  globalMuteBtn.textContent = globalMuted ? '🔇' : '🔊';
  globalMuteBtn.title       = globalMuted ? 'Unmute all audio' : 'Mute all audio';
  globalMuteBtn.classList.toggle('muted', globalMuted);
}

function updateLbMuteBtn() {
  const btn = document.getElementById('lbMuteBtn');
  if (!btn) return;
  btn.textContent = cardMuted ? '🔇' : '🎵';
  btn.title       = cardMuted ? 'Unmute' : 'Mute';
}

/* ── Global mute toggle ── */
globalMuteBtn.addEventListener('click', () => {
  globalMuted = !globalMuted;
  applyMuteState();
  updateGlobalMuteBtn();
});

/* ── Watermelon button ── */
wmBtn.addEventListener('click', () => {
  // Do nothing while a card is open
  if (cardSongSrc) return;

  if (wmPlaying) {
    bgAudio.pause();
    bgAudio.currentTime = 0;
    wmBtn.classList.remove('playing');
    wmPlaying = false;
  } else {
    // Restore to watermelon song in case something changed it
    bgAudio.src = WM_SONG;
    bgAudio.currentTime = 0;
    bgAudio.volume = 0.35;
    applyMuteState();
    bgAudio.play().catch(() => {});
    wmBtn.classList.add('playing');
    wmPlaying = true;
  }
});

/* ── Play a card song ── */
function playCardSong(src) {
  // Stop watermelon if going
  if (wmPlaying) {
    bgAudio.pause();
    wmBtn.classList.remove('playing');
    wmPlaying = false;
  }

  cardSongSrc = src;
  cardMuted   = false;

  bgAudio.src         = src;
  bgAudio.currentTime = 0;
  bgAudio.volume      = 0.35;
  applyMuteState();
  bgAudio.play().catch(() => {});

  updateLbMuteBtn();
}

/* ── Stop card song (lightbox close) ── */
function stopCardSong() {
  bgAudio.pause();
  bgAudio.currentTime = 0;
  // Restore audio element to watermelon song so wm button works cleanly
  bgAudio.src = WM_SONG;
  cardSongSrc = null;
  cardMuted   = false;
  wmPlaying   = false;
  wmBtn.classList.remove('playing');
  applyMuteState();
}

/* ── Toggle in-lightbox mute ── */
function toggleCardMute() {
  if (!cardSongSrc) return;
  cardMuted = !cardMuted;
  applyMuteState();
  updateLbMuteBtn();
}

/* ─── Lightbox ──────────────────────────────────────────── */
const cards      = Array.from(document.querySelectorAll('.gallery-card'));
const lb         = document.getElementById('lightbox');
const lbImg      = document.getElementById('lbImg');
const lbTitle    = document.getElementById('lbTitle');
const lbCaption  = document.getElementById('lbCaption');
const lbClose    = document.getElementById('lbClose');
const lbBackdrop = document.getElementById('lbBackdrop');
const lbPrev     = document.getElementById('lbPrev');
const lbNext     = document.getElementById('lbNext');
const lbMuteBtn  = document.getElementById('lbMuteBtn');
let currentIdx = 0;

/* Show/hide arrows: no left on first, no right on last */
function updateNavArrows() {
  lbPrev.style.display = currentIdx === 0               ? 'none' : 'flex';
  lbNext.style.display = currentIdx === cards.length - 1 ? 'none' : 'flex';
}

function openLightbox(idx) {
  currentIdx = idx;
  const card = cards[idx];

  lbImg.src             = card.dataset.img || '';
  lbImg.alt             = card.dataset.title || '';
  lbTitle.textContent   = card.dataset.title || '';
  lbCaption.textContent = card.dataset.caption || '';

  lb.classList.add('open');
  document.body.style.overflow = 'hidden';

  updateNavArrows();

  const song = card.dataset.song;
  if (song) playCardSong(song);
}

function closeLightbox() {
  lb.classList.remove('open');
  document.body.style.overflow = '';
  stopCardSong();
  updateLbMuteBtn();
}

function navigate(dir) {
  const next = currentIdx + dir;
  if (next < 0 || next >= cards.length) return;
  openLightbox(next);
}

/* Card click → open lightbox */
cards.forEach((card, i) => {
  card.addEventListener('click', () => openLightbox(i));
  card.setAttribute('tabindex', '0');
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') openLightbox(i);
  });
});

lbMuteBtn.addEventListener('click',  (e) => { e.stopPropagation(); toggleCardMute(); });
lbClose.addEventListener('click',    closeLightbox);
lbBackdrop.addEventListener('click', closeLightbox);
lbPrev.addEventListener('click',     (e) => { e.stopPropagation(); navigate(-1); });
lbNext.addEventListener('click',     (e) => { e.stopPropagation(); navigate(1);  });

document.addEventListener('keydown', e => {
  if (!lb.classList.contains('open')) return;
  if (e.key === 'Escape')             closeLightbox();
  if (e.key === 'ArrowLeft')          navigate(-1);
  if (e.key === 'ArrowRight')         navigate(1);
  if (e.key === 'm' || e.key === 'M') toggleCardMute();
});