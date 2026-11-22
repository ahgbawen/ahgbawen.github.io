/* Basecamp Bawen — kerangka halaman modul (judul, tab, filter, hasil). */
'use strict';
const MODS = {};
const ST = {};
function stateOf(k, def) { if (!ST[k]) ST[k] = Object.assign({}, def, lsGet('bw.st.' + k, {})); return ST[k]; }
const persist = k => lsSet('bw.st.' + k, { tab: ST[k].tab, unit: ST[k].unit, view: ST[k].view });
function page(root, cfg) {
  const st = cfg.st;
  const mod = MODS[cfg.key];
  root.innerHTML =
    '<div class="phead"><div class="ptitle"><span class="ptile">' + ic(mod.icon) + '</span><div><h1>' + esc(mod.title) + '</h1><p>' + esc(mod.desc) + '</p></div></div>' +
    '<div class="pact">' + (cfg.actions || []).map(a => '<button class="btn ' + (a.pri ? 'pri' : 'ghost') + '" data-pa="' + a.id + '">' + ic(a.icon || 'plus') + '<span>' + esc(a.t) + '</span></button>').join('') +
    (cfg.report ? '<button class="btn dark" data-pa="__pdf">' + ic('print') + '<span>Cetak PDF</span></button>' : '') + '</div></div>' +
    (cfg.tabs ? '<div class="tabs" role="tablist">' + cfg.tabs.map(t => '<button role="tab" data-tab="' + t.k + '" class="' + (st.tab === t.k ? 'on' : '') + '">' + esc(t.t) + '</button>').join('') + '<i class="tabline"></i></div>' : '') +
    '<div class="pfilter"></div><div class="pres"></div>';
  const fil = $('.pfilter', root), res = $('.pres', root);
  function moveLine() {
    const t = $('.tabs', root); if (!t) return;
    const on = $('.on', t), ln = $('.tabline', t);
    if (on && ln) { ln.style.width = on.offsetWidth + 'px'; ln.style.transform = 'translateX(' + on.offsetLeft + 'px)'; }
  }
  function drawFilter() {
    fil.innerHTML = cfg.filter ? cfg.filter(st) : '';
    bindPeriod(fil, st, isSearch => { if (!isSearch) drawFilter(); fill(); });
    cfg.bindFilter && cfg.bindFilter(fil, st, () => { drawFilter(); fill(true); });
  }
  function fill(anim) {
    const sy = window.scrollY;
    res.innerHTML = cfg.body(st);
    if (anim) { res.classList.remove('swap'); void res.offsetWidth; res.classList.add('swap'); }
    cfg.bind && cfg.bind(res, st, fill);
    if (!anim) window.scrollTo(0, sy);
  }
  $$('[data-tab]', root).forEach(b => b.onclick = () => {
    if (st.tab === b.dataset.tab) return;
    st.tab = b.dataset.tab; persist(cfg.key);
    $$('[data-tab]', root).forEach(x => x.classList.toggle('on', x === b));
    moveLine(); drawFilter(); fill(true);
  });
  $$('[data-pa]', root).forEach(b => b.onclick = () => b.dataset.pa === '__pdf' ? runReport(() => cfg.report(st)) : cfg.on[b.dataset.pa](st));
  drawFilter(); fill();
  requestAnimationFrame(moveLine);
  window.addEventListener('resize', moveLine);
  return { fill, drawFilter };
}
function detail({ title, sub, html, buttons, wide = true, bind }) {
  const m = modal({ title, sub, wide, body: html });
  m.foot.innerHTML = '<span class="grow"></span>' + (buttons || []).map(b => '<button class="btn ' + (b.pri ? 'pri' : b.dark ? 'dark' : 'ghost') + (b.danger ? ' dangert' : '') + '" data-db="' + b.id + '">' + (b.icon ? ic(b.icon) : '') + esc(b.t) + '</button>').join('') + '<button class="btn ghost" data-db="__close">Tutup</button>';
  $$('[data-db]', m.foot).forEach(x => x.onclick = () => { if (x.dataset.db === '__close') return m.close(); const b = buttons.find(b => b.id === x.dataset.db); b.fn(m); });
  bind && bind(m.body, m);
  return m;
}
const infoGrid = pairs => '<dl class="igrid">' + pairs.filter(Boolean).map(([k, v, raw]) => '<div><dt>' + esc(k) + '</dt><dd>' + (raw ? v : esc(v ?? '-')) + '</dd></div>').join('') + '</dl>';
const statusTone = s => ({ 'Aman': 'ok', 'Menipis': 'warn', 'Habis': 'bad', 'Kosong': 'mute', 'Lunas': 'ok', 'Sebagian': 'warn', 'Belum dibayar': 'bad', 'Terealisasi': 'ok', 'Belum terealisasi': 'bad', 'Selesai': 'ok', 'Berjalan': 'info', 'Rencana': 'mute', 'Batal': 'mute', 'Terkirim': 'ok', 'Tunda': 'warn', 'Dilaporkan': 'bad', 'Dalam Perbaikan': 'info', 'Menunggu Sparepart': 'warn', 'Menang': 'ok', 'Kalah': 'mute', 'Negosiasi': 'warn', 'Penawaran': 'info', 'Prospek': 'mute', 'Usulan': 'mute', 'Disetujui': 'info', 'Ditunda': 'warn', 'Aktif': 'ok', 'Nonaktif': 'mute', 'Tinggi': 'bad', 'Sedang': 'warn', 'Rendah': 'mute' }[s] || '');
const stChip = s => chip(s, statusTone(s));
