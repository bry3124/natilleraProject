const PDFDocument = require('pdfkit');

/**
 * Generates a PDF receipt for a weekly payment (Semana).
 * @param {Object} pago - The payment object (from DB).
 * @param {Object} socio - The socio object (from DB).
 * @returns {PDFKit.PDFDocument} - The PDF document stream.
 */
function generateWeeklyReceipt(pago, socio) {
    const doc = new PDFDocument({ margin: 50 });

    // --- Header ---
    doc
        .fontSize(20)
        .text('NATILLERA MIAHORRO - RECIBO DE PAGO', { align: 'center' })
        .moveDown();

    doc
        .fontSize(12)
        .text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, { align: 'right' })
        .moveDown();

    // --- Payment Details Box ---
    const startY = doc.y;
    doc.rect(50, startY, 500, 160).stroke();

    const leftX = 60;
    const rightX = 300;
    const lineHeight = 20;
    let currentY = startY + 15;

    // Row 1: Recibo No. & Semana
    doc.font('Helvetica-Bold').text('Recibo No:', leftX, currentY);
    doc.font('Helvetica').text(`SEM-${pago.id}`, leftX + 80, currentY);

    doc.font('Helvetica-Bold').text('Semana No:', rightX, currentY);
    doc.font('Helvetica').text(`${pago.semana}`, rightX + 80, currentY);

    currentY += lineHeight;

    // Row 2: Socio Info
    doc.font('Helvetica-Bold').text('Socio:', leftX, currentY);
    doc.font('Helvetica').text(`${socio.nombre1} ${socio.apellido1} ${socio.apellido2 || ''}`, leftX + 80, currentY);

    currentY += lineHeight;

    doc.font('Helvetica-Bold').text('Documento:', leftX, currentY);
    doc.font('Helvetica').text(`${socio.documento}`, leftX + 80, currentY);

    currentY += lineHeight * 1.5;

    // Row 3: Amount
    doc.fontSize(14).font('Helvetica-Bold').text('Valor Pagado:', leftX, currentY);
    doc.fontSize(14).font('Helvetica').text(`$${Number(pago.valor).toLocaleString()}`, leftX + 110, currentY);

    currentY += lineHeight * 1.5;

    // Row 4: Method & Date
    doc.fontSize(12).font('Helvetica-Bold').text('Fecha Pago:', leftX, currentY);
    const paymentDate = pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString() : 'N/A';
    doc.font('Helvetica').text(paymentDate, leftX + 80, currentY);

    doc.font('Helvetica-Bold').text('Forma Pago:', rightX, currentY);
    doc.font('Helvetica').text(`${pago.forma_pago || 'Efectivo'}`, rightX + 80, currentY);

    // --- Footer / Signatures ---
    doc.moveDown(8);

    const sigY = doc.y;

    doc.lineWidth(1).moveTo(60, sigY).lineTo(250, sigY).stroke();
    doc.text('Firma Recibe (Tesorero/Admin)', 60, sigY + 5, { width: 190, align: 'center' });

    doc.lineWidth(1).moveTo(300, sigY).lineTo(500, sigY).stroke();
    doc.text('Firma Pagador (Socio)', 300, sigY + 5, { width: 200, align: 'center' });

    // --- Branding ---
    doc.moveDown(4);
    doc.fontSize(10).fillColor('gray').text('Gracias por su cumplimiento.', { align: 'center' });

    return doc;
}

/**
 * Generates a PDF receipt for a loan payment (Abono Prestamo).
 * @param {Object} pago - The loan payment object (prestamos_pagos).
 * @param {Object} prestamo - The loan object.
 * @param {Object} socio - The socio object.
 * @returns {PDFKit.PDFDocument} - The PDF document stream.
 */
function generateLoanPaymentReceipt(pago, prestamo, socio) {
    const doc = new PDFDocument({ margin: 50 });

    // --- Header ---
    doc
        .fontSize(20)
        .text('NATILLERA MIAHORRO - ABONO A PRESTAMO', { align: 'center' })
        .moveDown();
    doc
        .fontSize(12)
        .text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, { align: 'right' })
        .moveDown();

    // --- Payment Details Box ---
    const startY = doc.y;
    doc.rect(50, startY, 500, 200).stroke();

    const leftX = 60;
    const rightX = 300;
    const lineHeight = 20;
    let currentY = startY + 15;

    // Row 1: Recibo info
    doc.font('Helvetica-Bold').text('Recibo No:', leftX, currentY);
    doc.font('Helvetica').text(`PRES-AB-${pago.id}`, leftX + 80, currentY);

    doc.font('Helvetica-Bold').text('Préstamo ID:', rightX, currentY);
    doc.font('Helvetica').text(`${prestamo.id}`, rightX + 80, currentY);

    currentY += lineHeight;

    // Row 2: Socio Info
    doc.font('Helvetica-Bold').text('Socio:', leftX, currentY);
    doc.font('Helvetica').text(`${socio.nombre1} ${socio.apellido1}`, leftX + 80, currentY);

    currentY += lineHeight;

    doc.font('Helvetica-Bold').text('Documento:', leftX, currentY);
    doc.font('Helvetica').text(`${socio.documento}`, leftX + 80, currentY);

    currentY += lineHeight * 1.5;

    // Row 3: Payment Amount
    doc.fontSize(14).font('Helvetica-Bold').text('Valor Abono:', leftX, currentY);
    doc.fontSize(14).font('Helvetica').text(`$${Number(pago.monto_pago).toLocaleString()}`, leftX + 110, currentY);

    currentY += lineHeight * 1.5;

    // Row 4: Loan Status Snapshot
    doc.fontSize(12).font('Helvetica-Bold').text('Monto Total Préstamo:', leftX, currentY);
    doc.font('Helvetica').text(`$${Number(prestamo.monto_total).toLocaleString()}`, leftX + 140, currentY);

    currentY += lineHeight;

    // Note: 'total_pagado' passed in prestamo object might be the TOTAL including this one or before.
    // Generally, we might want to show "Saldo Restante" but that requires calculation.
    // We'll trust the caller passes a prestamo object that has useful context or we just show the payment.

    // Row 5: Dates
    doc.font('Helvetica-Bold').text('Fecha Abono:', leftX, currentY);
    const paymentDate = pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString() : 'N/A';
    doc.font('Helvetica').text(paymentDate, leftX + 90, currentY);

    doc.font('Helvetica-Bold').text('Forma Pago:', rightX, currentY);
    doc.font('Helvetica').text(`${pago.forma_pago || 'Efectivo'}`, rightX + 80, currentY);

    if (pago.observaciones) {
        currentY += lineHeight * 1.5;
        doc.font('Helvetica-Bold').text('Observaciones:', leftX, currentY);
        doc.font('Helvetica').text(pago.observaciones, leftX + 100, currentY);
    }

    // --- Footer / Signatures ---
    doc.moveDown(8);
    const sigY = doc.y;

    doc.lineWidth(1).moveTo(60, sigY).lineTo(250, sigY).stroke();
    doc.text('Firma Tesorero', 60, sigY + 5, { width: 190, align: 'center' });

    doc.lineWidth(1).moveTo(300, sigY).lineTo(500, sigY).stroke();
    doc.text('Firma Socio', 300, sigY + 5, { width: 200, align: 'center' });

    // --- Branding ---
    doc.moveDown(4);
    doc.fontSize(10).fillColor('gray').text('Comprobante de abono a deuda.', { align: 'center' });

    return doc;
}

module.exports = {
    generateWeeklyReceipt,
    generateLoanPaymentReceipt
};
