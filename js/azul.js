/* Azul Catering: hero and chef videos, the "what we cook" menu and the
   build-your-menu screen. Runs after main.js (which owns the language toggle,
   the booking popup and smooth scrolling). */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var es = function () { return document.documentElement.lang === 'es'; };
  var t = function (o) { return es() ? (o.es || o.en) : o.en; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* ── videos: load and play only while on screen (never with reduced motion) ── */
  var films = $$('.cover-film video, .chef-film video').map(function (v) { return { v: v, on: false }; });
  function sync() {
    films.forEach(function (f) {
      var v = f.v;
      if (!v.offsetParent) { v.pause(); return; }
      if (f.on && !reduce) {
        if (!v.getAttribute('src')) v.src = v.getAttribute('data-src');
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else if (v.getAttribute('src')) v.pause();
    });
  }
  if ('IntersectionObserver' in window) {
    films.forEach(function (f) {
      new IntersectionObserver(function (e) { f.on = e[0].isIntersecting; sync(); }, { rootMargin: '120px 0px' }).observe(f.v.parentNode);
    });
  } else films.forEach(function (f) { f.on = true; });
  sync();

  /* ── header: hidden over the hero, slides in once you start scrolling ── */
  var nav = $('.nav');
  if (nav) {
    var navOn = false;
    var showNav = function (on) {
      if (on === navOn) return;
      navOn = on;
      document.body.classList.toggle('nav-on', on);
    };
    var onScroll = function () { showNav(window.scrollY > 40 || document.body.classList.contains('sheet-open')); };
    window.addEventListener('scroll', onScroll, { passive: true });
    nav.addEventListener('focusin', function () { showNav(true); });
    nav.addEventListener('focusout', function () { setTimeout(onScroll, 0); });
    onScroll();
  }

  /* ── full-screen menu ── */
  var sheet = $('#site-menu'), burger = $('.burger');
  if (sheet && burger && sheet.showModal) {
    var sheetLang = $('.sheet-lang', sheet), navLang = $('.nav .lang');
    var labelSheet = function () {
      burger.setAttribute('aria-label', es() ? 'Abrir menú' : 'Open menu');
      $('.sheet-close', sheet).setAttribute('aria-label', es() ? 'Cerrar menú' : 'Close menu');
      sheet.setAttribute('aria-label', es() ? 'Menú' : 'Menu');
      if (sheetLang) {
        sheetLang.textContent = es() ? 'EN' : 'ES';
        sheetLang.lang = es() ? 'en' : 'es';
        sheetLang.setAttribute('aria-label', es() ? 'View in English' : 'Ver en español');
      }
    };
    var lenisIdle = function () { var p = $('#planner'); return !(p && p.open); };
    var openSheet = function () {
      var r = burger.getBoundingClientRect();
      sheet.style.setProperty('--ox', (r.left + r.width / 2) + 'px');
      sheet.style.setProperty('--oy', (r.top + r.height / 2) + 'px');
      sheet.classList.remove('is-closing');
      sheet.showModal();
      $('.sheet-links', sheet).focus({ preventScroll: true });
      document.body.classList.add('sheet-open');
      burger.setAttribute('aria-expanded', 'true');
      if (window.__lenis) window.__lenis.stop();
    };
    var closeSheet = function (then) {
      if (!sheet.open) { if (then) then(); return; }
      var finish = function () {
        sheet.classList.remove('is-closing');
        sheet.close();
        if (then) then();
      };
      if (reduce) return finish();
      sheet.classList.add('is-closing');
      setTimeout(finish, 420);
    };
    sheet.addEventListener('close', function () {
      document.body.classList.remove('sheet-open');
      burger.setAttribute('aria-expanded', 'false');
      if (window.__lenis && lenisIdle()) window.__lenis.start();
      if (!$('#planner') || !$('#planner').open) burger.focus({ preventScroll: true });
    });
    sheet.addEventListener('cancel', function (e) { e.preventDefault(); closeSheet(); });
    burger.addEventListener('click', openSheet);
    $('.sheet-close', sheet).addEventListener('click', function () { closeSheet(); });
    if (sheetLang && navLang) sheetLang.addEventListener('click', function () { navLang.click(); });

    /* a section link closes the menu, then glides to the section */
    $$('a[href^="#"]', sheet).forEach(function (a) {
      if (a.getAttribute('href') === '#build') return;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var target = $(a.getAttribute('href'));
        closeSheet(function () {
          if (!target) return;
          if (window.__lenis) { window.__lenis.start(); window.__lenis.scrollTo(target, { offset: -60 }); }
          else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
        });
      });
    });
    /* buttons that open the planner: the planner opens on top, the menu closes behind it */
    $$('[data-plan], a[href="#build"]', sheet).forEach(function (b) {
      b.addEventListener('click', function () { setTimeout(function () { sheet.close(); }, 30); });
    });
    window.addEventListener('langchange', labelSheet);
    labelSheet();
  }

  /* ── hero montage: the tag names the show on screen ── */
  var reel = $('.cover-film'), tag = reel && $('.film-tag span', reel);
  if (reel && tag) {
    var cuts = JSON.parse(reel.getAttribute('data-cuts') || '[]'), rv = $('video', reel), shown = -1;
    var mark = function () {
      var t = rv.currentTime, i = 0;
      while (i + 1 < cuts.length && t >= cuts[i + 1][0]) i++;
      if (i !== shown) { shown = i; tag.textContent = cuts[i][1]; }
    };
    var tick = function () { mark(); if (!rv.paused) requestAnimationFrame(tick); };
    rv.addEventListener('play', function () { requestAnimationFrame(tick); });
    rv.addEventListener('seeked', mark);
  }

  /* ── the one entrance: "Azul" opens wide on a full blue screen, then the blue
        shrinks into the hero panel, the name drops into place and the video
        wipes up behind it ── */
  var docEl = document.documentElement;
  var endIntro = function () { docEl.classList.remove('intro-pending'); };
  if (window.gsap && !reduce && $('.cover') && window.scrollY < 10) {
    var playIntro = function () {
      var word = $('.cover-word'), film = $('.cover-film'), panel = $('.cover-panel');
      var wr = word.getBoundingClientRect(), pr = panel.getBoundingClientRect(), cs = getComputedStyle(word);
      var radius = getComputedStyle(panel).borderTopLeftRadius;
      var intro = document.createElement('div');
      intro.className = 'intro';
      intro.setAttribute('aria-hidden', 'true');
      intro.innerHTML = '<span class="intro-word">Azul</span>';
      document.body.appendChild(intro);
      var iw = $('.intro-word', intro);
      var chef = $('.cover-chef'), ic = null;
      if (chef) {
        var cr = chef.getBoundingClientRect();
        ic = chef.cloneNode(true);
        ic.className = 'cover-chef intro-chef';
        ic.removeAttribute('data-es');
        ic.style.cssText = 'left:' + cr.left + 'px;top:' + cr.top + 'px;bottom:auto;margin:0;transform:none';
        intro.appendChild(ic);
        chef.style.visibility = 'hidden';
      }
      iw.style.cssText = 'left:' + wr.left + 'px;top:' + wr.top + 'px;width:' + wr.width + 'px;height:' + wr.height + 'px;font-size:' + cs.fontSize + ';letter-spacing:' + cs.letterSpacing + ';line-height:' + cs.lineHeight;
      word.style.visibility = 'hidden';
      docEl.style.overflow = 'hidden';
      if (window.__lenis) window.__lenis.stop();
      endIntro();
      var done = function () {
        word.style.visibility = '';
        if (chef) chef.style.visibility = '';
        docEl.style.overflow = '';
        intro.remove();
        if (window.__lenis) window.__lenis.start();
      };
      /* measure against the overlay itself, not window.innerHeight: on iPhones the
         two differ while the address bar moves, which used to crop the intro */
      var ir = intro.getBoundingClientRect();
      var shrink = 'inset(' + (pr.top - ir.top) + 'px ' + (ir.right - pr.right) + 'px ' + (ir.bottom - pr.bottom) + 'px ' + (pr.left - ir.left) + 'px round ' + radius + ')';
      gsap.set(intro, { clipPath: 'inset(0px 0px 0px 0px round 0px)' });
      var dy = (ir.top + ir.height / 2) - (wr.top + wr.height / 2);
      gsap.set(iw, { y: dy, '--wd': 75, opacity: 0 });
      if (ic) gsap.set(ic, { y: dy + 14, opacity: 0 });
      gsap.set(film, { clipPath: 'inset(100% 0% 0% 0% round 22px)' });
      gsap.timeline({ delay: 0.15, onComplete: done })
        .to(iw, { opacity: 1, duration: 0.35, ease: 'power1.out' }, 0)
        .to(iw, { '--wd': 125, duration: 1.3, ease: 'expo.out' }, 0)
        .to(intro, { clipPath: shrink, duration: 1.1, ease: 'expo.inOut' }, 1.15)
        .to(iw, { y: 0, duration: 1.1, ease: 'expo.inOut' }, 1.15)
        .to(ic || {}, { opacity: 1, y: dy, duration: 0.6, ease: 'power3.out' }, 0.55)
        .to(ic || {}, { y: 0, duration: 1.1, ease: 'expo.inOut' }, 1.15)
        .to(intro, { backgroundColor: 'rgba(43, 61, 245, 0)', duration: 0.3 }, 2.2)
        .to(film, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1, ease: 'expo.inOut', clearProps: 'clipPath' }, 2.1);
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { requestAnimationFrame(playIntro); });
    else playIntro();
  } else endIntro();

  /* ── what we cook: swipe, or use the arrows ── */
  var rail = $('.cards'), rbtns = $$('.rail-btn');
  if (rail) {
    var step = function () { var li = $('li', rail); return li ? li.getBoundingClientRect().width + (parseFloat(getComputedStyle(rail).columnGap) || 0) : 300; };
    var edge = function () {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      rbtns.forEach(function (b) { b.disabled = b.getAttribute('data-dir') === '-1' ? rail.scrollLeft <= 2 : rail.scrollLeft >= max; });
    };
    rbtns.forEach(function (b) {
      b.addEventListener('click', function () { rail.scrollBy({ left: +b.getAttribute('data-dir') * step(), behavior: reduce ? 'auto' : 'smooth' }); });
    });
    rail.addEventListener('scroll', edge, { passive: true });
    window.addEventListener('resize', edge);
    window.addEventListener('langchange', function () {
      rbtns.forEach(function (b) { b.setAttribute('aria-label', es() ? b.getAttribute('data-es-label') : (b.getAttribute('data-dir') === '-1' ? 'Previous' : 'Next')); });
      rail.setAttribute('aria-label', es() ? 'Cocinas' : 'Cuisines');
    });
    edge();
  }

  /* ── build your menu: a popup that ends in a request ── */
  var dlg = $('#planner'), root = dlg && $('.azb', dlg);
  if (!root) return;

  var OCCASIONS = [
    { id: 'wedding', en: 'Wedding', es: 'Boda', for_en: 'a wedding', for_es: 'una boda', kind: 0 },
    { id: 'party', en: 'Birthday or quince', es: 'Cumpleaños o XV', for_en: 'a birthday', for_es: 'un cumpleaños', kind: 1 },
    { id: 'office', en: 'Office lunch', es: 'Comida de oficina', for_en: 'the office', for_es: 'la oficina', kind: 2 },
    { id: 'holiday', en: 'Holiday party', es: 'Posada o fin de año', for_en: 'a holiday party', for_es: 'una posada', kind: 2 },
    { id: 'brand', en: 'Brand launch', es: 'Lanzamiento', for_en: 'a brand launch', for_es: 'un lanzamiento', kind: 3 },
    { id: 'home', en: 'Dinner at home', es: 'Cena en casa', for_en: 'dinner at home', for_es: 'una cena en casa', kind: 1 }
  ];
  var STYLES = [
    { id: 'family', en: 'Family style', es: 'Al centro' },
    { id: 'buffet', en: 'Buffet', es: 'Bufé' },
    { id: 'plated', en: 'Plated', es: 'Emplatado' },
    { id: 'stations', en: 'Stations', es: 'Estaciones' },
    { id: 'live', en: 'Cooked live', es: 'En vivo' },
    { id: 'drop', en: 'Drop-off', es: 'Solo entrega' }
  ];
  var CUISINES = [
    { id: 'mx', en: 'Mexican', es: 'Mexicana' },
    { id: 'it', en: 'Italian', es: 'Italiana' },
    { id: 'br', en: 'Brunch', es: 'Brunch' },
    { id: 'bt', en: 'Canapés', es: 'Canapés' },
    { id: 'gr', en: 'Grill', es: 'Parrilla' },
    { id: 'gd', en: 'Plant-based', es: 'De la huerta' },
    { id: 'sw', en: 'Sweet', es: 'Postres' }
  ];
  var COURSES = [
    { id: 'start', en: 'To start', es: 'Para empezar' },
    { id: 'main', en: 'Mains', es: 'Platos fuertes' },
    { id: 'side', en: 'On the side', es: 'Guarniciones' },
    { id: 'sweet', en: 'Something sweet', es: 'Algo dulce' }
  ];
  var DISHES = [
    ['guac', 'mx', 'start', 'Guacamole and totopos', 'Guacamole con totopos'],
    ['agua', 'mx', 'start', 'Shrimp aguachile', 'Aguachile de camarón'],
    ['birria', 'mx', 'main', 'Birria tacos with consomé', 'Tacos de birria con consomé'],
    ['pastor', 'mx', 'main', 'Al pastor off the trompo', 'Pastor del trompo'],
    ['mole', 'mx', 'main', 'Chicken in mole poblano', 'Pollo en mole poblano'],
    ['elote', 'mx', 'side', 'Elote with cotija', 'Elote con cotija'],
    ['arroz', 'mx', 'side', 'Red rice and black beans', 'Arroz rojo y frijoles negros'],
    ['burrata', 'it', 'start', 'Burrata with tomatoes', 'Burrata con jitomate'],
    ['vodka', 'it', 'main', 'Rigatoni alla vodka', 'Rigatoni alla vodka'],
    ['ragu', 'it', 'main', 'Short-rib ragù', 'Ragú de costilla'],
    ['risotto', 'it', 'side', 'Mushroom risotto', 'Risotto de hongos'],
    ['tira', 'it', 'sweet', 'Tiramisù', 'Tiramisú'],
    ['bene', 'br', 'main', 'Eggs Benedict', 'Huevos benedictinos'],
    ['chila', 'br', 'main', 'Chilaquiles verdes', 'Chilaquiles verdes'],
    ['fruit', 'br', 'start', 'Fruit, yogurt and granola', 'Fruta, yogur y granola'],
    ['concha', 'br', 'sweet', 'Conchas and pan dulce', 'Conchas y pan dulce'],
    ['tuna', 'bt', 'start', 'Tuna tostaditas', 'Tostaditas de atún'],
    ['caviar', 'bt', 'start', 'Caviar bites', 'Bocados con caviar'],
    ['oyster', 'bt', 'start', 'Oysters with salsa negra', 'Ostiones con salsa negra'],
    ['minitaco', 'bt', 'start', 'Mini tacos, passed', 'Taquitos para pasar'],
    ['ribeye', 'gr', 'main', 'Rib eye, sliced to order', 'Rib eye al momento'],
    ['carbon', 'gr', 'main', 'Chicken al carbón', 'Pollo al carbón'],
    ['pulpo', 'gr', 'start', 'Grilled octopus', 'Pulpo a la parrilla'],
    ['charred', 'gr', 'side', 'Charred vegetables', 'Verduras asadas'],
    ['coliflor', 'gd', 'main', 'Cauliflower al pastor', 'Coliflor al pastor'],
    ['hongos', 'gd', 'main', 'Mushroom tacos', 'Tacos de hongos'],
    ['salad', 'gd', 'start', 'Big seasonal salad', 'Ensalada de temporada'],
    ['quinoa', 'gd', 'side', 'Quinoa and black beans', 'Quinoa con frijol negro'],
    ['churros', 'sw', 'sweet', 'Churros with chocolate', 'Churros con chocolate'],
    ['tres', 'sw', 'sweet', 'Tres leches', 'Pastel de tres leches'],
    ['flan', 'sw', 'sweet', 'Flan', 'Flan'],
    ['paletas', 'sw', 'sweet', 'Paletas', 'Paletas']
  ].map(function (d) { return { id: d[0], cu: d[1], co: d[2], en: d[3], es: d[4] }; });
  var EXTRAS = [
    { id: 'bar', en: 'Bar and cocktails', es: 'Barra y coctelería' },
    { id: 'aguas', en: 'Aguas frescas', es: 'Aguas frescas' },
    { id: 'coffee', en: 'Coffee station', es: 'Estación de café' },
    { id: 'kids', en: 'Kids’ menu', es: 'Menú infantil' },
    { id: 'late', en: 'Late-night snack', es: 'Antojo de medianoche' },
    { id: 'staff', en: 'Servers and bartenders', es: 'Meseros y bartenders' },
    { id: 'rent', en: 'Tables, linens, plates', es: 'Mesas, mantelería, vajilla' },
    { id: 'cake', en: 'Cake', es: 'Pastel' }
  ];
  var DIETS = [
    { id: 'veg', en: 'Vegetarian', es: 'Vegetariano' },
    { id: 'vegan', en: 'Vegan', es: 'Vegano' },
    { id: 'gf', en: 'Gluten-free', es: 'Sin gluten' },
    { id: 'nut', en: 'Nut-free', es: 'Sin nueces' },
    { id: 'df', en: 'Dairy-free', es: 'Sin lácteos' },
    { id: 'halal', en: 'Halal', es: 'Halal' }
  ];
  var byId = function (list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; };

  /* every visit starts with nothing picked */
  var DEFAULT = { step: 0, occasion: null, guests: null, style: null, cuisine: [], dishes: [], extras: [], diet: [] };
  var S = JSON.parse(JSON.stringify(DEFAULT));
  try { localStorage.removeItem('azul-menu'); } catch (e) {}
  var save = function () {};
  var has = function (arr, id) { return arr.indexOf(id) > -1; };
  var flip = function (arr, id) { var i = arr.indexOf(id); if (i > -1) arr.splice(i, 1); else arr.push(id); };
  var guestsText = function () { return S.guests == null ? '' : S.guests + (S.guests >= 500 ? '+' : ''); };
  /* "120 guests, family style", leaving out whatever isn't picked yet */
  function metaText() {
    var parts = [];
    if (S.guests != null) parts.push(guestsText() + (es() ? ' invitados' : ' guests'));
    if (S.style) parts.push(t(byId(STYLES, S.style)).toLowerCase());
    return parts.join(', ');
  }

  var num = $('.azb-t-num', root);
  num.textContent = String(1000 + Math.floor(Math.random() * 9000));

  /* options: one button each, pressed when picked */
  /* little hand-drawn icons for the options: soft pastel fills, wobbly ink
     (the wobble is the #ink-wobble filter at the top of azul.html) */
  var ICON = {
    wedding: '<rect x="9" y="17" width="14" height="8" rx="2" fill="#FFF1D6"/><rect x="11.5" y="11" width="9" height="6" rx="2" fill="#F7A8B8"/><path d="M16 11V8"/><circle cx="16" cy="6.5" r="1.5" fill="#FFE08A"/><path d="M7 25h18"/>',
    party: '<ellipse cx="15" cy="12" rx="6" ry="7" fill="#F7A8B8"/><path d="M15 19l-1.2 2h2.4z" fill="#F7A8B8"/><path d="M15 21c2 3-2 4 0 7"/><path d="M12.4 9.6c.6-1.2 1.6-1.9 2.6-1.9" stroke="#fff"/>',
    office: '<rect x="6" y="11" width="20" height="13" rx="3" fill="#FFE08A"/><path d="M6 16h20M16 16v8"/><path d="M12 11V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    holiday: '<path d="M16 4v4"/><rect x="11" y="8" width="10" height="3" rx="1" fill="#C98B5A"/><ellipse cx="16" cy="17" rx="7" ry="6" fill="#FF9B7A"/><path d="M12 17h8M16 11v12"/><rect x="12" y="22.5" width="8" height="2.5" rx="1" fill="#C98B5A"/>',
    brand: '<path d="M16 5l2.6 7.4L26 15l-7.4 2.6L16 25l-2.6-7.4L6 15l7.4-2.6z" fill="#FFE08A"/><circle cx="25" cy="7" r="1.6" fill="#A9C7FF"/><circle cx="7" cy="24" r="1.2" fill="#F7A8B8"/>',
    home: '<path d="M6.5 15.5L16 7l9.5 8.5"/><path d="M9 14v11h14V14" fill="#FFF1D6"/><rect x="14" y="19" width="4" height="6" rx="1" fill="#C98B5A"/><path d="M21 10V7"/><path d="M20.5 5c1-1 2 0 3-1"/>',
    family: '<path d="M5 15h22a11 9 0 0 1-22 0z" fill="#FFF1D6"/><path d="M11 12c0-2 2-2 2-4M16 12c0-2 2-2 2-4M21 12c0-2 2-2 2-4"/>',
    buffet: '<path d="M6 18a10 7 0 0 1 20 0z" fill="#A9C7FF"/><path d="M4 18h24M16 11V9M9 18v5M23 18v5M7 23h18"/>',
    plated: '<circle cx="16" cy="16" r="8" fill="#FFF1D6"/><circle cx="16" cy="16" r="4.2" fill="#9BD3A0"/><path d="M4 9v14M4 9v4h2V9M28 9c-2 2-2 6 0 8v6"/>',
    stations: '<path d="M5 24h22"/><rect x="6" y="16" width="6" height="8" rx="1" fill="#FFE08A"/><rect x="13" y="12" width="6" height="12" rx="1" fill="#F7A8B8"/><rect x="20" y="17" width="6" height="7" rx="1" fill="#9BD3A0"/>',
    live: '<path d="M16 5c4 5 8 8 8 13a8 8 0 0 1-16 0c0-3 2-5 3-6 0 3 2 4 3 4-1-4 0-8 2-11z" fill="#FF9B7A"/><path d="M16 26a3.5 3.5 0 0 1-3.5-3.5c0-2 2-3.5 2-5 1.5 1.5 5 3 5 5A3.5 3.5 0 0 1 16 26z" fill="#FFE08A"/>',
    drop: '<path d="M6 12l10-5 10 5v11l-10 5-10-5z" fill="#E8C7A0"/><path d="M6 12l10 5 10-5M16 17v11"/>',
    mx: '<path d="M5 22a11 11 0 0 1 22 0z" fill="#FFE08A"/><path d="M8 19c2-2 4 0 6-2s4 0 6-2 4 0 5 1" stroke="#3E8E4E"/><circle cx="12" cy="16.5" r="1.2" fill="#F26B5B" stroke="none"/><circle cx="19.5" cy="15.5" r="1.2" fill="#F26B5B" stroke="none"/>',
    it: '<path d="M5 16h22a11 8 0 0 1-22 0z" fill="#FFF1D6"/><path d="M9 16c1-4 4-5 7-5s6 1 7 5" fill="#FFC27A"/><path d="M13 13c1 1 3 1 4 0M16 11l3-6"/>',
    br: '<path d="M8 10c3-5 12-4 14 1 4 1 5 7 1 10-3 4-11 4-14 1-4-2-5-9-1-12z" fill="#FFFFFF"/><circle cx="16" cy="16" r="4" fill="#FFC23D"/>',
    bt: '<rect x="7" y="17" width="18" height="6" rx="3" fill="#E8C7A0"/><path d="M9 17c2-3 12-3 14 0" fill="#FF9B7A"/><path d="M16 15V6"/><circle cx="16" cy="6" r="1.5" fill="#9BD3A0"/>',
    gr: '<path d="M6 13h20a10 9 0 0 1-20 0z" fill="#8A90A8"/><path d="M6 13h20M10 21l-3 6M22 21l3 6M16 22v5"/><path d="M11 9c0-2 2-2 2-4M18 9c0-2 2-2 2-4" stroke="#F26B5B"/>',
    gd: '<path d="M16 27V15"/><path d="M16 17c-6 0-9-4-9-9 6 0 9 4 9 9z" fill="#9BD3A0"/><path d="M16 15c0-5 3-8 9-8 0 5-3 8-9 8z" fill="#C6E8B4"/>',
    sw: '<path d="M9 16h14l-2 10H11z" fill="#F7A8B8"/><path d="M8 16c0-5 4-8 8-8s8 3 8 8z" fill="#FFF1D6"/><circle cx="16" cy="6.5" r="1.8" fill="#F26B5B"/>',
    bar: '<path d="M7 7h18l-9 10z" fill="#A9E4D7"/><path d="M16 17v8M11 26h10"/><circle cx="22" cy="6" r="2" fill="#9BD3A0"/>',
    aguas: '<path d="M10 9h12l-2 17h-8z" fill="#FF9BA8"/><path d="M19 9l3-5M11 14h10"/>',
    coffee: '<path d="M7 13h15v6a6 6 0 0 1-6 6h-3a6 6 0 0 1-6-6z" fill="#E8C7A0"/><path d="M22 15h2a3 3 0 0 1 0 6h-2.5M12 9c0-2 2-2 2-4M17 9c0-2 2-2 2-4"/>',
    kids: '<circle cx="16" cy="16" r="6" fill="#FFE08A"/><path d="M16 5v3M16 24v3M5 16h3M24 16h3M8.5 8.5l2 2M21.5 21.5l2 2M8.5 23.5l2-2M21.5 10.5l2-2M14 17.2c1 1 3 1 4 0"/>',
    late: '<path d="M20 6a10 10 0 1 0 6 16A8 8 0 0 1 20 6z" fill="#FFE08A"/><path d="M9 6l.8 1.8 1.8.8-1.8.8L9 11.2l-.8-1.8-1.8-.8 1.8-.8z" fill="#fff"/>',
    staff: '<path d="M6 21a10 10 0 0 1 20 0z" fill="#D9DEFA"/><path d="M4 21h24M16 11V9"/><circle cx="16" cy="7.8" r="1.4" fill="#FFE08A"/>',
    rent: '<path d="M5 12h22l-2 6H7z" fill="#FFF1D6"/><path d="M8 18v8M24 18v8M10.5 12L9.5 18M16 12v6M21.5 12l1 6"/>',
    cake: '<path d="M6 24V16l18-6v14z" fill="#FFF1D6"/><path d="M6 19.5l18-5.5"/><circle cx="20" cy="8.5" r="1.8" fill="#F26B5B"/>'
  };
  function ico(id) {
    var d = ICON[id];
    return d ? '<span class="azb-ico" aria-hidden="true"><svg viewBox="0 0 32 32">' + d + '</svg></span>' : '';
  }

  function opt(group, o, on) {
    var i = group === 'dish' || group === 'diet' ? '' : ico(o.id);
    return '<button type="button" class="azb-opt' + (on ? ' on' : '') + (i ? ' has-ico' : '') + '" data-g="' + group + '" data-id="' + o.id + '" aria-pressed="' + on + '">' + i + '<span>' + esc(t(o)) + '</span></button>';
  }
  function renderOptions() {
    $('[data-group="occasion"]', root).innerHTML = OCCASIONS.map(function (o) { return opt('occasion', o, S.occasion === o.id); }).join('');
    $('[data-group="style"]', root).innerHTML = STYLES.map(function (o) { return opt('style', o, S.style === o.id); }).join('');
    $('[data-group="cuisine"]', root).innerHTML = CUISINES.map(function (o) { return opt('cuisine', o, has(S.cuisine, o.id)); }).join('');
    $('[data-group="extras"]', root).innerHTML = EXTRAS.map(function (o) { return opt('extras', o, has(S.extras, o.id)); }).join('');
    $('[data-group="diet"]', root).innerHTML = DIETS.map(function (o) { return opt('diet', o, has(S.diet, o.id)); }).join('');
    var shown = DISHES.filter(function (d) { return has(S.cuisine, d.cu); });
    var box = $('.azb-dishes', root);
    if (!shown.length) { box.innerHTML = '<p class="azb-empty">' + (es() ? 'Elige al menos una cocina arriba.' : 'Pick at least one cuisine above.') + '</p>'; return; }
    box.innerHTML = COURSES.map(function (c) {
      var list = shown.filter(function (d) { return d.co === c.id; });
      if (!list.length) return '';
      return '<div class="azb-course"><h4>' + esc(t(c)) + '</h4><div class="azb-opts azb-opts-wrap">' +
        list.map(function (d) { return opt('dish', d, has(S.dishes, d.id)); }).join('') + '</div></div>';
    }).join('');
  }

  /* the printed menu card */
  var lastDishes = S.dishes.slice();
  function renderTicket() {
    var occ = byId(OCCASIONS, S.occasion), meta = $('.azb-t-meta', root);
    $('.azb-t-occ', root).textContent = occ ? (es() ? occ.for_es : occ.for_en) : (es() ? 'tu evento' : 'your event');
    meta.textContent = metaText(); meta.hidden = !meta.textContent;
    var picked = DISHES.filter(function (d) { return has(S.dishes, d.id); });
    var html = '';
    if (!picked.length) html += '<p class="azb-t-empty">' + (es() ? 'Todavía no hay platos. Elígelos en el paso 3.' : 'No dishes yet. Pick them in step 3.') + '</p>';
    COURSES.forEach(function (c) {
      var list = picked.filter(function (d) { return d.co === c.id; });
      if (!list.length) return;
      html += '<div class="azb-t-course"><h5>' + esc(t(c)) + '</h5><ul>' + list.map(function (d) {
        return '<li' + (has(lastDishes, d.id) ? '' : ' class="new"') + '>' + esc(t(d)) + '</li>';
      }).join('') + '</ul></div>';
    });
    if (S.extras.length) html += '<div class="azb-t-course"><h5>' + (es() ? 'Además' : 'Also') + '</h5><p>' + S.extras.map(function (id) { return esc(t(byId(EXTRAS, id))); }).join(', ') + '</p></div>';
    if (S.diet.length) html += '<div class="azb-t-course"><h5>' + (es() ? 'Dietas' : 'Dietary') + '</h5><p>' + S.diet.map(function (id) { return esc(t(byId(DIETS, id))); }).join(', ') + '</p></div>';
    $('.azb-t-body', root).innerHTML = html;
    lastDishes = S.dishes.slice();
  }

  /* ── where requests go ──
     Requests are sent straight to EMAIL through FormSubmit (formsubmit.co, free,
     no account). The very first request triggers a one-time "activate" email to
     that inbox; after the owner clicks it, every request arrives as an email.
     Clear ENDPOINT to fall back to opening the visitor's email app. */
  var EMAIL = 'info@chefsaulmontiel.com';
  var ENDPOINT = 'https://formsubmit.co/ajax/' + EMAIL;

  /* steps */
  var tabs = $$('.azb-tabs button', root), panels = $$('.azb-step', root);
  var next = $('.azb-next', root), prev = $('.azb-prev', root), send = $('.azb-send', root);
  var panel = $('.azb-panel', root), form = $('.pl-form', root), err = $('.pl-error', root);
  var done = $('.pl-done', root);
  var last = panels.length - 1;
  function labelNav() {
    prev.hidden = S.step === 0;
    next.hidden = S.step === last;
    send.hidden = S.step !== last;
    next.textContent = es() ? 'Siguiente' : 'Next';
    root.setAttribute('data-step', S.step);
  }
  function go(n) {
    S.step = Math.max(0, Math.min(last, n));
    tabs.forEach(function (b, i) { b.setAttribute('aria-selected', String(i === S.step)); b.classList.toggle('done', i < S.step); });
    panels.forEach(function (p, i) { p.hidden = i !== S.step; });
    labelNav();
    panel.scrollTop = 0;
    root.scrollTop = 0;
  }
  tabs.forEach(function (b, i) { b.addEventListener('click', function () { go(i); }); });
  prev.addEventListener('click', function () { go(S.step - 1); });
  next.addEventListener('click', function () { go(S.step + 1); });

  /* picking things */
  root.addEventListener('click', function (e) {
    var b = e.target.closest('.azb-opt');
    if (!b) return;
    var g = b.getAttribute('data-g'), id = b.getAttribute('data-id');
    if (g === 'occasion') S.occasion = id;
    else if (g === 'style') S.style = id;
    else if (g === 'cuisine') {
      flip(S.cuisine, id);
      if (!has(S.cuisine, id)) S.dishes = S.dishes.filter(function (d) { return byId(DISHES, d).cu !== id; });
    }
    else if (g === 'dish') flip(S.dishes, id);
    else if (g === 'extras') flip(S.extras, id);
    else if (g === 'diet') flip(S.diet, id);
    save(); renderOptions(); renderTicket();
    var again = $('.azb-opt[data-g="' + g + '"][data-id="' + id + '"]', root);
    if (again) again.focus({ preventScroll: true });
  });

  /* guests */
  var range = $('.azb-range', root), count = $('.azb-count', root);
  function setGuests(n) {
    S.guests = n == null ? null : Math.max(10, Math.min(500, Math.round(n / 5) * 5));
    range.value = S.guests == null ? 10 : S.guests;
    count.textContent = S.guests == null ? '–' : guestsText();
    count.classList.toggle('is-empty', S.guests == null);
    range.style.setProperty('--p', S.guests == null ? '0%' : ((S.guests - 10) / 490 * 100) + '%');
    save(); renderTicket();
  }
  range.addEventListener('input', function () { setGuests(+range.value); });
  $$('[data-guests]', root).forEach(function (b) {
    b.addEventListener('click', function () { var d = +b.getAttribute('data-guests'); setGuests(S.guests == null ? (d > 0 ? 50 : 10) : S.guests + d); });
  });

  function startOver() {
    S = JSON.parse(JSON.stringify(DEFAULT));
    save(); setGuests(S.guests); renderOptions(); renderTicket(); go(0);
  }
  $('.azb-reset', root).addEventListener('click', startOver);

  /* open and close */
  var opener = null;
  function showBuilder() { done.hidden = true; err.hidden = true; root.classList.remove('is-done'); }
  function openPlanner(e) {
    if (e) e.preventDefault();
    opener = e && e.currentTarget;
    showBuilder();
    /* a cuisine card opens the planner with that cuisine already ticked */
    var cu = opener && opener.getAttribute('data-cuisine');
    if (cu && !has(S.cuisine, cu)) { S.cuisine.push(cu); renderOptions(); renderTicket(); }
    go(0);
    dlg.showModal();
    var title = $('#planner-title', dlg); if (title) title.focus({ preventScroll: true });
    if (window.__lenis) window.__lenis.stop();
  }
  if (dlg.showModal) {
    $$('[data-plan], a[href="#build"]').forEach(function (b) { b.addEventListener('click', openPlanner); });
  }
  var closeBtn = $('.pl-close', root);
  closeBtn.addEventListener('click', function () { dlg.close(); });
  $('.pl-finish', root).addEventListener('click', function () { dlg.close(); });
  $('.pl-again', root).addEventListener('click', function () {
    form.reset(); resetPickers();
    num.textContent = String(1000 + Math.floor(Math.random() * 9000));
    showBuilder(); startOver();
  });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () {
    if (window.__lenis) window.__lenis.start();
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  });
  function labelClose() { closeBtn.setAttribute('aria-label', es() ? 'Cerrar' : 'Close'); }
  labelClose();

  /* the request, written out */
  function menuText() {
    var occ = byId(OCCASIONS, S.occasion);
    var head = [occ ? t(occ) : '', metaText()].filter(Boolean).join(', ');
    var lines = [(es() ? 'Menú Nº ' : 'Menu No. ') + num.textContent].concat(head ? [head] : []);
    COURSES.forEach(function (c) {
      var list = DISHES.filter(function (d) { return d.co === c.id && has(S.dishes, d.id); });
      if (list.length) lines.push('', t(c) + ':', list.map(function (d) { return '- ' + t(d); }).join('\n'));
    });
    if (S.extras.length) lines.push('', (es() ? 'Además: ' : 'Also: ') + S.extras.map(function (id) { return t(byId(EXTRAS, id)); }).join(', '));
    if (S.diet.length) lines.push((es() ? 'Dietas: ' : 'Dietary: ') + S.diet.map(function (id) { return t(byId(DIETS, id)); }).join(', '));
    return lines.join('\n');
  }

  /* ── date and time pickers ── */
  var loc = function () { return es() ? 'es-MX' : 'en-US'; };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var pops = $$('.pl-pop', form), picks = $$('.pl-pick', form), scrim = $('.pl-scrim', form), lastPick = null;
  /* each picker is a sheet: slides up from the bottom on phones, floats centred on wider screens */
  function openPop(id) {
    closePops(true);
    var pop = $('#' + id), b = $('[data-pick="' + id + '"]', form);
    lastPick = b; b.setAttribute('aria-expanded', 'true');
    scrim.hidden = false; pop.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { scrim.classList.add('on'); pop.classList.add('on'); }); });
    var first = $('.cal-day.on, .tm-hours .on', pop) || $('.sh-close', pop);
    setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
  }
  function closePops(quiet) {
    picks.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    pops.concat([scrim]).forEach(function (p) {
      if (p.hidden) return;
      p.classList.toggle('on', false);
      if (quiet || reduce) p.hidden = true;
      else setTimeout(function () { if (!p.classList.contains('on')) p.hidden = true; }, 300);
    });
    if (!quiet && lastPick) { lastPick.focus({ preventScroll: true }); lastPick = null; }
  }
  picks.forEach(function (b) { b.addEventListener('click', function () { openPop(b.getAttribute('data-pick')); }); });
  scrim.addEventListener('click', function () { closePops(); });
  $$('[data-close-pop]', form).forEach(function (b) { b.addEventListener('click', function () { closePops(); }); });
  /* Escape closes the sheet, not the whole planner */
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pops.some(function (p) { return !p.hidden; })) { e.preventDefault(); e.stopPropagation(); closePops(); }
  });
  function showVal(name, text) {
    var b = $('[data-pick="' + (name === 'date' ? 'pl-cal' : 'pl-clock') + '"]', form), v = $('.pl-pick-val', b);
    if (text) { v.textContent = text; b.classList.add('has-val'); }
    else { v.textContent = v.getAttribute(es() ? 'data-ph-es' : 'data-ph-en'); b.classList.toggle('has-val', false); }
  }

  /* calendar: past days are greyed out */
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var calY = today.getFullYear(), calM = today.getMonth(), picked = null;
  var calGrid = $('.cal-grid', form), calTitle = $('.cal-title', form);
  function fmtDate(d) { return d.toLocaleDateString(loc(), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }
  function renderCal() {
    var first = new Date(calY, calM, 1);
    calTitle.textContent = first.toLocaleDateString(loc(), { month: 'long', year: 'numeric' });
    var html = '';
    for (var w = 0; w < 7; w++) html += '<span class="cal-wd" aria-hidden="true">' + new Date(2024, 8, 1 + w).toLocaleDateString(loc(), { weekday: 'narrow' }) + '</span>';
    for (var i = 0; i < first.getDay(); i++) html += '<span></span>';
    var days = new Date(calY, calM + 1, 0).getDate();
    for (var d = 1; d <= days; d++) {
      var day = new Date(calY, calM, d), past = day < today;
      var sel = !!picked && day.getTime() === picked.getTime(), isToday = day.getTime() === today.getTime();
      html += '<button type="button" class="cal-day' + (sel ? ' on' : '') + (isToday ? ' today' : '') + '" data-d="' + d + '"' + (past ? ' disabled' : '') + ' aria-pressed="' + sel + '" aria-label="' + day.toLocaleDateString(loc(), { weekday: 'long', month: 'long', day: 'numeric' }) + '">' + d + '</button>';
    }
    calGrid.innerHTML = html;
    var prevB = $('[data-cal="-1"]', form), nextB = $('[data-cal="1"]', form);
    prevB.disabled = calY === today.getFullYear() && calM === today.getMonth();
    prevB.setAttribute('aria-label', es() ? 'Mes anterior' : 'Previous month');
    nextB.setAttribute('aria-label', es() ? 'Mes siguiente' : 'Next month');
  }
  $$('.cal-nav', form).forEach(function (b) {
    b.addEventListener('click', function () {
      calM += +b.getAttribute('data-cal');
      if (calM < 0) { calM = 11; calY--; }
      if (calM > 11) { calM = 0; calY++; }
      renderCal();
    });
  });
  calGrid.addEventListener('click', function (e) {
    var b = e.target.closest('.cal-day');
    if (!b || b.disabled) return;
    picked = new Date(calY, calM, +b.getAttribute('data-d'));
    form.elements.date.value = picked.getFullYear() + '-' + pad(picked.getMonth() + 1) + '-' + pad(picked.getDate());
    renderCal(); showVal('date', fmtDate(picked));
    setTimeout(function () { if (!$('#pl-cal').hidden) closePops(); }, 200);
  });

  /* time: hour chips, minute chips and AM / PM */
  var tm = { h: 6, m: 0, ap: 'PM', set: false };
  var hoursEl = $('.tm-hours', form), minsEl = $('.tm-mins', form);
  function fmtTime() {
    return new Date(2024, 0, 1, (tm.h % 12) + (tm.ap === 'PM' ? 12 : 0), tm.m).toLocaleTimeString(loc(), { hour: 'numeric', minute: '2-digit' });
  }
  function chips(el, vals, cur, label) {
    el.innerHTML = vals.map(function (v) {
      return '<button type="button" data-v="' + v + '" class="' + (v === cur ? 'on' : '') + '" aria-pressed="' + (v === cur) + '">' + label(v) + '</button>';
    }).join('');
  }
  function renderTime() {
    chips(hoursEl, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], tm.h, String);
    chips(minsEl, [0, 15, 30, 45], tm.m, function (v) { return ':' + pad(v); });
    $('.tm-read', form).textContent = fmtTime();
    $$('[data-ap]', form).forEach(function (b) {
      var ap = b.getAttribute('data-ap'), on = ap === tm.ap;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      b.textContent = es() ? (ap === 'AM' ? 'a. m.' : 'p. m.') : ap;
    });
  }
  hoursEl.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (b) { tm.h = +b.getAttribute('data-v'); renderTime(); } });
  minsEl.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (b) { tm.m = +b.getAttribute('data-v'); renderTime(); } });
  $$('[data-ap]', form).forEach(function (b) { b.addEventListener('click', function () { tm.ap = b.getAttribute('data-ap'); renderTime(); }); });
  $('.tm-done', form).addEventListener('click', function () {
    tm.set = true;
    form.elements.time.value = pad((tm.h % 12) + (tm.ap === 'PM' ? 12 : 0)) + ':' + pad(tm.m);
    showVal('time', fmtTime());
    closePops();
  });
  function resetPickers() {
    picked = null; calY = today.getFullYear(); calM = today.getMonth();
    tm = { h: 6, m: 0, ap: 'PM', set: false };
    showVal('date', ''); showVal('time', ''); closePops(true); renderCal(); renderTime();
  }
  function labelCloses() { $$('.sh-close', form).forEach(function (b) { b.setAttribute('aria-label', es() ? 'Cerrar' : 'Close'); }); }
  window.addEventListener('langchange', function () {
    renderCal(); renderTime(); labelCloses();
    showVal('date', picked ? fmtDate(picked) : '');
    showVal('time', tm.set ? fmtTime() : '');
  });
  renderCal(); renderTime(); labelCloses();

  /* event address: suggestions from Photon (OpenStreetMap data, free, no key),
     nudged towards New Jersey and New York. Whatever the visitor types is kept
     as-is when nothing matches. */
  var addr = $('#pl-place', form), addrPop = $('.addr-pop', form), addrList = $('.addr-list', form);
  var addrTimer = 0, addrReq = null, addrItems = [], addrActive = -1;
  function addrLabel(p) {
    var street = [p.housenumber, p.street].filter(Boolean).join(' ');
    var town = [p.city || p.town || p.village || p.district || p.county, [p.state, p.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    var name = p.name && p.name !== street ? p.name : '';
    var main = name || street || town;
    var sub = name ? [street, town].filter(Boolean).join(', ') : (street ? town : '');
    return { main: main, sub: sub, full: [main, sub].filter(Boolean).join(', ') };
  }
  function addrClose() {
    addrPop.hidden = true; addrActive = -1;
    addr.setAttribute('aria-expanded', 'false'); addr.removeAttribute('aria-activedescendant');
  }
  function addrRender() {
    if (!addrItems.length) { addrClose(); return; }
    addrList.innerHTML = addrItems.map(function (it, i) {
      return '<li id="pl-addr-' + i + '" role="option" aria-selected="' + (i === addrActive) + '" data-i="' + i + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>' +
        '<div><b>' + esc(it.main) + '</b>' + (it.sub ? '<small>' + esc(it.sub) + '</small>' : '') + '</div></li>';
    }).join('');
    addrPop.hidden = false;
    addr.setAttribute('aria-expanded', 'true');
    if (addrActive > -1) addr.setAttribute('aria-activedescendant', 'pl-addr-' + addrActive);
    else addr.removeAttribute('aria-activedescendant');
  }
  function addrPick(i) {
    var it = addrItems[i];
    if (!it) return;
    addr.value = it.full; addrItems = []; addrClose();
  }
  addr.addEventListener('input', function () {
    clearTimeout(addrTimer);
    var q = addr.value.trim();
    if (q.length < 3) { addrItems = []; addrClose(); return; }
    addrTimer = setTimeout(function () {
      if (addrReq) addrReq.abort();
      addrReq = window.AbortController ? new AbortController() : null;
      var url = 'https://photon.komoot.io/api/?q=' + encodeURIComponent(q) + '&limit=8&lat=40.66&lon=-74.21&zoom=9&location_bias_scale=0.2&lang=en';
      fetch(url, addrReq ? { signal: addrReq.signal } : {})
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var seen = {};
          addrItems = (d.features || []).map(function (f) { return f.properties || {}; })
            .filter(function (p) { return p.countrycode === 'US'; })
            .map(addrLabel)
            .filter(function (l) { if (!l.main || seen[l.full]) return false; seen[l.full] = true; return true; })
            .slice(0, 5);
          addrActive = -1;
          if (document.activeElement === addr) addrRender();
        })
        .catch(function () {});
    }, 250);
  });
  addr.addEventListener('keydown', function (e) {
    if (addrPop.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); addrActive = Math.min(addrItems.length - 1, addrActive + 1); addrRender(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); addrActive = Math.max(-1, addrActive - 1); addrRender(); }
    else if (e.key === 'Enter' && addrActive > -1) { e.preventDefault(); addrPick(addrActive); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); addrClose(); }
  });
  /* keep focus in the field while a suggestion is tapped */
  addrList.addEventListener('mousedown', function (e) { e.preventDefault(); });
  addrList.addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) addrPick(+li.getAttribute('data-i')); });
  addr.addEventListener('blur', function () { setTimeout(addrClose, 150); });
  /* on phones, lift the field to the top so the suggestions sit above the keyboard */
  addr.addEventListener('focus', function () {
    if (window.matchMedia('(max-width: 700px)').matches) setTimeout(function () { addr.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); }, 300);
  });
  function addrPlaceholder() { addr.placeholder = addr.getAttribute(es() ? 'data-ph-es' : 'data-ph-en'); }
  addrPlaceholder();
  window.addEventListener('langchange', addrPlaceholder);

  /* send */
  function fail(msg, field) { err.textContent = msg; err.hidden = false; if (field) field.focus(); }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    var f = form.elements, who = f.name.value.trim(), email = f.email.value.trim();
    if (!who) return fail(es() ? 'Escribe tu nombre para saber a quién responder.' : 'Add your name so we know who to reply to.', f.name);
    if (!email || !f.email.checkValidity()) return fail(es() ? 'Escribe un correo al que podamos responder, como nombre@correo.com.' : 'Add an email we can reply to, like name@example.com.', f.email);
    if ((f.phone.value.match(/\d/g) || []).length < 7) return fail(es() ? 'Escribe un teléfono para poder llamarte.' : 'Add a phone number so we can call you.', f.phone);
    if (f.place.value.trim().length < 5) return fail(es() ? 'Escribe la dirección del evento para saber a dónde llevar la comida.' : 'Add the event address so we know where to bring the food.', f.place);
    var details = [(es() ? 'Nombre: ' : 'Name: ') + who, (es() ? 'Correo: ' : 'Email: ') + email, (es() ? 'Teléfono: ' : 'Phone: ') + f.phone.value.trim()];
    if (f.date.value) details.push((es() ? 'Fecha: ' : 'Date: ') + (picked ? fmtDate(picked) : f.date.value));
    if (f.time.value) details.push((es() ? 'Hora: ' : 'Time: ') + fmtTime());
    if (f.place.value.trim()) details.push((es() ? 'Dirección: ' : 'Address: ') + f.place.value.trim());
    var notes = f.notes.value.trim();
    var body = details.join('\n') + '\n\n' + menuText() + (notes ? '\n\n' + notes : '');
    var subject = (es() ? 'Solicitud Azul Catering: ' : 'Azul Catering request: ') + (S.occasion ? t(byId(OCCASIONS, S.occasion)) + ', ' : '') + who;

    if (!ENDPOINT) {
      window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      return thanks(who, email, false);
    }
    var label = send.textContent;
    send.disabled = true;
    send.textContent = es() ? 'Enviando…' : 'Sending…';
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: subject, _template: 'table', _captcha: 'false',
        Name: who, email: email, Phone: f.phone.value.trim(),
        'Event date': f.date.value ? (picked ? fmtDate(picked) : f.date.value) : '–',
        'Event time': f.time.value ? fmtTime() : '–',
        'Event address': f.place.value.trim(),
        Menu: menuText(), Notes: notes || '–',
        Language: es() ? 'Español' : 'English'
      })
    }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json().catch(function () { return {}; });
    }).then(function (d) {
      if (d && String(d.success) === 'false') throw new Error(d.message || 'not sent');
      thanks(who, email, true);
    }).catch(function () {
      fail(es() ? 'Tu solicitud no se envió. Revisa tu conexión y vuelve a intentarlo, o escríbenos a ' + EMAIL + '.' : 'Your request didn’t go through. Check your connection and try again, or email ' + EMAIL + '.');
    }).then(function () { send.disabled = false; send.textContent = label; });
  });

  /* thank you */
  function thanks(who, email, sent) {
    var first = who.split(/\s+/)[0];
    $('.pl-thanks', root).textContent = es() ? '¡Gracias, ' + first + '!' : 'Thank you, ' + first + '!';
    $('.pl-done-text', root).textContent = sent
      ? (es() ? 'Saúl ya tiene tu solicitud. Te va a responder a ' + email + ' con un menú para tu evento.' : 'Saúl has your request. He’ll reply to ' + email + ' with a menu for your event.')
      : (es() ? 'Tu solicitud ya está escrita en tu app de correo. Dale enviar y Saúl te responderá con un menú para tu evento.' : 'Your request is written out in your email app. Press send there, and Saúl will reply with a menu for your event.');
    $('.pl-done-num', root).textContent = (es() ? 'Tu número de menú es el ' : 'Your menu number is ') + num.textContent;
    root.classList.add('is-done');
    done.hidden = false;
    done.focus();
  }

  window.addEventListener('langchange', function () { renderOptions(); renderTicket(); labelNav(); labelClose(); });
  setGuests(S.guests);
  renderOptions();
  renderTicket();
  go(0);
})();
