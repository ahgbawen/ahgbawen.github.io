/* Kartu 7 Bahan & Supplier (harga maju dengan riwayat), Kartu 8 Maintenance, Kartu 9 BPPB. */
'use strict';

/* =================== 7. BAHAN & SUPPLIER =================== */
MODS.bahan = {
  title: 'Bahan & Supplier', icon: 'bahan', desc: 'Master harga bahan dengan riwayat harga, data supplier dan kontak WhatsApp',
  render(root) {
    const st = stateOf('bahan', { tab: 'harga', q: '' });
    st.units = false;
    return page(root, {
      key: 'bahan', st, report: bahanReport,
      tabs: [{ k: 'harga', t: 'Daftar Harga Bahan' }, { k: 'supp', t: 'Supplier' }],
      actions: [{ id: 'harga', t: 'Update Harga', pri: true, icon: 'refresh' }, { id: 'supp', t: 'Tambah Supplier' }],
      on: { harga: () => hargaForm(), supp: () => suppForm() },
      filter: s => periodBar(s, 'bahan', s.tab === 'harga' ? '<select data-fk="kat"><option value="">Semua kategori</option>' + MAT_KAT.map(k => '<option' + (s.kat === k ? ' selected' : '') + '>' + k + '</option>').join('') + '</select>' : ''),
      body: s => {
        if (s.tab === 'supp') {
          const rows = all('supp').filter(x => qMatch(s.q, x.nama, x.pic, x.bahan, x.alamat)).sort((a, b) => a.nama.localeCompare(b.nama));
          return '<section class="card">' + table([
            { t: 'Supplier', f: x => '<b>' + esc(x.nama) + '</b><small>' + esc(x.pic || '') + '</small>', raw: true }, { t: 'WhatsApp', f: x => waShow(x.wa) }, { t: 'Bahan yang disuplai', f: x => x.bahan || '-', cls: 'wrap' },
            { t: 'Alamat', f: x => x.alamat || '-', cls: 'wrap' }, { t: 'Update harga', f: x => all('harga').filter(h => h.supp === x.nama).length, num: true },
            { t: '', f: x => x.wa ? '<a class="ibtn wa" data-wa target="_blank" rel="noopener" title="Chat WhatsApp" href="' + esc(waLink(x.wa)) + '">' + ic('wa') + '</a>' : '', raw: true }
          ], rows, { click: true, empty: 'Belum ada supplier.', emptyIcon: 'bahan' }) + '</section>';
        }
        const rows = allMatNames().filter(m => (!s.kat || m.kat === s.kat) && qMatch(s.q, m.nama, m.kat)).map(m => { const h = priceHist(m.nama); return Object.assign({ id: m.nama, h }, m); }).filter(m => m.h.length);
        const upd = all('harga').filter(h => inMonth(h.tgl, curMonth())).length;
        return '<div class="kpis">' + kpi('Material berharga', rows.length) + kpi('Update harga bulan ini', upd) + kpi('Supplier terdaftar', all('supp').length) + kpi('Harga naik / turun', rows.filter(r => r.h[1] && r.h[0].harga > r.h[1].harga).length + ' / ' + rows.filter(r => r.h[1] && r.h[0].harga < r.h[1].harga).length, 'dibanding harga sebelumnya') + '</div>' +
          '<section class="card">' + table([
            { t: 'Material', f: m => '<b>' + esc(m.nama) + '</b><small>' + esc(m.kat) + '</small>', raw: true }, { t: 'Satuan', f: m => m.h[0].sat || m.sat },
            { t: 'Harga terbaru', f: m => '<b class="price">' + rp(m.h[0].harga) + '</b><small>' + (m.h[0].acuan ? 'acuan RAPU-BUASO' : 'per ' + tgl(m.h[0].tgl)) + '</small>', num: true, raw: true },
            { t: 'Harga sebelumnya', f: m => m.h[1] ? '<s>' + rp(m.h[1].harga) + '</s><small>' + (m.h[1].acuan ? 'acuan' : tgl(m.h[1].tgl)) + '</small>' : '-', num: true, raw: true },
            { t: 'Perubahan', f: m => { if (!m.h[1] || !m.h[1].harga) return '-'; const c = (m.h[0].harga - m.h[1].harga) / m.h[1].harga; return '<span class="' + (c > 0 ? 't-bad' : c < 0 ? 't-ok' : '') + '">' + (c > 0 ? 'Naik ' : c < 0 ? 'Turun ' : 'Tetap ') + nf2.format(Math.abs(c) * 100) + '%</span>'; }, num: true, raw: true },
            { t: 'Supplier', f: m => m.h[0].supp || '-' }, { t: 'Riwayat', f: m => m.h.length + ' harga', num: true }
          ], rows, { click: true, empty: 'Tidak ada material.' }) + '</section>';
      },
      bind: (el, s) => { $$('[data-row]', el).forEach(tr => tr.onclick = () => s.tab === 'supp' ? suppForm(get(tr.dataset.row)) : hargaHist(tr.dataset.row)); $$('[data-wa]', el).forEach(a => a.onclick = e => e.stopPropagation()); }
    });
  },
  summary() { const n = all('harga').filter(h => inMonth(h.tgl, curMonth())).length; return { main: n + ' update harga bulan ini', sub: all('supp').length + ' supplier terdaftar' }; }
};
function hargaHist(nama) {
  const h = priceHist(nama);
  const mi = allMatNames().find(m => m.nama === nama) || {};
  detail({
    title: 'Riwayat Harga — ' + nama, sub: (mi.kat || '') + ' · harga lama tetap tersimpan sebagai riwayat',
    html: '<div class="hist">' + h.map((x, i) => '<div class="hrow' + (i === 0 ? ' now' : '') + '"' + (x.acuan ? '' : ' data-hid="' + x.id + '"') + '><div class="hdot"></div><div class="hmain"><b class="' + (i ? 'old' : '') + '">' + rp(x.harga) + ' <small>/ ' + esc(x.sat || '') + '</small></b>' +
      (i < h.length - 1 && h[i + 1].harga ? (() => { const c = (x.harga - h[i + 1].harga) / h[i + 1].harga; return c ? '<span class="' + (c > 0 ? 't-bad' : 't-ok') + '">' + (c > 0 ? 'naik ' : 'turun ') + nf2.format(Math.abs(c) * 100) + '%</span>' : ''; })() : '') +
      '<p>' + (x.acuan ? 'Harga acuan RAPU-BUASO' : 'Berlaku ' + tgl(x.tgl, true)) + (x.supp ? ' · ' + esc(x.supp) : '') + (x.ket ? ' · ' + esc(x.ket) : '') + (x._by ? ' · dicatat ' + esc(x._by) + ' ' + tglJam(x._at) : '') + '</p></div>' + (i === 0 ? chip('Berlaku', 'ok') : '') + '</div>').join('') + '</div>',
    bind: (el, m) => $$('[data-hid]', el).forEach(r => r.onclick = () => { m.close(); hargaForm(get(r.dataset.hid)); }),
    buttons: [{ id: 'up', t: 'Update Harga', icon: 'refresh', pri: true, fn: m => { m.close(); hargaForm(null, { mat: nama }); } }]
  });
}
function hargaForm(d, pre) {
  const v = d ? Object.assign({}, d) : Object.assign({ tgl: today() }, pre || {});
  const satOf = x => { const m = allMatNames().find(m => m.nama === x.mat); const lp = latestPrice(x.mat); return (lp && lp.sat) || (m && m.sat) || ''; };
  if (!d && v.mat) v.sat = satOf(v);
  openForm({
    title: d ? 'Koreksi Data Harga' : 'Update Harga Bahan', sub: d ? 'Koreksi salah input; untuk perubahan harga gunakan Update Harga' : 'Harga baru ditambahkan ke depan — harga lama tetap tercatat sebagai riwayat', value: v,
    onDelete: d ? () => remove(d.id) : null,
    fields: [
      { k: 'mat', label: 'Material', type: 'select', req: true, full: true, opts: () => allMatNames().map(m => ({ v: m.nama, t: m.nama })), add: { label: 'Tambah material baru…', fn: () => addMaterialDialog('Umum') }, onChange: x => { x.sat = satOf(x); } },
      { k: 'prev', type: 'html', html: x => { const lp = x.mat && latestPrice(x.mat); return lp ? '<div class="note">Harga berlaku saat ini: <b>' + rp(lp.harga) + ' / ' + esc(lp.sat) + '</b> ' + (lp.acuan ? '(acuan RAPU-BUASO)' : 'sejak ' + tgl(lp.tgl)) + (x.harga && lp.harga ? ' · perubahan <b>' + ((x.harga - lp.harga) / lp.harga * 100).toFixed(1).replace('.', ',') + '%</b>' : '') + '</div>' : ''; } },
      { k: 'harga', label: 'Harga baru (excl. PPN)', type: 'money', req: true },
      { k: 'sat', label: 'Per satuan', type: 'select', opts: SATUAN, empty: false },
      { k: 'tgl', label: 'Berlaku mulai', type: 'date', req: true },
      { k: 'supp', label: 'Supplier', type: 'select', opts: () => all('supp').map(s => s.nama), empty: '— Pilih supplier —', add: { label: 'Tambah supplier baru…', fn: () => new Promise(r => suppForm(null, n => r(n), () => r(null))) } },
      { k: 'ket', label: 'Keterangan', ph: 'mis. penawaran via WA, harga franco basecamp' }
    ],
    onSave: x => { save('harga', { mat: x.mat, sat: x.sat, harga: +x.harga, tgl: x.tgl, supp: x.supp || '', ket: x.ket || '' }, d && d.id); toast('Harga ' + x.mat + ' ' + rp(x.harga) + ' tersimpan'); }
  });
}
function suppForm(d, cb, onCancel) {
  const v = d ? Object.assign({}, d) : {};
  openForm({
    title: d ? 'Ubah Supplier' : 'Tambah Supplier', value: v, onDelete: d ? () => remove(d.id) : null, onCancel,
    extraBtn: d && d.wa ? { html: '<a class="btn wa" target="_blank" rel="noopener" href="' + esc(waLink(d.wa)) + '">' + ic('wa') + 'Chat WA</a>', bind: () => { } } : null,
    fields: [
      { k: 'nama', label: 'Nama supplier', req: true, full: true }, { k: 'pic', label: 'Kontak person' }, { k: 'wa', label: 'No. WhatsApp', type: 'tel', ph: '08xxxxxxxxxx' },
      { k: 'telp', label: 'Telepon kantor', type: 'tel' }, { k: 'npwp', label: 'NPWP' },
      { k: 'bahan', label: 'Bahan yang disuplai', full: true, ph: 'mis. Solar Industri, Oli' }, { k: 'alamat', label: 'Alamat', type: 'textarea', rows: 2 }, { k: 'ket', label: 'Catatan (termin, minimal order, dll.)', type: 'textarea', rows: 2 }
    ],
    onSave: x => { const data = { nama: x.nama.trim(), pic: x.pic || '', wa: x.wa ? waNorm(x.wa) : '', telp: x.telp || '', npwp: x.npwp || '', bahan: x.bahan || '', alamat: x.alamat || '', ket: x.ket || '' }; save('supp', data, d && d.id); toast('Supplier ' + data.nama + ' tersimpan'); cb && setTimeout(() => cb(data.nama), 0); }
  });
}
async function bahanReport(s) {
  const R = await pdfReport({ title: 'Daftar Harga Bahan & Supplier', sub: BC + ' · per ' + tgl(today(), true), orient: 'l', fname: 'Daftar_Harga_Bahan' });
  const rows = allMatNames().filter(m => (!s.kat || m.kat === s.kat) && qMatch(s.q, m.nama, m.kat)).map(m => Object.assign({ h: priceHist(m.nama) }, m)).filter(m => m.h.length);
  R.h2('Harga Bahan Berlaku');
  R.table(['No', 'Material', 'Kategori', 'Satuan', 'Harga Berlaku', 'Sejak', 'Harga Sebelumnya', 'Tanggal', 'Perubahan', 'Supplier'], rows.map((m, i) => { const a = m.h[0], b = m.h[1]; const c = b && b.harga ? (a.harga - b.harga) / b.harga : null; return [i + 1, m.nama, m.kat, a.sat, cellR(R_(a.harga)), a.acuan ? 'Acuan' : tgl(a.tgl), cellR(b ? R_(b.harga) : '-'), b ? (b.acuan ? 'Acuan' : tgl(b.tgl)) : '-', cellR(c == null ? '-' : (c > 0 ? '+' : '') + nf2.format(c * 100) + '%'), a.supp || '-']; }), { fs: 7.4, cs: { 0: { halign: 'center', cellWidth: 8 } } });
  const ch = rows.filter(m => m.h.length > 1);
  if (ch.length) {
    R.h2('Riwayat Perubahan Harga');
    const body = []; ch.forEach(m => m.h.forEach((x, i) => body.push([i ? '' : m.nama, x.acuan ? 'Acuan RAPU-BUASO' : tgl(x.tgl), cellR(R_(x.harga)), x.sat, x.supp || '-', x.ket || '-', i ? 'Riwayat' : 'Berlaku'])));
    R.table(['Material', 'Berlaku Mulai', 'Harga', 'Satuan', 'Supplier', 'Keterangan', 'Status'], body, { fs: 7.4 });
  }
  const sp = all('supp');
  if (sp.length) { R.h2('Data Supplier'); R.table(['No', 'Supplier', 'Kontak', 'WhatsApp', 'Telepon', 'Bahan', 'Alamat'], sp.map((x, i) => [i + 1, x.nama, x.pic || '-', waShow(x.wa), x.telp || '-', x.bahan || '-', x.alamat || '-']), { fs: 7.4 }); }
  R.sign();
  await R.save();
}

