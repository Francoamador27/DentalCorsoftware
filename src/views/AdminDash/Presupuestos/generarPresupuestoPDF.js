import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import clienteAxios from '../../../config/axios';

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
    primary:     [0,   141, 210],   // #008DD2
    primaryDark: [0,   100, 160],   // más oscuro
    dark:        [15,  23,  42],    // slate-900
    slate700:    [51,  65,  85],
    slate500:    [100, 116, 139],
    slate300:    [203, 213, 225],
    slate100:    [241, 245, 249],
    white:       [255, 255, 255],
    green:       [34,  197, 94],
    amber:       [245, 158, 11],
    red:         [239, 68,  68],
    blue:        [59,  130, 246],
};

const ESTADO_BADGE = {
    borrador:  { bg: C.slate300, text: C.white, label: 'BORRADOR' },
    publicado: { bg: C.blue,     text: C.white, label: 'PUBLICADO' },
    enviado:   { bg: C.blue,     text: C.white, label: 'ENVIADO'  },
    aceptado:  { bg: C.green,    text: C.white, label: 'ACEPTADO' },
    rechazado: { bg: C.red,      text: C.white, label: 'RECHAZADO'},
};

const fmt = (n) =>
    Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseDate = (d) => {
    if (!d) return '—';
    try {
        return new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-AR', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    } catch { return '—'; }
};

// ── Helpers de dibujo ─────────────────────────────────────────────────────────
const fill   = (doc, [r,g,b]) => doc.setFillColor(r, g, b);
const stroke = (doc, [r,g,b]) => doc.setDrawColor(r, g, b);
const color  = (doc, [r,g,b]) => doc.setTextColor(r, g, b);
const font   = (doc, size, style = 'normal') => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
};

// Rectángulo redondeado relleno
const roundRect = (doc, x, y, w, h, r, fillC, strokeC) => {
    if (fillC)   fill(doc, fillC);
    if (strokeC) stroke(doc, strokeC);
    doc.roundedRect(x, y, w, h, r, r, fillC ? (strokeC ? 'FD' : 'F') : 'D');
};

// Texto truncado
const truncate = (doc, text, maxW) => {
    if (!text) return '';
    const w = doc.getTextWidth(text);
    if (w <= maxW) return text;
    let t = text;
    while (doc.getTextWidth(t + '…') > maxW && t.length > 0) t = t.slice(0, -1);
    return t + '…';
};

