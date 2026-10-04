const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
const yearEl = document.getElementById('year');
const tabButtons = document.querySelectorAll('.booking-tabs button');
const swapButton = document.querySelector('.swap-button');
const fromLocation = document.getElementById('from_location');
const toLocation = document.getElementById('to_location');
const statNumbers = document.querySelectorAll('.stat-number');
const revealSections = document.querySelectorAll('.section');

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    navMenu.classList.toggle('is-open');
  });
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    tabButtons.forEach((tab) => tab.classList.remove('is-active'));
    button.classList.add('is-active');
  });
});

if (swapButton && fromLocation && toLocation) {
  swapButton.addEventListener('click', () => {
    const fromValue = fromLocation.value;
    fromLocation.value = toLocation.value;
    toLocation.value = fromValue;
  });
}

const animateCounter = (element) => {
  const target = Number(element.dataset.target);
  const suffix = element.dataset.suffix || '';
  const duration = 1200;
  const startTime = performance.now();

  const update = (currentTime) => {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentValue = target * eased;

    if (target % 1 !== 0) {
      element.textContent = `${currentValue.toFixed(1)}${suffix}`;
    } else {
      element.textContent = `${Math.round(currentValue)}${suffix}`;
    }

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = `${target}${suffix}`;
    }
  };

  requestAnimationFrame(update);
};

statNumbers.forEach((stat) => {
  animateCounter(stat);
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.18,
    rootMargin: '0px 0px -40px 0px'
  }
);

revealSections.forEach((section) => {
  revealObserver.observe(section);
});

const planeCursor = document.createElement('div');
planeCursor.setAttribute('aria-hidden', 'true');
planeCursor.className = 'plane-cursor';
planeCursor.textContent = '✈';
document.body.appendChild(planeCursor);

const boardingPassIcon = 'src/icons8-boarding-pass-100.png';

const bookingCtaSelectors = '.text-link, .btn-primary';
const bookingCtaElements = document.querySelectorAll(bookingCtaSelectors);

bookingCtaElements.forEach((element) => {
  const isSpecificBookingButton =
    element.textContent.includes('Book this trip') ||
    element.textContent.includes('Book your escape');

  if (!isSpecificBookingButton) return;

  element.addEventListener('pointerenter', () => {
    planeCursor.innerHTML = `<img src="${boardingPassIcon}" alt="Boarding pass cursor" />`;
    planeCursor.classList.add('is-passport');
    planeCursor.style.textShadow = '0 6px 18px rgba(29, 35, 33, 0.18)';
  });

  element.addEventListener('pointerleave', () => {
    planeCursor.textContent = '✈';
    planeCursor.innerHTML = '';
    planeCursor.classList.remove('is-passport');
  });
});

let lastPointerX = 0;
let lastPointerY = 0;
let lastTrailX = 0;
let lastTrailY = 0;
let planeX = 0;
let planeY = 0;
let pointerAngle = 0;

const createTrailPiece = (x, y, color, rotation) => {
  const trail = document.createElement('div');
  trail.className = 'plane-trail';
  trail.textContent = '✈';
  trail.style.left = `${x}px`;
  trail.style.top = `${y}px`;
  trail.style.color = color;
  trail.style.filter = `drop-shadow(0 0 10px ${color}33)`;
  trail.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  document.body.appendChild(trail);

  setTimeout(() => {
    trail.remove();
  }, 900);
};

const getSectionColor = (element) => {
  if (!element) return '#2f4d40';

  const styles = window.getComputedStyle(element);
  const bg = styles.backgroundColor;

  if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
    const rgb = bg.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
      const r = Number(rgb[0]);
      const g = Number(rgb[1]);
      const b = Number(rgb[2]);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 150 ? '#1d2321' : '#f8f5f0';
    }
  }

  return '#2f4d40';
};

window.addEventListener('pointermove', (event) => {
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;

  const target = document.elementFromPoint(event.clientX, event.clientY);
  const section = target?.closest('section, .site-header, .site-footer, .cta-banner');
  const color = getSectionColor(section);

  const isPassport = planeCursor.classList.contains('is-passport');
  planeCursor.style.color = isPassport ? '#1d2321' : color;
  planeCursor.style.textShadow = isPassport
    ? '0 6px 18px rgba(29, 35, 33, 0.18)'
    : `0 6px 18px ${color}33`;

  const dx = event.clientX - planeX;
  const dy = event.clientY - planeY;
  pointerAngle = Math.atan2(dy, dx) * 180 / Math.PI;
  planeCursor.style.transform = `translate(-50%, -50%) rotate(${pointerAngle}deg)`;

  planeX = event.clientX;
  planeY = event.clientY;
  planeCursor.style.left = `${event.clientX}px`;
  planeCursor.style.top = `${event.clientY}px`;

  const trailDistance = Math.hypot(event.clientX - lastTrailX, event.clientY - lastTrailY);
  if (trailDistance > 12) {
    createTrailPiece(event.clientX, event.clientY, color, pointerAngle);
    lastTrailX = event.clientX;
    lastTrailY = event.clientY;
  }
});

window.addEventListener('pointerdown', () => {
  planeCursor.classList.add('is-active');
});

window.addEventListener('pointerup', () => {
  planeCursor.classList.remove('is-active');
});

// Show native cursor and hide custom plane cursor when hovering text fields
(function(){
  const plane = document.querySelector('.plane-cursor');
  if (!plane) return;
  const fieldSelector = 'input, textarea, select';
  const fields = document.querySelectorAll(fieldSelector);

  const showNative = () => {
    document.documentElement.style.cursor = 'auto';
    plane.style.display = 'none';
  };
  const hideNative = () => {
    document.documentElement.style.cursor = 'none';
    plane.style.display = '';
  };

  fields.forEach((f) => {
    f.addEventListener('pointerenter', showNative);
    f.addEventListener('pointerleave', hideNative);
    f.addEventListener('focus', showNative);
    f.addEventListener('blur', hideNative);
  });

  // Also handle dynamically added fields (if any)
  const observer = new MutationObserver(() => {
    const now = document.querySelectorAll(fieldSelector);
    now.forEach((f) => {
      if (!f._cursorBound) {
        f._cursorBound = true;
        f.addEventListener('pointerenter', showNative);
        f.addEventListener('pointerleave', hideNative);
        f.addEventListener('focus', showNative);
        f.addEventListener('blur', hideNative);
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