/* =================== 8. MAINTENANCE =================== */
const MT_STATUS = ['Dilaporkan', 'Dalam Perbaikan', 'Menunggu Sparepart', 'Selesai'];
MODS.mt = {
  title: 'Maintenance Alat', icon: 'mt', desc: 'Kerusakan & perawatan alat berat dan alat produksi, estimasi, material, dan BPPB',
  render(root) {
    const st = stateOf('mt', { tab: 'aktif', unit: '', q: '', month: '' });
    st.umum = true;
    return page(root, {
      key: 'mt', st, report: s => s.tab === 'program' ? programReport(s) : mtReport(s),
      tabs: [{ k: 'aktif', t: 'Perbaikan Aktif' }, { k: 'program', t: 'Program Perbaikan Basecamp' }, { k: 'semua', t: 'Riwayat' }],
      actions: [{ id: 'add', t: 'Laporkan Kerusakan', pri: true }],
      on: { add: () => mtForm() },
      filter: s => periodBar(s),
      body: s => {
        if (s.tab === 'program') return programHtml(s);
        const a = mtRows(s);
        const all_ = all('mt');
        return '<div class="kpis">' + kpi('Perbaikan aktif', all_.filter(m => m.status !== 'Selesai').length) + kpi('Lewat estimasi', all_.filter(m => mtLate(m)).length, '', all_.some(mtLate) ? 'bad' : '') + kpi('Menunggu sparepart', all_.filter(m => m.status === 'Menunggu Sparepart').length, '', 'warn') + kpi('Selesai bulan ini', all_.filter(m => m.status === 'Selesai' && inMonth(m.selesai, curMonth())).length, '', 'good') + '</div>' +
          '<section class="card">' + table([
            { t: 'Tanggal', f: m => tgl(m.tgl) }, { t: 'Unit', f: m => unitChip(m.unit), raw: true }, { t: 'Alat', f: m => '<b>' + esc(m.alat) + '</b><small>' + esc(m.jenis || '') + '</small>', raw: true },
            { t: 'Kerusakan / pekerjaan', f: m => m.kerusakan, cls: 'wrap' },
            { t: 'Estimasi', f: m => m.estHari ? '<b class="' + (mtLate(m) ? 't-bad' : '') + '">' + num(m.estHari) + ' hari</b><small>target ' + tgl(addDays(m.tgl, Math.ceil(+m.estHari))) + (mtLate(m) ? ' · lewat' : '') + '</small>' : '-', raw: true },
            { t: 'Material', f: m => (m.mat || []).filter(x => x.nama).map(x => x.nama + ' ' + num(x.qty) + ' ' + (x.sat || '')).join(', ') || '-', cls: 'wrap' },
            { t: 'BPPB', f: m => m.bppb ? '<b>' + esc(m.bppb) + '</b><small>' + esc(bppbStatOf(m.bppb)) + '</small>' : '<span class="muted">Belum</span>', raw: true },
            { t: 'Status', f: m => stChip(m.status || 'Dilaporkan'), raw: true }
          ], a, { click: true, empty: s.tab === 'aktif' ? 'Tidak ada perbaikan aktif. Semua alat beroperasi normal.' : 'Belum ada riwayat maintenance.', emptyIcon: 'mt' }) + '</section>';
      },
      bind: el => { $$('[data-row]', el).forEach(tr => tr.onclick = () => mtForm(get(tr.dataset.row.split(':')[0]))); $$('[data-prog]', el).forEach(b => b.onclick = () => mtForm(null, { program: b.dataset.prog, unit: b.dataset.u, jenis: 'Perbaikan', status: 'Dalam Perbaikan' })); }
    });
  },
  summary() { const a = all('mt').filter(m => m.status !== 'Selesai'); const l = a.filter(mtLate).length; return { main: a.length + ' perbaikan aktif', sub: l ? l + ' lewat estimasi' : 'Tidak ada yang terlambat', tone: l ? 'warn' : '' }; }
};
function programs(s) {
  const g = new Map();
  all('mt').filter(m => m.program && (!s.unit || m.unit === s.unit) && qMatch(s.q, m.program, m.alat, m.kerusakan, (m.mat || []).map(i => i.nama).join(' '))).forEach(m => { if (!g.has(m.program)) g.set(m.program, []); g.get(m.program).push(m); });
  return [...g.entries()].map(([nama, list]) => {
    const mats = []; list.forEach(m => (m.mat || []).forEach(i => mats.push(Object.assign({ m, st: itemSt(Object.assign({ real: 0 }, i)) }, i))));
    const kerja = list.filter(m => !(m.mat || []).length);
    return { nama, unit: list[0].unit, list, mats, kerja, rab: sum(mats, i => (+i.qty || 0) * (+i.harga || 0)), selesai: kerja.filter(m => m.status === 'Selesai').length };
  }).sort((a, b) => UNITS.indexOf(a.unit) - UNITS.indexOf(b.unit));
}
function programHtml(s) {
  const ps = programs(s);
  if (!ps.length) return '<div class="empty">' + ic('mt') + '<p>Belum ada program perbaikan.</p></div>';
  return '<div class="kpis">' + kpi('Program perbaikan', ps.length) + kpi('Total RAB material', rpS(sum(ps, 'rab'))) + kpi('Pekerjaan selesai', sum(ps, 'selesai') + ' / ' + sum(ps, p => p.kerja.length), '', 'good') + kpi('Item belum ter PO', sum(ps, p => p.mats.filter(i => i.st === 'Belum ter PO').length), '', 'bad') + '</div>' +
    ps.map(p => {
      const st = t => p.mats.filter(i => i.st === t);
      return '<section class="card"><div class="chead"><div>' + unitChip(p.unit) + '<h3>' + esc(p.nama) + '</h3></div><div class="cmeta">RAB ' + rp(p.rab) + ' · ' + p.mats.length + ' item material · ' + p.kerja.length + ' pekerjaan</div></div>' +
        '<div class="buaso">' + ['Belum ter PO', 'Sudah PO, belum terbayar', 'Datang, belum terbayar', 'Diterima'].map(t => '<div><span>' + t + '</span><b>' + st(t).length + ' item</b><small>' + rp(sum(st(t), i => (+i.qty || 0) * (+i.harga || 0))) + '</small></div>').join('') + '</div>' +
        (p.kerja.length ? '<h4 class="sub">Pekerjaan perbaikan</h4>' + table([{ t: 'No', f: m => m.no, cls: 'c' }, { t: 'Pekerjaan', f: m => m.kerusakan, cls: 'strong wrap' }, { t: 'Alat', f: m => m.alat }, { t: 'PIC', f: m => m.pic || '-' }, { t: 'Estimasi', f: m => m.estHari ? num(m.estHari) + ' hari' : '-' }, { t: 'Status', f: m => stChip(m.status || 'Dilaporkan'), raw: true }], p.kerja.map((m, i) => Object.assign({ no: i + 1 }, m)), { click: true }) : '') +
        (p.mats.length ? '<h4 class="sub">RAB material & sparepart</h4>' + table([{ t: 'No', f: i => i.no, cls: 'c' }, { t: 'Uraian barang', f: i => i.nama, cls: 'strong' }, { t: 'Qty', f: i => num(i.qty) + ' ' + (i.sat || ''), num: true }, { t: 'Harga satuan', f: i => rp(i.harga), num: true }, { t: 'Total', f: i => rp((+i.qty || 0) * (+i.harga || 0)), num: true }, { t: 'PO', f: i => i.po || '-' }, { t: 'Supplier', f: i => i.supp || '-' }, { t: 'Status', f: i => chip(i.st, itemTone(i.st)), raw: true }, { t: 'Keterangan', f: i => i.ket || '-', cls: 'wrap muted' }], p.mats.map((i, k) => Object.assign({ no: k + 1, id: i.m.id + ':' + k }, i)), { click: true }) : '') +
        '<div class="cfoot"><button class="btn ghost sm" data-prog="' + esc(p.nama) + '" data-u="' + esc(p.unit) + '">' + ic('plus') + 'Tambah pekerjaan ke program ini</button></div></section>';
    }).join('');
}
async function programReport(s) {
  const ps = programs(s);
  const R = await pdfReport({ title: 'Program Perbaikan Basecamp Bawen', sub: (s.unit ? UNIT_NAME[s.unit] : 'AMP, CMP, SCP') + ' · per ' + tgl(today(), true), orient: 'l', fname: 'Program_Perbaikan_Bawen' });
  R.kv([['Program', String(ps.length)], ['Total RAB material', 'Rp ' + R_(sum(ps, 'rab'))], ['Pekerjaan selesai', sum(ps, 'selesai') + ' / ' + sum(ps, p => p.kerja.length)], ['Item belum ter PO', String(sum(ps, p => p.mats.filter(i => i.st === 'Belum ter PO').length)), 'red']]);
  R.h2('Rekap Anggaran');
  R.table(['No', 'Program Perbaikan', 'Unit', 'Item Material', 'Pekerjaan', 'Nilai RAB'], ps.map((p, i) => [i + 1, p.nama, p.unit, cellR(String(p.mats.length)), cellR(String(p.kerja.length)), cellR(R_(p.rab))]), { foot: ['', 'Total', '', '', '', cellR(R_(sum(ps, 'rab')))] });
  ps.forEach(p => {
    R.h2(p.nama, 'RAB Rp ' + R_(p.rab));
    if (p.kerja.length) R.table(['No', 'Pekerjaan Perbaikan', 'Alat', 'PIC', 'Status'], p.kerja.map((m, i) => [i + 1, m.kerusakan, m.alat, m.pic || '-', m.status]), { fs: 7.4 });
    if (p.mats.length) R.table(['No', 'Uraian Barang', 'Qty', 'Sat', 'Harga Satuan', 'Total', 'PO', 'Supplier', 'Status', 'Keterangan'], p.mats.map((i, k) => [k + 1, i.nama, cellR(N_(i.qty)), i.sat || '', cellR(R_(i.harga)), cellR(R_((+i.qty || 0) * (+i.harga || 0))), i.po || '-', i.supp || '-', i.st, i.ket || '-']), { fs: 7, foot: ['', 'Harga Total', '', '', '', cellR(R_(p.rab)), '', '', '', ''] });
  });
  R.sign([['Dibuat oleh,', S.user.name], ['Kepala Mekanik,', ''], ['Kepala Basecamp,', '']]);
  await R.save();
}
const mtLate = m => m.status !== 'Selesai' && m.estHari && addDays(m.tgl, Math.ceil(+m.estHari)) < today();
function bppbStatOf(no) { const b = all('bppb').find(x => x.no === no); return b ? bppbStat(b).st : 'tidak ditemukan'; }
function mtRows(s) { return byDateDesc(all('mt').filter(m => (s.tab !== 'aktif' || m.status !== 'Selesai') && (!s.unit || m.unit === s.unit) && inMonth(m.tgl, s.month) && qMatch(s.q, m.alat, m.kerusakan, m.jenis, m.bppb, m.pic))); }
function mtForm(d, pre) {
  const v = d ? JSON.parse(JSON.stringify(d)) : Object.assign({ tgl: today(), unit: stateOf('mt', {}).unit || 'SCP', jenis: 'Perbaikan', status: 'Dilaporkan', mat: [] }, pre || {});
  openForm({
    title: d ? 'Maintenance — ' + d.alat : 'Laporkan Kerusakan / Maintenance', sub: 'Estimasi perbaikan, kebutuhan material, dan nomor BPPB', wide: true, value: v, onDelete: d ? () => remove(d.id) : null,
    extraBtn: { html: '<button type="button" class="btn ghost" data-mkb>' + ic('bppb') + 'Buat BPPB dari material</button>', bind: (f, x, m) => { $('[data-mkb]', f).onclick = () => {
      const items = (x.mat || []).filter(i => i.nama && +i.qty);
      if (!items.length) return toast('Isi material yang dibutuhkan terlebih dahulu', 'err');
      if (x.bppb) return toast('Maintenance ini sudah memiliki BPPB ' + x.bppb, 'err');
      const no = nextNo('bppb', 'BPPB', today());
      const id = d ? d.id : uid('mt');
      save('bppb', { no, tgl: today(), unit: x.unit, peminta: S.user.name, keperluan: 'Maintenance', mt: id, items: items.map(i => ({ nama: i.nama, qty: +i.qty, sat: i.sat || '', harga: +i.harga || 0, real: 0 })), ket: 'Untuk perbaikan ' + (x.alat || '') + ': ' + (x.kerusakan || '') });
      x.bppb = no;
      save('mt', mtData(x), id);
      m.close(); toast('BPPB ' + no + ' dibuat dan ditautkan');
    }; } },
    fields: [
      { k: 'tgl', label: 'Tanggal lapor', type: 'date', req: true },
      { k: 'unit', label: 'Unit', type: 'select', opts: UNITS.concat('Umum'), empty: false, onChange: x => x.alat = '' },
      { k: 'alat', label: 'Alat', type: 'select', req: true, opts: x => alatList(x.unit), add: { label: 'Tambah alat baru…', fn: async x => { const r = await promptBox('Tambah alat', [{ k: 'nama', label: 'Nama alat', req: true, ph: 'mis. Excavator PC200 No. 2' }]); if (!r) return null; save('alat', { unit: x.unit, nama: r.nama.trim() }); return r.nama.trim(); } } },
      { k: 'program', label: 'Program perbaikan (opsional)', type: 'list', full: true, opts: () => [...new Set(all('mt').map(m => m.program).filter(Boolean))] },
      { k: 'jenis', label: 'Jenis pekerjaan', type: 'select', opts: ['Perbaikan', 'Ganti Oli', 'Servis Berkala', 'Penggantian Sparepart', 'Perbaikan Kelistrikan', 'Inspeksi'], empty: false },
      { k: 'kerusakan', label: 'Kerusakan / keluhan', type: 'textarea', rows: 2, req: true, ph: 'mis. Seal boom excavator bocor, oli hidrolik rembes' },
      { k: 'tindakan', label: 'Rencana tindakan', type: 'textarea', rows: 2 },
      { k: 'estHari', label: 'Estimasi lama perbaikan', type: 'num', suffix: 'hari' },
      { k: 'pic', label: 'Mekanik / PIC' },
      { k: 'mat', label: 'Material / sparepart yang harus dibeli', type: 'items', newRow: () => ({ qty: 1 }), cols: [
        { k: 'nama', label: 'Nama material', type: 'list', opts: () => allMatNames().map(m => m.nama), w: '42%', onChange: r => { const mi = allMatNames().find(m => m.nama === r.nama); if (mi && !r.sat) r.sat = mi.sat; const lp = latestPrice(r.nama); if (lp && !r.harga) r.harga = lp.harga; } },
        { k: 'qty', label: 'Jumlah', num: true }, { k: 'sat', label: 'Satuan', type: 'list', opts: SATUAN }, { k: 'harga', label: 'Harga satuan', num: true }, { k: 'po', label: 'No PO' }, { k: 'supp', label: 'Supplier' }, { k: 'ket', label: 'Keterangan' }] },
      { k: 'bppb', label: 'No. BPPB', type: 'select', empty: '— Belum dibuat —', opts: () => all('bppb').map(b => ({ v: b.no, t: b.no + ' · ' + bppbStat(b).st })) },
      { k: 'status', label: 'Status', type: 'select', opts: MT_STATUS, empty: false, onChange: x => { if (x.status === 'Selesai' && !x.selesai) x.selesai = today(); } },
      { k: 'selesai', label: 'Tanggal selesai', type: 'date', show: x => x.status === 'Selesai' },
      { k: 'biaya', label: 'Biaya aktual', type: 'money', show: x => x.status === 'Selesai' },
      { k: 'ket', label: 'Catatan', type: 'textarea', rows: 2 }
    ],
    onSave: x => { save('mt', mtData(x), d && d.id); toast('Data maintenance tersimpan'); }
  });
}
function mtData(x) { return { tgl: x.tgl, unit: x.unit, alat: x.alat, jenis: x.jenis, kerusakan: x.kerusakan || '', tindakan: x.tindakan || '', estHari: +x.estHari || 0, pic: x.pic || '', mat: (x.mat || []).filter(i => i.nama).map(i => ({ nama: i.nama, qty: +i.qty || 0, sat: i.sat || '', harga: +i.harga || 0, po: i.po || '', supp: i.supp || '', ket: i.ket || '' })), program: x.program || '', bppb: x.bppb || '', status: x.status, selesai: x.status === 'Selesai' ? x.selesai || today() : '', biaya: +x.biaya || 0, ket: x.ket || '' }; }
async function mtReport(s) {
  const rows = mtRows(s);
  const R = await pdfReport({ title: 'Laporan Maintenance Alat', sub: (s.unit ? UNIT_NAME[s.unit] : 'Seluruh unit') + ' · ' + (s.tab === 'aktif' ? 'Perbaikan aktif' : 'Riwayat') + ' · ' + monthLabel(s.month), orient: 'l', fname: 'Laporan_Maintenance' });
  R.kv([['Jumlah pekerjaan', String(rows.length)], ['Aktif', String(rows.filter(m => m.status !== 'Selesai').length)], ['Lewat estimasi', String(rows.filter(mtLate).length), rows.some(mtLate) ? 'red' : ''], ['Biaya aktual', 'Rp ' + R_(sum(rows, 'biaya'))]]);
  R.table(['Tanggal', 'Unit', 'Alat', 'Jenis', 'Kerusakan', 'Tindakan', 'Estimasi', 'Target', 'Material Dibutuhkan', 'No. BPPB', 'PIC', 'Status'],
    rows.map(m => [tgl(m.tgl), m.unit, m.alat, m.jenis || '-', m.kerusakan, m.tindakan || '-', m.estHari ? N_(m.estHari) + ' hari' : '-', m.estHari ? tgl(addDays(m.tgl, Math.ceil(+m.estHari))) : '-', (m.mat || []).map(x => x.nama + ' ' + N_(x.qty) + ' ' + (x.sat || '')).join('; ') || '-', m.bppb || '-', m.pic || '-', (m.status || '') + (mtLate(m) ? ' (lewat)' : '')]),
    { fs: 7, cs: { 4: { cellWidth: 40 }, 8: { cellWidth: 40 } } });
  R.sign([['Dibuat oleh', S.user.name], ['Kepala Mekanik', ''], ['Kepala Basecamp', '']]);
  await R.save();
}