// ── Cargar el logo de la clínica a base64, vía la API (evita problemas de CORS
// con el archivo estático). Se manda el path del logo (tiene un UUID único
// por clínica/subida) como query param "v" para que la URL sea distinta por
// cada logo real — así ningún cache (navegador o CDN delante del backend)
// puede devolver el logo de otra clínica ni uno viejo tras resubirlo.
// ──────────────────────────────────────────────────────────────────────────
async function loadClinicLogo(logoPath) {
    try {
        const { data: blob } = await clienteAxios.get('/api/tenant-settings/logo', {
            responseType: 'blob',
            params: { v: logoPath },
        });
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload  = () => resolve({ data: reader.result, type: blob.type });
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch { return null; }
}

// ── GENERADOR PRINCIPAL ───────────────────────────────────────────────────────
export const generarPresupuestoPDF = async (presupuesto, clinica) => {
    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W    = 210;
    const mg   = 15;          // margen lateral
    const cw   = W - mg * 2;  // ancho contenido

    // Precargar logo (solo si hay uno configurado)
    const logoImg = clinica?.logo ? await loadClinicLogo(clinica.logo) : null;

    // ══════════════════════════════════════════════════════════════════════════
    // HEADER — fondo blanco para impresoras B&N
    // ══════════════════════════════════════════════════════════════════════════
    const hasLogo = !!logoImg;
    const logoBlockH = hasLogo ? 22 : 0; // espacio reservado arriba para el logo centrado
    const hH = 52 + logoBlockH; // altura header (crece si hay logo)

    // Fondo blanco principal
    fill(doc, C.white); doc.rect(0, 0, W, hH, 'F');

    // Banda de acento azul en la base del header
    fill(doc, C.primary); doc.rect(0, hH - 3, W, 3, 'F');

    // Línea decorativa sutil en el medio de la fila de datos (debajo del logo)
    stroke(doc, C.slate300); doc.setLineWidth(0.5);
    doc.line(mg, logoBlockH + 26, W - mg, logoBlockH + 26);

    // ── Logo de la clínica — centrado arriba, tamaño chico ───────────────────
    if (hasLogo) {
        try {
            const fmt2 = logoImg.type.includes('png') ? 'PNG' : logoImg.type.includes('svg') ? 'SVG+XML' : 'JPEG';
            const props = doc.getImageProperties(logoImg.data);
            const maxW = 26, maxH = 16; // "tamaño chico"
            const ratio = Math.min(maxW / props.width, maxH / props.height);
            const logoW = props.width * ratio;
            const logoH = props.height * ratio;
            const logoX = (W - logoW) / 2; // centrado horizontal
            const logoY = 4 + (maxH - logoH) / 2;
            doc.addImage(logoImg.data, fmt2, logoX, logoY, logoW, logoH, '', 'FAST');
        } catch (_) { /* si falla, seguimos sin logo */ }
    }

    // Fila de datos: nombre de la clínica (izq.) y PRESUPUESTO (der.), debajo del logo
    const rowY = logoBlockH;

    // ── Nombre de la clínica ─────────────────────────────────────────────────
    const clinicName = clinica?.clinic_name || 'Clínica Dental';
    color(doc, C.slate700);
    font(doc, 15, 'bold');
    doc.text(truncate(doc, clinicName, 80), mg, rowY + 16);

    // Datos de contacto
    font(doc, 7.5);
    color(doc, C.slate700);
    const contactParts = [];
    if (clinica?.phone)   contactParts.push(`Tel: ${clinica.phone}`);
    if (clinica?.email)   contactParts.push(clinica.email);
    if (clinica?.address) contactParts.push(clinica.address);
    if (contactParts.length) doc.text(contactParts.join('  ·  '), mg, rowY + 23);
    if (clinica?.whatsapp) {
        color(doc, C.slate700);
        doc.text(`WhatsApp: ${clinica.whatsapp}`, mg, rowY + 30);
    }

    // ── PRESUPUESTO — lado derecho ───────────────────────────────────────────
    const rightX = W - mg;

    font(doc, 15, 'bold');
    color(doc, C.slate700);
    doc.text('PRESUPUESTO', rightX, rowY + 16, { align: 'right' });

    font(doc, 9);
    color(doc, C.slate700);
    doc.text(`N° ${presupuesto.numero}`, rightX, rowY + 24, { align: 'right' });

    // Badge de estado
    const badge = ESTADO_BADGE[presupuesto.estado] ?? ESTADO_BADGE.borrador;
    const badgeW = 30, badgeH = 7, badgeX = rightX - badgeW;
    fill(doc, badge.bg); doc.roundedRect(badgeX, rowY + 28, badgeW, badgeH, 1.5, 1.5, 'F');
    color(doc, badge.text);
    font(doc, 6.5, 'bold');
    doc.text(badge.label, badgeX + badgeW / 2, rowY + 28 + 4.8, { align: 'center' });

    let y = hH + 5;

    // ══════════════════════════════════════════════════════════════════════════
    // FRANJA DE FECHAS
    // ══════════════════════════════════════════════════════════════════════════
    const fechaEmision = parseDate(presupuesto.fecha);
    const fechaValidez = parseDate(presupuesto.valido_hasta);
    const boxH = 14;

    // Caja izquierda — emisión
    roundRect(doc, mg, y, (cw / 2) - 3, boxH, 2, C.slate100, null);
    font(doc, 7); color(doc, C.slate500);
    doc.text('FECHA DE EMISIÓN', mg + 4, y + 5);
    font(doc, 9, 'bold'); color(doc, C.slate700);
    doc.text(fechaEmision, mg + 4, y + 11);

    // Caja derecha — validez
    const rx2 = mg + (cw / 2) + 3;
    roundRect(doc, rx2, y, (cw / 2) - 3, boxH, 2, C.slate100, null);
    font(doc, 7); color(doc, C.slate500);
    doc.text('VÁLIDO HASTA', rx2 + 4, y + 5);
    font(doc, 9, 'bold'); color(doc, C.slate700);
    doc.text(fechaValidez, rx2 + 4, y + 11);

    y += boxH + 6;

    // ══════════════════════════════════════════════════════════════════════════
    // CARD DE PACIENTE
    // ══════════════════════════════════════════════════════════════════════════
    const cardH = 22;

    // Borde exterior
    stroke(doc, C.slate300); doc.setLineWidth(0.3);
    doc.roundedRect(mg, y, cw, cardH, 2, 2, 'D');

    // Acento azul izquierdo
    fill(doc, C.primary);
    doc.roundedRect(mg, y, 3, cardH, 1.5, 1.5, 'F');
    doc.rect(mg + 1.5, y, 1.5, cardH, 'F'); // rellenar esquina derecha del acento

    // Label
    font(doc, 6.5, 'bold'); color(doc, C.slate500);
    doc.text('PACIENTE', mg + 7, y + 6);

    // Nombre
    font(doc, 12, 'bold'); color(doc, C.dark);
    doc.text(presupuesto.paciente_nombre || '—', mg + 7, y + 14);

    // Info secundaria
    const pacInfo = [];
    if (presupuesto.paciente_dni)      pacInfo.push(`DNI ${presupuesto.paciente_dni}`);
    if (presupuesto.paciente_email)    pacInfo.push(presupuesto.paciente_email);
    if (presupuesto.paciente_telefono) pacInfo.push(presupuesto.paciente_telefono);
    if (pacInfo.length) {
        font(doc, 7.5); color(doc, C.slate500);
        doc.text(pacInfo.join('   ·   '), mg + 7, y + 20);
    }

    y += cardH + 7;

    // ══════════════════════════════════════════════════════════════════════════
    // TABLA DE ÍTEMS
    // ══════════════════════════════════════════════════════════════════════════
    const tableBody = (presupuesto.items || []).map((it, i) => [
        { content: String(i + 1), styles: { halign: 'center', textColor: C.slate500, fontStyle: 'normal' } },
        { content: it.descripcion, styles: { fontStyle: 'bold', textColor: C.dark } },
        { content: it.pieza || '—', styles: { halign: 'center', textColor: C.slate500 } },
        { content: Number(it.cantidad).toLocaleString('es-AR'), styles: { halign: 'center' } },
        { content: `$${fmt(it.precio_unitario)}`, styles: { halign: 'right' } },
        { content: `$${fmt(it.subtotal)}`, styles: { halign: 'right', fontStyle: 'bold', textColor: C.slate700 } },
    ]);

    autoTable(doc, {
        startY: y,
        head: [[
            { content: '#',           styles: { halign: 'center' } },
            { content: 'Descripción', styles: { halign: 'left' } },
            { content: 'Pieza',       styles: { halign: 'center' } },
            { content: 'Cant.',       styles: { halign: 'center' } },
            { content: 'Precio unit.',styles: { halign: 'right' } },
            { content: 'Subtotal',    styles: { halign: 'right' } },
        ]],
        body: tableBody,
        theme: 'plain',
        headStyles: {
            fillColor: C.primary,
            textColor: C.white,
            fontStyle: 'bold',
            fontSize: 8.5,
            cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
        },
        bodyStyles: {
            fontSize: 8.5,
            textColor: C.slate700,
            cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
            lineColor: C.slate100,
            lineWidth: 0.3,
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 18 },
            3: { cellWidth: 16 },
            4: { cellWidth: 30 },
            5: { cellWidth: 30 },
        },
        margin: { left: mg, right: mg },
        tableLineColor: C.slate300,
        tableLineWidth: 0.3,
        didDrawPage: () => {},
    });

    y = doc.lastAutoTable.finalY + 6;

    // ══════════════════════════════════════════════════════════════════════════
    // BLOQUE DE TOTALES
    // ══════════════════════════════════════════════════════════════════════════
    const totW = 72;
    const totX = W - mg - totW;
    const rowH = 9;

    const drawTotalRow = (label, value, bgColor, textC, bold = false) => {
        if (bgColor) { fill(doc, bgColor); doc.rect(totX, y, totW, rowH, 'F'); }
        font(doc, 8.5, bold ? 'bold' : 'normal');
        color(doc, textC);
        doc.text(label, totX + 4, y + 6.2);
        doc.text(value, totX + totW - 4, y + 6.2, { align: 'right' });
        y += rowH;
    };

    drawTotalRow('Subtotal', `$${fmt(presupuesto.subtotal)}`, C.slate100, C.slate700);

    if (Number(presupuesto.descuento) > 0) {
        const descAmt = presupuesto.subtotal * presupuesto.descuento / 100;
        drawTotalRow(
            `Descuento (${presupuesto.descuento}%)`,
            `- $${fmt(descAmt)}`,
            [255, 241, 242], C.red
        );
    }

    // Separador
    stroke(doc, C.slate300); doc.setLineWidth(0.4);
    doc.line(totX, y, totX + totW, y);

    y += 1;
    // Fila TOTAL — azul
    fill(doc, C.primary); doc.roundedRect(totX, y, totW, 12, 1.5, 1.5, 'F');
    font(doc, 11, 'bold'); color(doc, C.white);
    doc.text('TOTAL', totX + 5, y + 8.2);
    doc.text(`$${fmt(presupuesto.total)}`, totX + totW - 5, y + 8.2, { align: 'right' });
    y += 17;

    // ══════════════════════════════════════════════════════════════════════════
    // NOTAS
    // ══════════════════════════════════════════════════════════════════════════
    if (presupuesto.notas?.trim()) {
        y += 2;
        // Encabezado notas
        font(doc, 7.5, 'bold'); color(doc, C.slate500);
        doc.text('OBSERVACIONES', mg, y + 5);
        y += 8;

        const notaLines = doc.splitTextToSize(presupuesto.notas, cw - 10);
        const notaH     = notaLines.length * 4.5 + 8;

        stroke(doc, C.slate300); doc.setLineWidth(0.3);
        roundRect(doc, mg, y, cw, notaH, 2, [252, 253, 254], C.slate300);

        // Línea izquierda de acento
        fill(doc, C.slate300); doc.rect(mg, y, 2, notaH, 'F');

        font(doc, 8); color(doc, C.slate700);
        doc.text(notaLines, mg + 6, y + 6);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FOOTER DENTALCOR — blanco para impresoras B&N
    // ══════════════════════════════════════════════════════════════════════════
    const pageH  = 297;
    const footY  = pageH - 18;

    // Fondo footer blanco
    fill(doc, C.white); doc.rect(0, footY, W, 18, 'F');
    // Línea superior azul
    fill(doc, C.primary); doc.rect(0, footY, W, 1.5, 'F');
    // Línea inferior gris
    stroke(doc, C.slate300); doc.setLineWidth(0.3);
    doc.line(0, footY, W, footY);

    // Texto izquierdo
    font(doc, 7); color(doc, C.slate700);
    doc.text('Documento no válido como factura.', mg, footY + 7);
    doc.text('Los precios pueden variar. Consulte con su profesional.', mg, footY + 13);

    // Branding derecho
    font(doc, 8, 'bold'); color(doc, C.primary);
    doc.text('DentalCorSoftware.com.ar', W - mg, footY + 7, { align: 'right' });
    font(doc, 6.5); color(doc, C.slate700);
    doc.text('Presupuesto generado por el sistema DentalCor', W - mg, footY + 13, { align: 'right' });

    // ── Guardar ───────────────────────────────────────────────────────────────
    doc.save(`Presupuesto-${presupuesto.numero}.pdf`);
};
