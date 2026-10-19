const menu = document.querySelector('.menu-button');
const nav = document.querySelector('.nav-links');

menu.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
  menu.textContent = open ? '×' : '☰';
});

nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
  menu.textContent = '☰';
}));

// Highlight download button matching user's device
try {
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isWindows = /Windows/i.test(ua);

  if (isAndroid) {
    const androidBtn = document.getElementById('btn-android');
    if (androidBtn) {
      androidBtn.classList.add('recommended');
      const small = androidBtn.querySelector('small');
      if (small) small.textContent = 'Android (Your Device) • Tap to Download';
    }
  } else if (isWindows) {
    const winBtn = document.getElementById('btn-windows');
    if (winBtn) {
      winBtn.classList.add('recommended');
      const small = winBtn.querySelector('small');
      if (small) small.textContent = 'Windows (Your Device) • Click to Download';
    }
  }
} catch (e) {
  // Fail silently
}