/* =================== 9. BPPB =================== */
MODS.bppb = {
  title: 'BPPB', icon: 'bppb', desc: 'Bukti Permintaan & Pengeluaran Barang — monitoring realisasi permintaan',
  render(root) {
    const st = stateOf('bppb', { unit: '', q: '', month: '', status: '' });
    st.umum = true;
    st.tab = st.tab || 'rilis';
    return page(root, {
      key: 'bppb', st, report: s => s.tab === 'rilis' ? rilisReport(s) : bppbReport(s),
      tabs: [{ k: 'rilis', t: 'BPPB Belum Rilis' }, { k: 'semua', t: 'Monitoring Realisasi' }],
      actions: [{ id: 'add', t: 'BPPB Baru', pri: true }, { id: 'sync', t: 'Sinkron Sheet BPPB', icon: 'refresh' }],
      on: { add: () => bppbForm(), sync: () => bppbSheetSync(true) },
      filter: s => periodBar(s, 'bppb', '<select data-fk="status"><option value="">Semua status</option>' + ['Belum terealisasi', 'Sebagian', 'Terealisasi'].map(x => '<option' + (s.status === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select>'),
      body: s => {
        if (s.tab === 'rilis') return rilisHtml(s);
        const rows = bppbRows(s);
        const allb = all('bppb').map(b => bppbStat(b));
        return '<div class="kpis">' + kpi('Total BPPB', allb.length) + kpi('Belum terealisasi', allb.filter(b => b.st === 'Belum terealisasi').length, '', 'bad') + kpi('Sebagian', allb.filter(b => b.st === 'Sebagian').length, '', 'warn') + kpi('Terealisasi', allb.filter(b => b.st === 'Terealisasi').length, '', 'good') + '</div>' +
          '<section class="card">' + table([
            { t: 'No. BPPB', f: b => '<b>' + esc(b.no) + '</b><small>' + tgl(b.tgl) + '</small>', raw: true }, { t: 'Unit', f: b => unitChip(b.unit), raw: true }, { t: 'Peminta', f: b => b.peminta || '-' },
            { t: 'Keperluan', f: b => '<b>' + esc(b.keperluan || '-') + '</b><small>' + esc(b.ket || '') + '</small>', raw: true, cls: 'wrap' },
            { t: 'Item', f: b => (b.items || []).length, num: true },
            { t: 'Realisasi', f: b => '<div class="mini"><b>' + nf0.format(b._s.p * 100) + '%</b>' + bar(b._s.p, b._s.p >= 0.999 ? 'ok' : b._s.p > 0 ? 'warn' : '') + '<small>' + num(b._s.real) + ' dari ' + num(b._s.req) + '</small></div>', raw: true },
            { t: 'Est. nilai', f: b => rp(b._s.nilai), num: true }, { t: 'Status', f: b => stChip(b._s.st), raw: true }
          ], rows, { click: true, empty: 'Belum ada BPPB.', emptyIcon: 'bppb' }) + '</section>';
      },
      bind: el => $$('[data-row]', el).forEach(tr => tr.onclick = () => bppbDetail(tr.dataset.row.split(':')[0]))
    });
  },
  summary() { const r = all('bppb').filter(b => b.rilis === 'Belum rilis'); if (r.length) return { main: r.length + ' BPPB belum rilis', sub: sum(r, b => (b.items || []).filter(i => !i.po).length) + ' item belum ter-PO', tone: 'warn' }; const a = all('bppb').map(b => bppbStat(b)); const o = a.filter(b => b.st !== 'Terealisasi').length; return { main: o + ' BPPB belum tuntas', sub: a.length + ' BPPB tercatat', tone: o ? 'warn' : '' }; }
};
const BPPB_SHEET = 'https://docs.google.com/spreadsheets/d/1BOFBQ5NQp1PwQY3wEnE3BJkVSBWd_s6AnRNBdPQL0ls';
const DIV_UNIT = d => /asphalt/i.test(d) ? 'AMP' : /concrete/i.test(d) ? 'CMP' : /stone/i.test(d) ? 'SCP' : /precast/i.test(d) ? 'PCP' : 'Umum';
function itemSt(i) {
  const k = String(i.ket || '').toLowerCase();
  if (+i.qty && (+i.real || 0) >= +i.qty && !/belum terbayar/.test(k)) return 'Diterima';
  if (/datang/.test(k)) return 'Datang, belum terbayar';
  if (i.po) return 'Sudah PO, belum terbayar';
  return 'Belum ter PO';
}
const itemTone = t => ({ 'Diterima': 'ok', 'Datang, belum terbayar': 'info', 'Sudah PO, belum terbayar': 'warn', 'Belum ter PO': 'bad' }[t]);
function rilisRows(s) { return byDateDesc(all('bppb').filter(b => b.rilis === 'Belum rilis' && (!s.unit || b.unit === s.unit) && inMonth(b.tgl, s.month) && qMatch(s.q, b.no, b.ket, (b.items || []).map(i => i.nama + ' ' + (i.po || '')).join(' ')))).reverse(); }
function rilisHtml(s) {
  const rows = rilisRows(s);
  const items = []; rows.forEach(b => (b.items || []).forEach((i, k) => items.push(Object.assign({ b, k, st: itemSt(i) }, i))));
  const cnt = t => items.filter(i => i.st === t).length;
  const nilai = sum(items, i => (+i.qty || 1) * (+i.harga || 0));
  const last = lsGet('bw.bppbSync', null);
  let n = 0;
  return '<div class="kpis">' + kpi('BPPB belum rilis', rows.length, items.length + ' item') + kpi('Belum ter PO', cnt('Belum ter PO'), '', 'bad') + kpi('Sudah PO, belum terbayar', cnt('Sudah PO, belum terbayar') + cnt('Datang, belum terbayar'), cnt('Datang, belum terbayar') + ' barang sudah datang', 'warn') + kpi('Estimasi nilai permintaan', rpS(nilai), 'harga PO / RAB') + '</div>' +
    '<div class="note">Sumber: sheet "List permintaan BPPB belum dirilis", hanya baris BC Bawen. ' + (last ? 'Sinkron terakhir ' + tglJam(last) + '. ' : '') + 'Tombol <b>Sinkron Sheet BPPB</b> mengambil data terbaru; realisasi yang dicatat di aplikasi tidak tertimpa.</div>' +
    '<section class="card"><div class="tbl"><table class="sheetlike"><thead><tr><th>No</th><th>Divisi</th><th>No BPPB</th><th>Tanggal</th><th>Rincian Permintaan Material</th><th>Qty</th><th>No PO</th><th class="n">Harga</th><th>Supplier</th><th>Status Pengadaan</th><th>Keterangan</th></tr></thead><tbody>' +
    (rows.length ? rows.map(b => (b.items || []).map((i, k) => '<tr class="click" data-row="' + esc(b.id) + ':' + k + '"' + (k === 0 ? ' style="border-top:2px solid var(--line2)"' : '') + '><td class="c">' + (++n) + '</td><td>' + (k === 0 ? unitChip(b.unit) + ' <small class="muted">' + esc(b.divisi || UNIT_NAME[b.unit] || '') + '</small>' : '') + '</td><td class="strong">' + (k === 0 ? esc(b.no) : '') + '</td><td>' + (k === 0 ? tgl(b.tgl) : '') + '</td><td>' + esc(i.nama) + '</td><td class="n">' + (i.qty ? num(i.qty) + ' ' + esc(i.sat || '') : '-') + '</td><td>' + esc(i.po || '-') + '</td><td class="n">' + (i.harga ? rp((+i.qty || 1) * i.harga) : '-') + '</td><td>' + esc(i.supp || '-') + '</td><td>' + chip(itemSt(i), itemTone(itemSt(i))) + '</td><td class="wrap muted">' + esc(i.ket || '') + '</td></tr>').join('')).join('') : '<tr><td colspan="11"><div class="empty">' + ic('bppb') + '<p>Belum ada data BPPB belum rilis. Tekan <b>Sinkron Sheet BPPB</b>.</p></div></td></tr>') +
    '</tbody></table></div></section>';
}
function parseCSV(t) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
async function bppbSheetSync(manual) {
  try {
    const r = await fetch(BPPB_SHEET + '/gviz/tq?tqx=out:csv&sheet=BPPB&_=' + Date.now());
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rows = parseCSV(await r.text()).filter(x => /bawen/i.test(x[3] || '') && (x[4] || '').trim());
    const grp = new Map();
    rows.forEach(x => { const no = x[4].trim(); if (!grp.has(no)) grp.set(no, []); grp.get(no).push(x); });
    let add = 0, upd = 0;
    grp.forEach((list, no) => {
      const id = 'bpq' + no.replace(/[^A-Za-z0-9]/g, '');
      const old = get(id);
      const [dd, mm, yy] = (list[0][5] || '').split(/[-\/]/);
      const items = list.map(x => {
        const nama = x[6].trim(), prev = old && (old.items || []).find(i => i.nama.toLowerCase() === nama.toLowerCase() && (i.po || '') === (x[7] || '').trim()) || old && (old.items || []).find(i => i.nama.toLowerCase() === nama.toLowerCase());
        const tot = parseNum(String(x[8] || '').replace(/\./g, '').replace(',', '.'));
        const qty = prev && +prev.qty ? +prev.qty : 1;
        return { nama, qty, sat: prev ? prev.sat || '' : '', harga: tot ? tot / qty : prev ? +prev.harga || 0 : 0, real: prev ? +prev.real || 0 : 0, po: (x[7] || '').trim(), supp: (x[9] || '').trim() || (prev ? prev.supp || '' : ''), ket: [(x[10] || '').trim(), (x[11] || '').trim()].filter(Boolean).join(' · ') };
      });
      const data = Object.assign({}, old || {}, { no, tgl: yy ? yy + '-' + mm.padStart(2, '0') + '-' + dd.padStart(2, '0') : (old ? old.tgl : today()), unit: DIV_UNIT(list[0][2]), divisi: list[0][2], peminta: old ? old.peminta : 'Unit ' + DIV_UNIT(list[0][2]) + ' BC Bawen', keperluan: old ? old.keperluan : 'Sparepart', items, rilis: 'Belum rilis', sumber: 'Sheet BPPB belum dirilis', reals: old ? old.reals || [] : [] });
      ['id', '_by', '_at', '_cr'].forEach(k => delete data[k]);
      const before = old ? JSON.stringify(Object.assign({}, old, { id: 0, _by: 0, _at: 0, _cr: 0 })) : '';
      if (!old) { save('bppb', data, id); add++; }
      else if (before !== JSON.stringify(Object.assign({}, data, { id: 0, _by: 0, _at: 0, _cr: 0 }))) { save('bppb', data, id); upd++; }
    });
    const gone = all('bppb').filter(b => b.rilis === 'Belum rilis' && b.sumber && !grp.has(b.no));
    gone.forEach(b => save('bppb', Object.assign({}, b, { rilis: 'Rilis', id: undefined, _by: undefined, _at: undefined, _cr: undefined }), b.id));
    lsSet('bw.bppbSync', Date.now());
    if (manual) toast('Sinkron selesai: ' + grp.size + ' BPPB Bawen (' + add + ' baru, ' + upd + ' diperbarui' + (gone.length ? ', ' + gone.length + ' sudah rilis' : '') + ')');
  } catch (e) { if (manual) toast('Gagal mengambil sheet BPPB: ' + e.message, 'err'); }
}
async function rilisReport(s) {
  const rows = rilisRows(s);
  const R = await pdfReport({ title: 'List Permintaan BPPB Belum Dirilis', sub: BC + ' · ' + (s.unit ? UNIT_NAME[s.unit] : 'AMP, CMP, SCP, PCP') + ' · per ' + tgl(today(), true), orient: 'l', fname: 'BPPB_Belum_Rilis_Bawen' });
  const items = []; rows.forEach(b => (b.items || []).forEach(i => items.push(Object.assign({ b, st: itemSt(i) }, i))));
  R.kv([['BPPB belum rilis', String(rows.length)], ['Jumlah item', String(items.length)], ['Belum ter PO', String(items.filter(i => i.st === 'Belum ter PO').length), 'red'], ['Estimasi nilai', 'Rp ' + R_(sum(items, i => (+i.qty || 1) * (+i.harga || 0)))]]);
  let n = 0;
  R.table(['No', 'Divisi', 'No BPPB', 'Tanggal', 'Rincian Permintaan Material', 'Qty', 'No PO', 'Harga', 'Supplier', 'Status', 'Keterangan'], items.map(i => [++n, i.b.unit, i.b.no, tgl(i.b.tgl), i.nama, i.qty ? N_(i.qty) + ' ' + (i.sat || '') : '-', i.po || '-', cellR(i.harga ? R_((+i.qty || 1) * i.harga) : '-'), i.supp || '-', i.st, i.ket || '-']),
    { fs: 6.9, cs: { 0: { halign: 'center', cellWidth: 8 }, 4: { cellWidth: 52 }, 10: { cellWidth: 40 } }, foot: ['', '', '', '', 'Total', '', '', cellR(R_(sum(items, i => (+i.qty || 1) * (+i.harga || 0)))), '', '', ''] });
  R.sign([['Dibuat oleh,', S.user.name], ['Kepala Unit,', ''], ['Logistik / Purchasing,', '']]);
  await R.save();
}
function bppbRows(s) { return byDateDesc(all('bppb').map(b => Object.assign(b, { _s: bppbStat(b) })).filter(b => (!s.unit || b.unit === s.unit) && inMonth(b.tgl, s.month) && (!s.status || b._s.st === s.status) && qMatch(s.q, b.no, b.peminta, b.keperluan, b.ket, (b.items || []).map(i => i.nama).join(' ')))); }
function bppbForm(d, pre) {
  const v = d ? JSON.parse(JSON.stringify(d)) : Object.assign({ tgl: today(), unit: stateOf('bppb', {}).unit || 'AMP', peminta: S.user.name, keperluan: 'Operasional Produksi', items: [{ qty: 1 }] }, pre || {});
  openForm({
    title: d ? 'Ubah ' + d.no : 'BPPB Baru', sub: 'Bukti Permintaan & Pengeluaran Barang', wide: true, value: v, onDelete: d ? () => remove(d.id) : null,
    fields: [
      { k: 'tgl', label: 'Tanggal', type: 'date', req: true }, { k: 'unit', label: 'Unit', type: 'select', opts: UNITS.concat('Umum'), empty: false },
      { k: 'peminta', label: 'Peminta', req: true }, { k: 'keperluan', label: 'Keperluan', type: 'select', opts: ['Operasional Produksi', 'Maintenance', 'Sparepart', 'BBM & Pelumas', 'ATK & Kantor', 'K3 / APD', 'Pengembangan Basecamp', 'Lainnya'], empty: false },
      { k: 'mt', label: 'Untuk maintenance', type: 'select', full: true, empty: '— Tidak terkait maintenance —', opts: () => all('mt').filter(m => m.status !== 'Selesai' || m.bppb === (d && d.no)).map(m => ({ v: m.id, t: m.alat + ' · ' + m.kerusakan.slice(0, 50) })) },
      { k: 'items', label: 'Daftar barang yang diminta', type: 'items', newRow: () => ({ qty: 1 }), cols: [
        { k: 'nama', label: 'Nama barang', type: 'list', opts: () => allMatNames().map(m => m.nama), w: '38%', onChange: r => { const mi = allMatNames().find(m => m.nama === r.nama); if (mi && !r.sat) r.sat = mi.sat; const lp = latestPrice(r.nama); if (lp && !r.harga) r.harga = lp.harga; } },
        { k: 'qty', label: 'Diminta', num: true }, { k: 'sat', label: 'Satuan', type: 'select', opts: SATUAN }, { k: 'harga', label: 'Harga satuan', num: true }, { k: 'po', label: 'No PO' }, { k: 'ket', label: 'Keterangan' }] },
      { k: 'rilis', label: 'Status rilis', type: 'select', opts: ['Belum rilis', 'Rilis'], empty: '— Tidak dipantau —' },
      { k: 'tot', type: 'html', html: x => '<div class="note">Estimasi nilai permintaan: <b>' + rp(sum(x.items || [], i => (+i.qty || 0) * (+i.harga || 0))) + '</b></div>' },
      { k: 'ket', label: 'Keterangan', type: 'textarea', rows: 2 }
    ],
    onSave: x => {
      const items = (x.items || []).filter(i => i.nama && +i.qty).map(i => ({ nama: i.nama.trim(), qty: +i.qty, sat: i.sat || '', harga: +i.harga || 0, real: +i.real || 0, po: i.po || '', supp: i.supp || '', ket: i.ket || '' }));
      if (!items.length) { toast('Isi minimal satu barang', 'err'); return false; }
      const no = d ? d.no : nextNo('bppb', 'BPPB', x.tgl);
      save('bppb', Object.assign({}, d ? { divisi: d.divisi, sumber: d.sumber } : {}, { no, tgl: x.tgl, unit: x.unit, peminta: x.peminta, keperluan: x.keperluan, mt: x.mt || '', items, ket: x.ket || '', rilis: x.rilis || '', reals: d ? d.reals || [] : [] }), d && d.id);
      if (x.mt) { const m = get(x.mt); if (m && !m.bppb) save('mt', Object.assign({}, m, { bppb: no, status: m.status === 'Dilaporkan' ? 'Menunggu Sparepart' : m.status }), m.id); }
      toast('BPPB ' + no + ' tersimpan');
    }
  });
}
function bppbDetail(id) {
  const b = get(id); if (!b) return;
  const s = bppbStat(b), mt = b.mt && get(b.mt);
  detail({
    title: b.no, sub: UNIT_NAME[b.unit] + ' · ' + (b.keperluan || ''),
    html: infoGrid([['Tanggal', tgl(b.tgl, true)], ['Peminta', b.peminta], ['Keperluan', b.keperluan], ['Maintenance', mt ? mt.alat + ' — ' + mt.kerusakan : '-'], ['Status', stChip(s.st), true], ['Realisasi', nf0.format(s.p * 100) + '% (' + num(s.real) + ' dari ' + num(s.req) + ')'], ['Est. nilai', rp(s.nilai)], ['Keterangan', b.ket || '-']]) + bar(s.p, 'ok') +
      '<h4 class="sub">Rincian barang</h4>' + table([{ t: 'Barang', f: i => i.nama, cls: 'strong' }, { t: 'Satuan', f: i => i.sat }, { t: 'Diminta', f: i => num(i.qty), num: true }, { t: 'Terealisasi', f: i => num(i.real || 0), num: true }, { t: 'Sisa', f: i => '<b class="' + (i.qty - (i.real || 0) > 0 ? 't-bad' : 't-ok') + '">' + num(Math.max(0, i.qty - (i.real || 0))) + '</b>', num: true, raw: true }, { t: 'Harga', f: i => rp(i.harga), num: true }, { t: 'No PO', f: i => i.po || '-' }, { t: 'Status pengadaan', f: i => chip(itemSt(i), itemTone(itemSt(i))), raw: true }, { t: 'Keterangan', f: i => i.ket || '-', cls: 'wrap' }], (b.items || []).map((i, k) => Object.assign({ id: k }, i))) +
      ((b.reals || []).length ? '<h4 class="sub">Riwayat realisasi</h4>' + table([{ t: 'Tanggal', f: r => tgl(r.tgl) }, { t: 'Barang', f: r => r.ket }, { t: 'Oleh', f: r => r.by }], b.reals.map((r, k) => Object.assign({ id: k }, r))) : ''),
    buttons: [
      { id: 'pdf', t: 'Cetak BPPB', icon: 'print', dark: true, fn: () => runReport(() => bppbPdf(b)) },
      { id: 'edit', t: 'Ubah', icon: 'edit', fn: m => { m.close(); bppbForm(b); } },
      b.rilis === 'Belum rilis' ? { id: 'rl', t: 'Tandai Rilis', icon: 'check', fn: m => { m.close(); const x = Object.assign({}, b); ['id', '_by', '_at', '_cr'].forEach(k => delete x[k]); save('bppb', Object.assign(x, { rilis: 'Rilis' }), b.id); toast(b.no + ' ditandai rilis'); } } : null,
      s.st !== 'Terealisasi' ? { id: 'real', t: 'Catat Realisasi', icon: 'check', pri: true, fn: m => { m.close(); bppbReal(b); } } : null
    ].filter(Boolean)
  });
}
function bppbReal(b) {
  const v = { tgl: today(), toStok: true, items: (b.items || []).map(i => ({ nama: i.nama, sat: i.sat, qty: i.qty, prev: +i.real || 0, now: Math.max(0, i.qty - (+i.real || 0)) })) };
  openForm({
    title: 'Realisasi ' + b.no, sub: 'Isi jumlah barang yang diterima / dikeluarkan pada realisasi ini', wide: true, value: v,
    fields: [
      { k: 'tgl', label: 'Tanggal realisasi', type: 'date', req: true },
      { k: 'items', label: 'Barang', type: 'items', cols: [{ k: 'nama', label: 'Barang', type: 'ro' }, { k: 'sat', label: 'Satuan', type: 'ro' }, { k: 'qty', label: 'Diminta', type: 'ro', f: r => num(r.qty) }, { k: 'prev', label: 'Sudah', type: 'ro', f: r => num(r.prev) }, { k: 'now', label: 'Realisasi sekarang', num: true }] },
      { k: 'toStok', type: 'check', text: 'Masukkan barang terealisasi ke stok material unit ' + b.unit + ' (Barang Masuk, ref. ' + b.no + ')' }
    ],
    onSave: x => {
      const items = (b.items || []).map((i, k) => Object.assign({}, i, { real: Math.min(+i.qty, (+i.real || 0) + (+x.items[k].now || 0)) }));
      const done = x.items.filter(i => +i.now > 0);
      if (!done.length) { toast('Isi jumlah realisasi', 'err'); return false; }
      save('bppb', Object.assign({}, b, { items, reals: (b.reals || []).concat([{ tgl: x.tgl, by: S.user.name, ket: done.map(i => i.nama + ' ' + num(i.now) + ' ' + (i.sat || '')).join(', ') }]) }), b.id);
      if (x.toStok) done.forEach(i => { const mi = matFind(b.unit, i.nama); save('stok', { tgl: x.tgl, unit: b.unit, mat: mi ? mi.nama : i.nama, sat: mi ? mi.sat : i.sat, jenis: 'masuk', qty: +i.now, harga: +((b.items.find(z => z.nama === i.nama) || {}).harga) || 0, ref: b.no, ket: 'Realisasi ' + b.no, supp: '' }); });
      toast('Realisasi ' + b.no + ' dicatat' + (x.toStok ? ' dan masuk stok' : ''));
    }
  });
}
async function bppbPdf(b) {
  const s = bppbStat(b);
  const R = await pdfReport({ title: 'Bukti Permintaan & Pengeluaran Barang', sub: b.no, fname: b.no.replace(/\//g, '-') });
  R.info([['Nomor', b.no], ['Tanggal', tgl(b.tgl, true)], ['Unit', b.unit + ' - ' + (UNIT_NAME[b.unit] || '')], ['Peminta', b.peminta], ['Keperluan', b.keperluan], ['Status', s.st + ' (' + nf0.format(s.p * 100) + '%)']]);
  R.table(['No', 'Nama Barang', 'Satuan', 'Diminta', 'Terealisasi', 'Sisa', 'Est. Harga', 'Est. Jumlah'], (b.items || []).map((i, k) => [k + 1, i.nama, i.sat, cellR(N_(i.qty)), cellR(N_(i.real || 0)), cellR(N_(Math.max(0, i.qty - (i.real || 0)))), cellR(R_(i.harga)), cellR(R_(i.qty * i.harga))]),
    { cs: { 0: { halign: 'center', cellWidth: 9 } }, foot: ['', 'Total', '', cellR(N_(s.req)), cellR(N_(s.real)), cellR(N_(s.req - s.real)), '', cellR(R_(s.nilai))] });
  if (b.ket) R.para('Keterangan: ' + b.ket);
  if ((b.reals || []).length) { R.h2('Riwayat Realisasi'); R.table(['Tanggal', 'Barang', 'Dicatat oleh'], b.reals.map(r => [tgl(r.tgl, true), r.ket, r.by])); }
  R.sign([['Diminta oleh', b.peminta], ['Diperiksa oleh', ''], ['Disetujui oleh', ''], ['Diterima oleh', '']]);
  await R.save();
}
async function bppbReport(s) {
  const rows = bppbRows(s);
  const R = await pdfReport({ title: 'Monitoring BPPB', sub: (s.unit ? UNIT_NAME[s.unit] : 'Seluruh unit') + ' · ' + (s.status || 'Semua status') + ' · ' + monthLabel(s.month), orient: 'l', fname: 'Monitoring_BPPB' });
  R.kv([['Jumlah BPPB', String(rows.length)], ['Belum terealisasi', String(rows.filter(b => b._s.st === 'Belum terealisasi').length), 'red'], ['Sebagian', String(rows.filter(b => b._s.st === 'Sebagian').length)], ['Terealisasi', String(rows.filter(b => b._s.st === 'Terealisasi').length)]]);
  R.h2('Rekap BPPB');
  R.table(['No. BPPB', 'Tanggal', 'Unit', 'Peminta', 'Keperluan', 'Item', 'Diminta', 'Terealisasi', 'Realisasi %', 'Est. Nilai', 'Status'], rows.map(b => [b.no, tgl(b.tgl), b.unit, b.peminta || '-', b.keperluan || '-', cellR(String((b.items || []).length)), cellR(N_(b._s.req)), cellR(N_(b._s.real)), cellR(nf0.format(b._s.p * 100) + '%'), cellR(R_(b._s.nilai)), b._s.st]), { fs: 7.4 });
  const open = rows.filter(b => b._s.st !== 'Terealisasi');
  if (open.length) {
    R.h2('Rincian Barang Belum Terealisasi');
    const body = []; open.forEach(b => (b.items || []).forEach(i => { if (i.qty - (i.real || 0) > 0) body.push([b.no, b.unit, i.nama, i.sat, cellR(N_(i.qty)), cellR(N_(i.real || 0)), cellR(N_(i.qty - (i.real || 0)))]); }));
    R.table(['No. BPPB', 'Unit', 'Barang', 'Satuan', 'Diminta', 'Terealisasi', 'Sisa'], body, { fs: 7.4 });
  }
  R.sign();
  await R.save();
}
