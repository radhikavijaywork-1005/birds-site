(() => {
  const grid = document.getElementById('grid');
  const tpl = document.getElementById('card-tpl');
  const search = document.getElementById('search');
  const countEl = document.getElementById('count');
  const player = document.getElementById('player');

  let birds = [];
  let currentBtn = null;

  // ---- data ----------
  fetch('birds.json')
    .then(r => r.json())
    .then(data => {
      birds = data;
      render(birds);
      updateCount(birds.length, birds.length);
    })
    .catch(err => {
      grid.innerHTML = '<p class="empty-msg">Could not load the field guide.</p>';
      console.error(err);
    });

  // ---- render ----------
  function render(list) {
    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<p class="empty-msg">No birds by that name yet.</p>';
      return;
    }
    list.forEach((bird, i) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.name = bird.name.toLowerCase();
      node.dataset.sci = bird.sciName.toLowerCase();
      node.dataset.family = (bird.family || '').toLowerCase();
      node.dataset.region = (bird.region || '').toLowerCase();
      node.style.animationDelay = Math.min(i * 30, 600) + 'ms';

      const slug = slugify(bird.name);
      const nameLink = node.querySelector('.name-link');
      nameLink.textContent = bird.name;
      nameLink.href = `/bird/${slug}/`;
      node.querySelector('.sci').textContent = bird.sciName;

      const frame = node.querySelector('.plate-frame');
      const img = frame.querySelector('img');
      img.alt = `${bird.name} (${bird.sciName})`;

      const playBtn = node.querySelector('.play');
      if (bird.sound && bird.sound.url) {
        playBtn.addEventListener('click', e => {
          e.stopPropagation();
          togglePlay(playBtn, bird);
        });
      } else {
        playBtn.disabled = true;
        playBtn.setAttribute('aria-label', 'no recording available');
      }

      // click anywhere on the card to open the species page, except
      // on the play button or an actual link (which handle themselves)
      node.addEventListener('click', e => {
        if (e.target.closest('.play') || e.target.closest('a')) return;
        window.location.href = `/bird/${slug}/`;
      });

      // lazy load image when card enters viewport
      io.observe(node);
      node._bird = bird;
      node._img = img;
      node._frame = frame;

      grid.appendChild(node);
    });
  }

  function slugify(name) {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  // ---- intersection observer for lazy image fetching ----------
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadImage(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '200px' });

  function loadImage(card) {
    const bird = card._bird;
    const img = card._img;
    const frame = card._frame;

    if (bird.image && bird.image.url) {
      setImg(img, bird.image.url, bird.image.position);
    } else {
      frame.classList.add('empty');
    }
  }

  function setImg(img, url, position) {
    img.src = url;
    if (position) img.style.objectPosition = position;
    img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
    img.addEventListener('error', () => img.closest('.plate-frame').classList.add('empty'), { once: true });
  }

  // ---- audio ----------
  // Sound URLs are resolved at build time (see scripts/fetch-sounds.mjs) and
  // baked into birds.json, so playback never waits on a live API lookup —
  // just the browser fetching the audio file itself.
  async function togglePlay(btn, bird) {
    // toggling current
    if (currentBtn === btn && !player.paused) {
      player.pause();
      btn.classList.remove('playing');
      currentBtn = null;
      return;
    }
    // stop previous
    if (currentBtn && currentBtn !== btn) {
      currentBtn.classList.remove('playing');
    }
    currentBtn = btn;

    if (player.src !== bird.sound.url) {
      btn.classList.add('loading');
      player.src = bird.sound.url;
    }
    try {
      await player.play();
      btn.classList.add('playing');
    } catch (e) {
      console.warn('play failed', e);
    } finally {
      btn.classList.remove('loading');
    }
  }

  player.addEventListener('ended', () => {
    if (currentBtn) currentBtn.classList.remove('playing');
    currentBtn = null;
  });

  // ---- search ----------
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    if (!q) {
      Array.from(grid.children).forEach(c => c.classList.remove('hidden'));
      updateCount(birds.length, birds.length);
      return;
    }
    let visible = 0;
    Array.from(grid.children).forEach(c => {
      const match =
        (c.dataset.name && c.dataset.name.includes(q)) ||
        (c.dataset.sci && c.dataset.sci.includes(q)) ||
        (c.dataset.family && c.dataset.family.includes(q)) ||
        (c.dataset.region && c.dataset.region.includes(q));
      c.classList.toggle('hidden', !match);
      if (match) visible++;
    });
    updateCount(visible, birds.length);
  });

  function updateCount(shown, total) {
    countEl.textContent = shown === total ? `${total} birds` : `${shown} of ${total}`;
  }
})();
