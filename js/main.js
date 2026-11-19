/* Chef Saúl Montiel — interactions.
   Everything here is enhancement: the page reads fine with this file missing.
   The 3D timeline lives in journey.js. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = window.matchMedia('(max-width: 760px)');
  var hover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function tryPlay(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  /* ── language: English by default, Spanish on request ── */
  var lang = 'en';
  var langBtn = $('.lang');
  var onLang = [];
  function setLang(next, save) {
    lang = next === 'es' ? 'es' : 'en';
    $$('[data-es]').forEach(function (el) {
      if (!el.hasAttribute('data-en')) el.setAttribute('data-en', el.innerHTML);
      el.innerHTML = el.getAttribute(lang === 'es' ? 'data-es' : 'data-en');
    });
    root.lang = lang;
    if (langBtn) {
      langBtn.textContent = lang === 'es' ? 'EN' : 'ES';
      langBtn.lang = lang === 'es' ? 'en' : 'es';
      langBtn.setAttribute('aria-label', lang === 'es' ? 'View in English' : 'Ver en español');
    }
    onLang.forEach(function (fn) { fn(lang); });
    window.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
    if (save) { try { localStorage.setItem('sm-lang', lang); } catch (e) {} }
  }
  if (langBtn) langBtn.addEventListener('click', function () { setLang(lang === 'es' ? 'en' : 'es', true); });
  /* only restore a saved Spanish choice on pages that still offer the toggle */
  if (langBtn) { try { if (localStorage.getItem('sm-lang') === 'es') setLang('es'); } catch (e) {} }

  /* ── intro curtain: drop the node once it has lifted ── */
  var loader = $('.loader');
  if (loader) setTimeout(function () { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 2600);

  /* ── hero reels: three on desktop, one on phones; only while on screen ── */
  var reels = $$('.reel');
  var heroOn = !reduce, heroVisible = true;
  function loadReels() {
    reels.forEach(function (v) {
      var wanted = !(mobile.matches && v.hasAttribute('data-desktop'));
      if (wanted && !v.getAttribute('src')) { v.src = v.getAttribute('data-src'); v.preload = 'auto'; }
      if (wanted && heroOn && heroVisible) tryPlay(v); else v.pause();
    });
  }
  loadReels();
  /* a montage reel swaps its corner tag to match the shot on screen */
  reels.forEach(function (v) {
    var raw = v.getAttribute('data-cues'), tag = v.parentNode.querySelector('.reel-tag');
    if (!raw || !tag) return;
    var cues; try { cues = JSON.parse(raw); } catch (e) { return; }
    var shown = -1;
    v.addEventListener('timeupdate', function () {
      var i = 0;
      for (var k = 0; k < cues.length; k++) if (v.currentTime >= cues[k][0]) i = k;
      if (i === shown) return;
      shown = i;
      tag.innerHTML = (cues[i][1] ? '<img src="' + cues[i][1] + '" alt="" width="30" height="30">' : '') + '<span>' + cues[i][2] + '</span>';
    });
  });
  if (mobile.addEventListener) mobile.addEventListener('change', loadReels);
  if ('IntersectionObserver' in window && $('.hero')) {
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; loadReels(); }, { threshold: 0.1 }).observe($('.hero'));
  }
  var toggle = $('.hero-toggle');
  function labelToggle() {
    if (!toggle) return;
    toggle.textContent = heroOn ? (lang === 'es' ? 'Pausa' : 'Pause') : (lang === 'es' ? 'Reproducir' : 'Play');
    toggle.setAttribute('aria-pressed', String(!heroOn));
  }
  if (toggle) {
    labelToggle();
    onLang.push(labelToggle);
    toggle.addEventListener('click', function () { heroOn = !heroOn; labelToggle(); loadReels(); });
  }

  /* ── video player: YouTube embeds and his own vertical reels ── */
  var player = $('#player');
  var pf = player && $('.player-frame', player), link = player && $('.player-link', player);
  function openYouTube(id, title) {
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
    f.title = title;
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    pf.innerHTML = ''; pf.appendChild(f);
    link.href = 'https://www.youtube.com/watch?v=' + id;
    player.classList.remove('is-vertical');
    player.showModal();
  }
  function openReel(src, title) {
    var v = document.createElement('video');
    v.src = src; v.controls = true; v.autoplay = true; v.playsInline = true;
    v.setAttribute('playsinline', ''); v.setAttribute('aria-label', title);
    pf.innerHTML = ''; pf.appendChild(v);
    player.classList.add('is-vertical');
    player.showModal();
    tryPlay(v);
  }
  if (player && player.showModal) {
    $$('[data-yt]').forEach(function (b) {
      b.setAttribute('aria-label', 'Play video: ' + b.getAttribute('data-title'));
      b.addEventListener('click', function () { openYouTube(b.getAttribute('data-yt'), b.getAttribute('data-title')); });
    });
    $$('[data-video]').forEach(function (b) {
      b.setAttribute('aria-label', 'Play video: ' + b.getAttribute('data-title'));
      b.addEventListener('click', function () { openReel(b.getAttribute('data-video'), b.getAttribute('data-title')); });
    });
    $('.player-close', player).addEventListener('click', function () { player.close(); });
    player.addEventListener('click', function (e) { if (e.target === player) player.close(); });
    player.addEventListener('close', function () { pf.innerHTML = ''; });
  } else {
    $$('[data-yt]').forEach(function (b) { b.addEventListener('click', function () { window.open('https://www.youtube.com/watch?v=' + b.getAttribute('data-yt')); }); });
    $$('[data-video]').forEach(function (b) { b.addEventListener('click', function () { window.open(b.getAttribute('data-video')); }); });
  }

  /* ── booking popup: nav button and seal open it; the form writes the email ── */
  var booking = $('#booking');
  if (booking && booking.showModal) {
    var bForm = $('.booking-form', booking), bDone = $('.booking-done', booking);
    var bClose = $('.booking-close', booking);
    /* Requests go straight to the inbox through FormSubmit (formsubmit.co).
       The first one ever sent triggers a one-time activation email to that
       address; after it is clicked, every request arrives as an email. */
    var BOOK_EMAIL = 'info@chefsaulmontiel.com';
    var BOOK_ENDPOINT = 'https://formsubmit.co/ajax/' + BOOK_EMAIL;
    var bErr = $('.booking-err', booking), bSend = $('.booking-send', booking);
    var SERVICE = {
      trailer: ['Taco trailer', 'Taco trailer'], margarita: ['Craft margarita bar', 'Barra de margaritas'],
      private: ['Private chef', 'Chef privado'], consulting: ['Restaurant consulting', 'Consultoría'],
      tv: ['TV or brand collaboration', 'Tele o marca'], festival: ['Festival or demo', 'Festival o demo']
    };
    var EVENT = { trailer: 1, margarita: 1, private: 1, festival: 1 };
    var kindNow = function () { var r = $('input[name="kind"]:checked', bForm); return r ? r.value : 'trailer'; };
    var has = function (el, k) { return (' ' + el.getAttribute('data-for') + ' ').indexOf(' ' + k + ' ') > -1; };
    var showFields = function () {
      var k = kindNow();
      $$('[data-for]', bForm).forEach(function (el) { el.hidden = !has(el, k); });
      $$('[data-if]', bForm).forEach(function (el) { el.hidden = (' ' + el.getAttribute('data-if') + ' ').indexOf(' ' + k + ' ') < 0; });
      bErr.hidden = true;
    };
    var placeholders = function () {
      $$('[data-ph-es]', bForm).forEach(function (el) {
        if (!el.hasAttribute('data-ph-en')) el.setAttribute('data-ph-en', el.placeholder);
        el.placeholder = el.getAttribute(lang === 'es' ? 'data-ph-es' : 'data-ph-en');
      });
    };
    var showForm = function () { bDone.hidden = true; bForm.hidden = false; showFields(); };
    var labelClose = function () { bClose.setAttribute('aria-label', lang === 'es' ? 'Cerrar' : 'Close'); };
    labelClose(); placeholders();
    onLang.push(labelClose); onLang.push(placeholders);
    $$('input[name="kind"]', bForm).forEach(function (r) { r.addEventListener('change', showFields); });
    showFields();
    $$('[data-book]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var svc = el.getAttribute('data-service');
        if (svc) { var r = $('input[name="kind"][value="' + svc + '"]', bForm); if (r) r.checked = true; }
        showForm();
        booking.showModal();
        if (window.__lenis) window.__lenis.stop();
      });
    });
    bClose.addEventListener('click', function () { booking.close(); });
    booking.addEventListener('click', function (e) { if (e.target === booking) booking.close(); });
    booking.addEventListener('close', function () { if (window.__lenis) window.__lenis.start(); });

    var fail = function (msg, field) { bErr.textContent = msg; bErr.hidden = false; if (field) field.focus(); };
    bForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var es = lang === 'es', f = bForm.elements, k = kindNow();
      var name = f.name.value.trim(), email = f.email.value.trim(), phone = f.phone.value.trim();
      bErr.hidden = true;
      if (!name) return fail(es ? 'Escribe tu nombre para saber a quién responder.' : 'Add your name so Saúl knows who to reply to.', f.name);
      if (!email || !f.email.checkValidity()) return fail(es ? 'Escribe un correo al que podamos responder, como nombre@correo.com.' : 'Add an email Saúl can reply to, like name@example.com.', f.email);
      if ((phone.match(/\d/g) || []).length < 7) return fail(es ? 'Escribe un teléfono para poder llamarte.' : 'Add a phone number so Saúl can call you.', f.phone);
      if (EVENT[k]) {
        if (!f.date.value) return fail(es ? 'Elige la fecha del evento.' : 'Pick the event date.', f.date);
        if (f.place.value.trim().length < 3) return fail(es ? 'Escribe la dirección o el lugar del evento.' : 'Add the event address or venue.', f.place);
        if (!(+f.guests.value > 0)) return fail(es ? 'Escribe cuántos invitados esperas.' : 'Add how many guests you expect.', f.guests);
      }
      if (k === 'tv') {
        if (!f.org.value.trim()) return fail(es ? 'Escribe la empresa, el programa o la marca.' : 'Add the company, show or brand.', f.org);
        if (!f.tvkind.value) return fail(es ? 'Elige para qué quieres a Saúl.' : 'Choose what you want Saúl for.', f.tvkind);
      }
      if (k === 'consulting') {
        if (!f.restaurant.value.trim()) return fail(es ? 'Escribe el restaurante y la ciudad.' : 'Add the restaurant name and city.', f.restaurant);
        if (!f.concept.value.trim()) return fail(es ? 'Escribe qué tipo de comida sirven.' : 'Add the type of food.', f.concept);
        if (!f.help.value) return fail(es ? 'Elige con qué necesitas ayuda.' : 'Choose what you need help with.', f.help);
      }

      var data = { _subject: 'Booking request: ' + SERVICE[k][0] + ', ' + name, _template: 'table', _captcha: 'false',
        Service: SERVICE[k][0], Name: name, email: email, Phone: phone };
      if (f.date.value) data['Date'] = new Date(f.date.value + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      if (EVENT[k]) { data['Event address'] = f.place.value.trim(); data['Guests'] = f.guests.value; }
      if (k === 'tv') { data['Company, show or brand'] = f.org.value.trim(); data['Wants Saúl for'] = f.tvkind.selectedOptions[0].getAttribute('data-en') || f.tvkind.selectedOptions[0].textContent; }
      if (k === 'consulting') { data['Restaurant'] = f.restaurant.value.trim(); data['Type of food'] = f.concept.value.trim(); data['Help with'] = f.help.selectedOptions[0].getAttribute('data-en') || f.help.selectedOptions[0].textContent; }
      if (f.message.value.trim()) data['Details'] = f.message.value.trim();
      data['Language'] = es ? 'Español' : 'English';

      var label = bSend.innerHTML;
      bSend.disabled = true; bSend.textContent = es ? 'Enviando…' : 'Sending…';
      fetch(BOOK_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json().catch(function () { return {}; }); })
        .then(function (d) {
          if (d && String(d.success) === 'false') throw new Error('not sent');
          var first = name.split(/\s+/)[0];
          $('.booking-thanks', booking).textContent = es ? '¡Gracias, ' + first + '!' : 'Thank you, ' + first + '!';
          $('.booking-done-text', booking).textContent = es
            ? 'Saúl ya tiene tu solicitud. Te va a responder a ' + email + ' o te llamará al ' + phone + '.'
            : 'Saúl has your request. He’ll reply to ' + email + ' or call you at ' + phone + '.';
          bForm.reset(); showFields();
          bForm.hidden = true; bDone.hidden = false; bDone.focus();
        })
        .catch(function () {
          fail(es ? 'Tu solicitud no se envió. Revisa tu conexión y vuelve a intentarlo, o llama al (917) 375-2685.' : 'Your request didn’t go through. Check your connection and try again, or call (917) 375-2685.');
        })
        .then(function () { bSend.disabled = false; bSend.innerHTML = label; });
    });
    $('.booking-back', booking).addEventListener('click', showForm);
    $('.booking-finish', booking).addEventListener('click', function () { booking.close(); });
  }

  /* ── reel cards: a short silent preview on hover (desktop) or when centred (phones) ── */
  function preview(card, on) {
    var v = $('video', card);
    if (on && !v) {
      v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
      v.setAttribute('aria-hidden', 'true');
      v.src = card.getAttribute('data-preview') || card.getAttribute('data-video');
      card.insertBefore(v, card.children[1]);
      v.addEventListener('playing', function () { card.classList.add('is-playing'); });
    }
    if (!v) return;
    if (on) tryPlay(v); else { v.pause(); card.classList.remove('is-playing'); }
  }
  if (!reduce) {
    var cards = $$('.tall-card');
    if (hover) {
      cards.forEach(function (c) {
        c.addEventListener('mouseenter', function () { preview(c, true); });
        c.addEventListener('mouseleave', function () { preview(c, false); });
      });
    } else if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { preview(e.target, e.intersectionRatio > 0.75); });
      }, { threshold: [0, 0.75, 1] });
      cards.forEach(function (c) { cio.observe(c); });
    }
  }

  /* ── cursor bubble over anything that plays ── */
  var cursor = $('.cursor');
  if (cursor && hover && !reduce) {
    root.classList.add('has-cursor');
    var cx = 0, cy = 0, tx = 0, ty = 0, moving = false;
    var step = function () {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.3) requestAnimationFrame(step); else moving = false;
    };
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      var hit = e.target && e.target.closest && e.target.closest('[data-yt], [data-video]');
      cursor.classList.toggle('is-on', !!hit);
      if (!moving) { moving = true; requestAnimationFrame(step); }
    }, { passive: true });
    document.addEventListener('pointerleave', function () { cursor.classList.remove('is-on'); });
    window.addEventListener('scroll', function () { cursor.classList.remove('is-on'); }, { passive: true });
  }

  /* ── headings wipe in once, when first seen ── */
  if ('IntersectionObserver' in window && !reduce) {
    root.classList.add('js-reveal');
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    $$('[data-reveal]').forEach(function (el) { rio.observe(el); });
  }

  /* ── taco builder: each scroll step adds a layer ── */
  var build = $('.build');
  if (build && !reduce) {
    var bStage = $('.build-stage', build);
    var layers = $$('.build-pic img', build), steps = $$('.build-steps li', build), count = $('.build-count', build);
    var N = layers.length, bNow = -1, bTick = false;
    build.classList.add('is-live');
    layers.forEach(function (im) { im.loading = 'eager'; });
    var paintBuild = function () {
      bTick = false;
      var r = build.getBoundingClientRect();
      var run = build.offsetHeight - bStage.offsetHeight;
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
      var p = clamp(-r.top / run, 0, 1);
      var i = clamp(Math.floor(p * (N + 0.7)), 0, N - 1);
      if (i === bNow) return;
      bNow = i;
      layers.forEach(function (im, k) { im.classList.toggle('is-on', k === i); });
      steps.forEach(function (li, k) { li.classList.toggle('is-active', k === i); li.classList.toggle('is-done', k < i); });
      if (count) count.textContent = (i + 1) + '/' + N;
    };
    var queueBuild = function () { if (!bTick) { bTick = true; requestAnimationFrame(paintBuild); } };
    window.addEventListener('scroll', queueBuild, { passive: true });
    window.addEventListener('resize', queueBuild);
    paintBuild();
  }

  /* ── scroll choreography (needs GSAP; skipped for reduced motion) ── */
  var railWrap = $('.rail-wrap');
  if (reduce || !window.gsap || !window.ScrollTrigger) {
    if (railWrap) railWrap.classList.add('is-native');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis && hover) {
    var lenis = new Lenis({ lerp: 0.12 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (a.hasAttribute('data-book')) return;
        var t = $(a.getAttribute('href'));
        if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -60 }); }
      });
    });
  }

  // hero: name lifts, the frame tightens as you leave
  if ($('.hero')) {
    var hs = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero-name', { yPercent: -35, ease: 'none', scrollTrigger: hs });
    gsap.to('.hero-frame', { scale: 0.94, transformOrigin: '50% 100%', ease: 'none', scrollTrigger: hs });
    gsap.to('.reel-wrap.r1', { yPercent: -8, ease: 'none', scrollTrigger: hs });
    gsap.to('.reel-wrap.r3', { yPercent: 8, ease: 'none', scrollTrigger: hs });
  }

  // reel cards rise in a wave
  if ($('.tall')) gsap.from('.tall-card', { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '.tall', start: 'top 85%' } });

  // marquee: scrolling the page pushes it along
  if ($('.mq-scroll')) gsap.to('.mq-scroll', { xPercent: -12, ease: 'none', scrollTrigger: { trigger: '.mq', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });

  // quote lights up word by word; the photo drifts
  var quote = $('[data-words]');
  var quoteTween = null;
  function splitQuote() {
    if (!quote) return;
    if (quoteTween) { quoteTween.scrollTrigger && quoteTween.scrollTrigger.kill(); quoteTween.kill(); }
    var words = quote.textContent.trim().split(/\s+/);
    quote.setAttribute('aria-label', words.join(' '));
    quote.innerHTML = words.map(function (w) { return '<span aria-hidden="true">' + w + '</span>'; }).join(' ');
    quoteTween = gsap.fromTo(quote.children, { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.5,
      scrollTrigger: { trigger: quote, start: 'top 80%', end: 'bottom 50%', scrub: true }
    });
  }
  splitQuote();
  onLang.push(splitQuote);
  if ($('.quote')) gsap.fromTo('.quote-pic', { y: 70 }, { y: -70, ease: 'none', scrollTrigger: { trigger: '.quote', start: 'top bottom', end: 'bottom top', scrub: true } });

  var mm = gsap.matchMedia();
  // video rail: vertical scroll drives it sideways on wide screens
  mm.add('(min-width: 900px)', function () {
    var rail = $('.rail');
    if (!rail) return;
    railWrap.classList.remove('is-native');
    var dist = function () { return Math.max(0, rail.scrollWidth - window.innerWidth); };
    var tw = gsap.to(rail, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: railWrap, start: 'center center', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.5, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    return function () { tw.kill(); gsap.set(rail, { clearProps: 'x' }); };
  });
  mm.add('(max-width: 899px)', function () { railWrap.classList.add('is-native'); });

  // food photos drift at different speeds
  $$('.food-row img').forEach(function (img) {
    var d = parseFloat(img.getAttribute('data-drift')) || 0;
    if (mobile.matches) d *= 0.5;
    gsap.fromTo(img, { y: d }, { y: -d, ease: 'none', scrollTrigger: { trigger: '.food-row', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // pictures slide inside their frames
  $$('.place-media img, .lu-photo img').forEach(function (img) {
    gsap.fromTo(img, { scale: 1.16, yPercent: -5 }, { scale: 1.02, yPercent: 5, ease: 'none', scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  if ($('.book')) gsap.fromTo('.book-bg', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.book', start: 'top bottom', end: 'bottom top', scrub: true } });
  $$('.shape').forEach(function (s, i) {
    gsap.fromTo(s, { rotation: i % 2 ? 14 : -14 }, { rotation: i % 2 ? -10 : 10, ease: 'none', scrollTrigger: { trigger: s, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // cards and steps rise in, one after another
  $$('[data-rise]').forEach(function (el) {
    gsap.from(el.children, { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  // Azul teaser photos drift apart as it scrolls by
  if ($('.az-t-media')) {
    var at = { trigger: '.az-t-media', start: 'top bottom', end: 'bottom top', scrub: true };
    gsap.fromTo('.az-t-pic:first-child', { y: 50 }, { y: -50, ease: 'none', scrollTrigger: at });
    gsap.fromTo('.az-t-pic2', { y: -30 }, { y: 70, ease: 'none', scrollTrigger: at });
  }

  // the name rises out of the footer as the page ends
  gsap.fromTo('.foot-giant', { yPercent: 45 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  var refresh = function () { ScrollTrigger.refresh(); };
  window.addEventListener('load', refresh);
  window.addEventListener('journey:ready', refresh);
  onLang.push(function () { setTimeout(refresh, 60); });
})();
