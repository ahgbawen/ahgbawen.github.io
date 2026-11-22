/* Basecamp Bawen — mesin laporan PDF (kop berlogo, tabel, ringkasan, tanda tangan). */
'use strict';
const PDFX = { logo: null, ratio: 564 / 443 };
async function pdfLogo() {
  if (PDFX.logo) return PDFX.logo;
  const b = await (await fetch('assets/logo.png')).blob();
  PDFX.logo = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
  return PDFX.logo;
}
const NAVY = [20, 54, 95], RED = [198, 40, 40], INK = [28, 36, 51], MUTED = [96, 108, 124], LINE = [214, 221, 230];
function pdfClean(s) { return String(s ?? '').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, c => ({ '–': '-', '—': '-', '‘': "'", '’': "'", '“': '"', '”': '"', '…': '...', '≥': '>=', '≤': '<=', '·': '-' }[c] ?? '')); }

async function pdfReport({ title, sub, orient = 'p', fname }) {
  if (!window.jspdf) { toast('Pustaka PDF belum termuat, periksa koneksi internet', 'err'); throw new Error('nopdf'); }
  const logo = await pdfLogo();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: orient, unit: 'mm', format: 'a4', compress: true });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const M = 14, TOP = 34, BOT = 16;
  let y = TOP + 2;
  // judul halaman pertama
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...NAVY);
  doc.text(pdfClean(title).toUpperCase(), W / 2, y + 5, { align: 'center' });
  y += 10;
  if (sub) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED); doc.splitTextToSize(pdfClean(sub), W - 2 * M).forEach(t => { doc.text(t, W / 2, y, { align: 'center' }); y += 4.2; }); }
  y += 3;
  const R = {
    doc, W, H, M,
    get y() { return y; }, set y(v) { y = v; },
    need(h) { if (y + h > H - BOT - 2) { doc.addPage(); y = TOP + 2; } },
    h2(t, note) {
      R.need(14);
      y += 2;
      doc.setFillColor(...NAVY); doc.rect(M, y - 3.6, 1.4, 5, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...NAVY); doc.text(pdfClean(t), M + 3.5, y);
      if (note) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text(pdfClean(note), W - M, y, { align: 'right' }); }
      y += 4;
    },
    kv(pairs, cols) {
      cols = cols || Math.min(4, pairs.length);
      const gap = 3, bw = (W - 2 * M - gap * (cols - 1)) / cols, bh = 13;
      for (let i = 0; i < pairs.length; i += cols) {
        R.need(bh + 3);
        pairs.slice(i, i + cols).forEach(([k, v, tone], j) => {
          const x = M + j * (bw + gap);
          doc.setDrawColor(...LINE); doc.setFillColor(247, 249, 252); doc.roundedRect(x, y, bw, bh, 1.2, 1.2, 'FD');
          doc.setFillColor(...(tone === 'red' ? RED : NAVY)); doc.rect(x, y, 1, bh, 'F');
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2); doc.setTextColor(...MUTED); doc.text(pdfClean(k).toUpperCase(), x + 3.5, y + 4.6);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...(tone === 'red' ? RED : INK));
          doc.text(doc.splitTextToSize(pdfClean(v), bw - 6)[0], x + 3.5, y + 10.2);
        });
        y += bh + 3;
      }
      y += 1;
    },
    info(pairs, cols = 2) {
      const colW = (W - 2 * M) / cols;
      doc.setFontSize(8.6);
      for (let i = 0; i < pairs.length; i += cols) {
        R.need(6);
        let hmax = 5;
        pairs.slice(i, i + cols).forEach(([k, v], j) => {
          const x = M + j * colW;
          doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED); doc.text(pdfClean(k), x, y);
          doc.setFont('helvetica', 'bold'); doc.setTextColor(...INK);
          const lines = doc.splitTextToSize(pdfClean(v || '-'), colW - 36);
          doc.text(lines, x + 33, y); hmax = Math.max(hmax, lines.length * 4 + 1.2);
        });
        y += hmax;
      }
      y += 2;
    },
    para(t, size = 8.6) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(...INK);
      doc.splitTextToSize(pdfClean(t), W - 2 * M).forEach(l => { R.need(5); doc.text(l, M, y); y += size * 0.45; });
      y += 2;
    },
    table(head, body, o = {}) {
      R.need(18);
      doc.autoTable({
        startY: y, head: [head.map(pdfClean)], body: body.map(r => r.map(c => typeof c === 'object' && c !== null && !Array.isArray(c) ? Object.assign({}, c, { content: pdfClean(c.content) }) : pdfClean(c))),
        foot: o.foot ? [o.foot.map(c => typeof c === 'object' && c !== null ? Object.assign({}, c, { content: pdfClean(c.content) }) : pdfClean(c))] : undefined,
        showFoot: 'lastPage', theme: 'grid', margin: { left: M, right: M, top: TOP + 2, bottom: BOT + 2 },
        styles: { font: 'helvetica', fontSize: o.fs || 7.8, cellPadding: 1.6, lineColor: LINE, lineWidth: 0.15, textColor: INK, valign: 'middle', overflow: 'linebreak' },
        headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: (o.fs || 7.8) - 0.2 },
        footStyles: { fillColor: [232, 237, 244], textColor: INK, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [246, 248, 251] },
        columnStyles: o.cs || {},
        didParseCell: o.didParseCell
      });
      y = doc.lastAutoTable.finalY + 5;
    },
    sign(list) {
      list = list || [['Dibuat oleh', S.user ? S.user.name : ''], ['Diperiksa oleh', ''], ['Disetujui oleh', '']];
      R.need(34);
      y += 2;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.6); doc.setTextColor(...INK);
      doc.text('Bawen, ' + pdfClean(tgl(today(), true)), W - M, y, { align: 'right' });
      y += 5;
      const cw = (W - 2 * M) / list.length;
      list.forEach(([role, name], i) => {
        const cx = M + cw * i + cw / 2;
        doc.setFont('helvetica', 'normal'); doc.text(pdfClean(role), cx, y, { align: 'center' });
        doc.setDrawColor(...INK); doc.setLineWidth(0.2); doc.line(cx - 22, y + 20, cx + 22, y + 20);
        if (name) { doc.setFont('helvetica', 'bold'); doc.text(pdfClean(name), cx, y + 18.6, { align: 'center' }); }
      });
      y += 26;
    },
    async save() {
      const n = doc.getNumberOfPages();
      for (let i = 1; i <= n; i++) {
        doc.setPage(i);
        const lw = 22, lh = lw / PDFX.ratio;
        doc.addImage(logo, 'PNG', M, 7, lw, lh, 'logo', 'FAST');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13.5); doc.setTextColor(...NAVY);
        doc.text('PT. ARMADA HADA GRAHA', M + lw + 4, 13);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.6); doc.setTextColor(...INK);
        doc.text('Basecamp Bawen  |  Unit Produksi AMP - CMP - SCP - PCP', M + lw + 4, 18);
        doc.setFontSize(7.6); doc.setTextColor(...MUTED);
        doc.text('Trust and Integrity', M + lw + 4, 22.4);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...NAVY);
        doc.text(pdfClean(title).toUpperCase(), W - M, 13, { align: 'right' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor(...MUTED);
        if (sub) doc.text(doc.splitTextToSize(pdfClean(sub), 90)[0], W - M, 17.5, { align: 'right' });
        doc.setDrawColor(...NAVY); doc.setLineWidth(0.8); doc.line(M, 27.5, W - M, 27.5);
        doc.setDrawColor(...RED); doc.setLineWidth(0.35); doc.line(M, 28.9, W - M, 28.9);
        doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(M, H - 11, W - M, H - 11);
        doc.setFontSize(7); doc.setTextColor(...MUTED);
        doc.text(pdfClean('Dicetak oleh ' + (S.user ? S.user.name : '-') + ' pada ' + tglJam(Date.now())), M, H - 7);
        doc.text('Sistem Informasi Produksi Basecamp Bawen', W / 2, H - 7, { align: 'center' });
        doc.text('Halaman ' + i + ' dari ' + n, W - M, H - 7, { align: 'right' });
      }
      const name = (fname || title).replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_') + '_' + today() + '.pdf';
      doc.save(name);
      toast('Laporan PDF dibuat: ' + name);
    }
  };
  return R;
}
const R_ = n => nf0.format(Math.round(+n || 0));
const N_ = n => nf2.format(+n || 0);
const right = { halign: 'right' }, center = { halign: 'center' };
const cellR = v => ({ content: v, styles: right });
async function runReport(fn) { try { await fn(); } catch (e) { if (e.message !== 'nopdf') { console.error(e); toast('Gagal membuat PDF: ' + e.message, 'err'); } } }
