const PDFDocument = require('pdfkit');

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function generarPazYSalvo(socio, prestamo) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // --- Diseño del Certificado ---

            // Logo / Encabezado
            doc
                .fillColor('#0A2342')
                .fontSize(24)
                .font('Helvetica-Bold')
                .text('NATILLERA MIAHORRO', { align: 'center' })
                .fontSize(10)
                .font('Helvetica')
                .text('Sistema de Gestión de Socios', { align: 'center' })
                .moveDown(2);

            // Título del Documento
            doc
                .fontSize(18)
                .font('Helvetica-Bold')
                .text('CERTIFICADO DE PAZ Y SALVO', { align: 'center' })
                .moveDown(2);

            // Fecha
            const fechaHoy = formatDate(new Date());
            doc
                .fontSize(12)
                .font('Helvetica')
                .text(`Medellín, ${fechaHoy}`, { align: 'right' })
                .moveDown(2);

            // Cuerpo del certificado
            const nombreCompleto = `${socio.nombre1} ${socio.nombre2 || ''} ${socio.apellido1} ${socio.apellido2 || ''}`.trim();
            const documento = socio.documento;
            const montoTotal = Number(prestamo.monto_total || prestamo.monto);

            doc
                .fontSize(12)
                .text('A quien interese,', { align: 'left' })
                .moveDown(1)
                .text('Por medio del presente documento, la NATILLERA MIAHORRO certifica que:', { align: 'justify' })
                .moveDown(1);

            doc
                .font('Helvetica-Bold')
                .text(nombreCompleto.toUpperCase(), { align: 'center' })
                .font('Helvetica')
                .text(`Identificado(a) con documento número ${documento}`, { align: 'center' })
                .moveDown(2);

            doc
                .text(
                    `Ha cancelado en su totalidad las obligaciones financieras correspondientes al préstamo número ${prestamo.id}, ` +
                    `por un valor total de ${formatCurrency(montoTotal)}.`,
                    { align: 'justify' }
                )
                .moveDown(1)
                .text(
                    'A la fecha de expedición de este certificado, se encuentra a PAZ Y SALVO por todo concepto relacionado con dicho crédito.',
                    { align: 'justify' }
                )
                .moveDown(4);

            // Firmas
            doc
                .text('Atentamente,', { align: 'center' })
                .moveDown(3)
                .font('Helvetica-Bold')
                .text('ADMINISTRACIÓN NATILLERA MIAHORRO', { align: 'center' })
                .font('Helvetica')
                .text('Nit. 900.000.000-0', { align: 'center' }); // Nit ficticio o variable

            // Pie de página
            doc
                .moveDown(4)
                .fontSize(8)
                .fillColor('#94a3b8')
                .text('Este documento se genera automáticamente y es válido sin firma autógrafa.', { align: 'center' });

            doc.end();
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = { generarPazYSalvo };
