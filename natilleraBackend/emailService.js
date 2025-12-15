// Email Service Module
const nodemailer = require('nodemailer');
const { generarPazYSalvo } = require('./pdfService');
const { generateWeeklyReceipt, generateLoanPaymentReceipt } = require('./receiptService');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email service configuration error:', error.message);
  } else {
    console.log('✅ Email service ready to send messages');
  }
});

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(amount);
}

// Helper function to format date
function formatDate(date) {
  return new Date(date).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Professional email template
function getEmailTemplate(content) {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Pago - Natillera MiAhorro</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fb;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fb; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0A2342 0%, #063048 100%); padding: 30px 40px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                    🏦 Natillera MiAhorro
                  </h1>
                  <p style="margin: 10px 0 0 0; color: #0CC0DF; font-size: 14px; font-weight: 500;">
                    Sistema de Gestión de Socios
                  </p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  ${content}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                    Este es un correo automático, por favor no responder.
                  </p>
                  <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                    © ${new Date().getFullYear()} Natillera MiAhorro - Todos los derechos reservados
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Send weekly payment confirmation email
async function sendWeeklyPaymentEmail(socio, payment) {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; border-radius: 50px; font-size: 16px; font-weight: 600;">
        ✓ Pago Confirmado
      </div>
    </div>

    <h2 style="color: #0A2342; margin: 0 0 10px 0; font-size: 22px;">
      ¡Hola ${socio.nombre1} ${socio.apellido1}!
    </h2>
    
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
      Hemos recibido exitosamente tu pago semanal. A continuación encontrarás los detalles de tu transacción:
    </p>

    <!-- Payment Details Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
      <tr>
        <td style="padding: 20px;">
          <table width="100%" cellpadding="8" cellspacing="0">
            <tr>
              <td style="color: #64748b; font-size: 14px; padding: 8px 0;">
                <strong>Semana:</strong>
              </td>
              <td style="color: #0A2342; font-size: 14px; text-align: right; padding: 8px 0;">
                Semana ${payment.semana}
              </td>
            </tr>
            <tr style="border-top: 1px solid #e2e8f0;">
              <td style="color: #64748b; font-size: 14px; padding: 8px 0;">
                <strong>Monto Pagado:</strong>
              </td>
              <td style="color: #10b981; font-size: 18px; font-weight: 700; text-align: right; padding: 8px 0;">
                ${formatCurrency(payment.valor)}
              </td>
            </tr>
            <tr style="border-top: 1px solid #e2e8f0;">
              <td style="color: #64748b; font-size: 14px; padding: 8px 0;">
                <strong>Fecha de Pago:</strong>
              </td>
              <td style="color: #0A2342; font-size: 14px; text-align: right; padding: 8px 0;">
                ${formatDate(payment.fecha_pago)}
              </td>
            </tr>
            ${payment.forma_pago ? `
            <tr style="border-top: 1px solid #e2e8f0;">
              <td style="color: #64748b; font-size: 14px; padding: 8px 0;">
                <strong>Forma de Pago:</strong>
              </td>
              <td style="color: #0A2342; font-size: 14px; text-align: right; padding: 8px 0;">
                ${formatPaymentMethod(payment.forma_pago)}
              </td>
            </tr>
            ` : ''}
            ${payment.nombre_pagador ? `
            <tr style="border-top: 1px solid #e2e8f0;">
              <td style="color: #64748b; font-size: 14px; padding: 8px 0;">
                <strong>Pagador:</strong>
              </td>
              <td style="color: #0A2342; font-size: 14px; text-align: right; padding: 8px 0;">
                ${payment.nombre_pagador}
              </td>
            </tr>
            ` : ''}
            ${payment.firma_recibe ? `
            <tr style="border-top: 1px solid #e2e8f0;">
              <td style="color: #64748b; font-size: 14px; padding: 8px 0;">
                <strong>Recibido por:</strong>
              </td>
              <td style="color: #0A2342; font-size: 14px; text-align: right; padding: 8px 0;">
                ${payment.firma_recibe}
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>

    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
      Gracias por tu puntualidad y compromiso con la Natillera. Si tienes alguna pregunta sobre este pago, no dudes en contactarnos.
    </p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: socio.correo,
    subject: `✓ Confirmación de Pago - Semana ${payment.semana}`,
    html: getEmailTemplate(content),
    attachments: []
  };

  // Generate and attach Receipt PDF
  try {
    const doc = generateWeeklyReceipt(payment, socio);

    // Convert PDF stream to buffer
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    await new Promise((resolve) => {
      doc.on('end', resolve);
      doc.end();
    });

    const pdfData = Buffer.concat(buffers);

    mailOptions.attachments.push({
      filename: `Recibo_Semana_${payment.semana}.pdf`,
      content: pdfData,
      contentType: 'application/pdf'
    });
  } catch (pdfError) {
    console.error('⚠️ Error attaching receipt PDF:', pdfError);
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent to:', socio.correo, '- Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email to:', socio.correo, '- Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Helper function to format payment method
function formatPaymentMethod(method) {
  const methodMap = {
    'EFECTIVO': 'Efectivo',
    'TRANSFERENCIA': 'Bancolombia',
    'NEQUI': 'Nequi',
    'OTRO': 'Otro'
  };
  return methodMap[method] || method;
}

// Send loan payment confirmation email
async function sendLoanPaymentEmail(socio, prestamo, pago) {
  const montoTotal = Number(prestamo.monto_total) || Number(prestamo.monto);
  const totalPagado = Number(prestamo.total_pagado || 0); // Already includes current payment from DB
  let saldoPendiente = montoTotal - totalPagado;

  // Numerical tolerance: if balance is very small (less than 1 peso), consider it zero or negative
  if (saldoPendiente < 1) saldoPendiente = 0;

  // Cap percentage at 100%
  const porcentajePagado = Math.min(100, (totalPagado / montoTotal) * 100).toFixed(1);

  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; border-radius: 50px; font-size: 16px; font-weight: 600;">
        ${saldoPendiente <= 0 ? '✓ Préstamo Cancelado' : '✓ Abono Registrado'}
      </div>
    </div>

    <h2 style="color: #0A2342; margin: 0 0 10px 0; font-size: 22px;">
      ¡Hola ${socio.nombre1} ${socio.apellido1}!
    </h2>
    
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
      Hemos registrado exitosamente tu abono al préstamo. A continuación encontrarás los detalles:
    </p>

    <!-- Payment Details Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
      <tr>
        <td style="padding: 20px;">
          <table width="100%" cellpadding="8" cellspacing="0">
            <tr>
              <td style="color: #64748b; font-size: 14px; padding: 8px 0;">
                <strong>Monto del Abono:</strong>
              </td>
              <td style="color: #10b981; font-size: 18px; font-weight: 700; text-align: right; padding: 8px 0;">
                ${formatCurrency(pago.monto_pago)}
              </td>
            </tr>
            <tr style="border-top: 1px solid #e2e8f0;">
              <td style="color: #64748b; font-size: 14px; padding: 8px 0;">
                <strong>Fecha de Pago:</strong>
              </td>
              <td style="color: #0A2342; font-size: 14px; text-align: right; padding: 8px 0;">
                ${formatDate(pago.fecha_pago)}
              </td>
            </tr>
            ${pago.forma_pago ? `
            <tr style="border-top: 1px solid #e2e8f0;">
              <td style="color: #64748b; font-size: 14px; padding: 8px 0;">
                <strong>Forma de Pago:</strong>
              </td>
              <td style="color: #0A2342; font-size: 14px; text-align: right; padding: 8px 0;">
                ${formatPaymentMethod(pago.forma_pago)}
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>

    <!-- Loan Summary Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
      <tr>
        <td style="padding: 20px;">
          <h3 style="color: #0A2342; margin: 0 0 15px 0; font-size: 16px;">
            📊 Resumen del Préstamo
          </h3>
          <table width="100%" cellpadding="6" cellspacing="0">
            <tr>
              <td style="color: #475569; font-size: 14px;">Monto Total:</td>
              <td style="color: #0A2342; font-size: 14px; text-align: right; font-weight: 600;">
                ${formatCurrency(montoTotal)}
              </td>
            </tr>
            <tr>
              <td style="color: #475569; font-size: 14px;">Total Pagado:</td>
              <td style="color: #10b981; font-size: 14px; text-align: right; font-weight: 600;">
                ${formatCurrency(totalPagado)}
              </td>
            </tr>
            <tr>
              <td style="color: #475569; font-size: 14px;">Saldo Pendiente:</td>
              <td style="color: ${saldoPendiente > 0 ? '#f59e0b' : '#10b981'}; font-size: 16px; text-align: right; font-weight: 700;">
                ${formatCurrency(saldoPendiente)}
              </td>
            </tr>
          </table>
          
          <!-- Progress Bar -->
          <div style="margin-top: 15px;">
            <div style="background-color: #e2e8f0; height: 10px; border-radius: 5px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #10b981 0%, #059669 100%); height: 100%; width: ${porcentajePagado}%;"></div>
            </div>
            <p style="text-align: center; margin: 8px 0 0 0; color: #64748b; font-size: 13px;">
              ${porcentajePagado}% completado
            </p>
          </div>
        </td>
      </tr>
    </table>

    ${saldoPendiente <= 0 ? `
    <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #065f46; font-size: 16px;">
        🎉 ¡Felicitaciones! Deuda Cancelada.
      </h3>
      <p style="margin: 0; color: #064e3b; font-size: 14px;">
        Adjunto a este correo encontrarás tu certificado de <strong>Paz y Salvo</strong>.
      </p>
    </div>
    ` : ''}

    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
      Gracias por tu compromiso con la Natillera. Si tienes alguna pregunta sobre este abono, no dudes en contactarnos.
    </p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: socio.correo,
    subject: saldoPendiente <= 0
      ? '🎉 Préstamo Completado - Confirmación de Pago Final'
      : `✓ Confirmación de Abono - ${formatCurrency(pago.monto_pago)}`,
    html: getEmailTemplate(content),
    attachments: []
  };

  // Attach Paz y Salvo PDF if fully paid
  if (saldoPendiente <= 0) {
    try {
      console.log('📄 Generando Paz y Salvo para préstamo:', prestamo.id);
      const pdfBuffer = await generarPazYSalvo(socio, prestamo);
      mailOptions.attachments.push({
        filename: `PazYSalvo_Prestamo_${prestamo.id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
      console.log('✅ Paz y Salvo generado y adjuntado.');
    } catch (pdfError) {
      console.error('❌ Error generando PDF Paz y Salvo:', pdfError);
      // We continue sending the email even if PDF fails, but we log the error
    }
  }

  // Generate and attach Receipt PDF (Abono)
  try {
    const doc = generateLoanPaymentReceipt(pago, prestamo, socio);

    // Convert PDF stream to buffer
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    await new Promise((resolve) => {
      doc.on('end', resolve);
      doc.end();
    });

    const pdfData = Buffer.concat(buffers);

    mailOptions.attachments.push({
      filename: `Recibo_Abono_Prestamo_${prestamo.id}.pdf`,
      content: pdfData,
      contentType: 'application/pdf'
    });
  } catch (pdfError) {
    console.error('⚠️ Error attaching receipt PDF (Loan):', pdfError);
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent to:', socio.correo, '- Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email to:', socio.correo, '- Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Email para nuevo prestamo y alerta de seguridad
async function sendLoanCreationEmail(socio, prestamo) {
  if (!socio.correo) {
    console.log(`⚠️ No email address for socio ${socio.nombre1} ${socio.apellido1 || ''}, skipping creation email`);
    return;
  }

  const currentDate = formatDate(new Date());

  const htmlContent = getEmailTemplate(`
    <div class="content-block">
      <h2>¡Nuevo Préstamo Registrado!</h2>
      <p>Hola <strong>${socio.nombre1} ${socio.apellido1 || ''}</strong>,</p>
      <p>Te informamos que se ha registrado exitosamente una solicitud de préstamo a tu nombre en nuestra Natillera.</p>
    </div>

    <div class="details-table">
      <table>
        <tr>
          <td width="40%" style="color: #666;">Monto Solicitado:</td>
          <td><strong>${formatCurrency(prestamo.monto)}</strong></td>
        </tr>
        <tr>
          <td style="color: #666;">Fecha de Solicitud:</td>
          <td>${formatDate(prestamo.fecha_aprobacion || new Date())}</td>
        </tr>
        <tr>
          <td style="color: #666;">Plazo:</td>
          <td>${prestamo.plazo_meses} meses</td>
        </tr>
        <tr>
          <td style="color: #666;">Tasa de Interés:</td>
          <td>${prestamo.tasa_interes}%</td>
        </tr>
        <tr>
          <td style="color: #666;">Total a Pagar:</td>
          <td><strong>${formatCurrency(prestamo.monto_total)}</strong></td>
        </tr>
      </table>
    </div>

    <div class="content-block warning-box" style="background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 15px; border-radius: 5px; margin-top: 20px;">
      <p style="margin: 0; font-weight: bold;">⚠️ Alerta de Seguridad</p>
      <p style="margin: 5px 0 0;">Si tú NO has realizado esta solicitud, por favor comunícate inmediatamente con los administradores de la natillera para reportar este incidente.</p>
    </div>

    <div class="content-block" style="text-align: center; margin-top: 20px;">
      <p style="font-size: 0.9em; color: #666;">Este es un mensaje automático de seguridad.</p>
    </div>
  `);

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Natillera MiAhorro" <noreply@natillera.com>',
    to: socio.correo,
    subject: '🔔 Nuevo Préstamo Registrado - Natillera MiAhorro',
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Loan creation email sent to ${socio.correo}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Error sending loan creation email:', error.message);
    throw error;
  }
}

// Email for Rifa Winner
async function sendRifaWinnerEmail(socio, rifa, ticketNumber) {
  if (!socio.correo) {
    console.log(`⚠️ No email address for socio ${socio.nombre1}, skipping winner email`);
    return;
  }

  const htmlContent = getEmailTemplate(`
    <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 48px; margin-bottom: 10px;">🏆</div>
        <h2 style="color: #d97706; margin: 0 0 10px 0; font-size: 28px;">¡FELICITACIONES!</h2>
        <p style="font-size: 18px; color: #4b5563;">¡Eres el ganador!</p>
    </div>

    <div class="content-block">
      <p>Hola <strong>${socio.nombre1} ${socio.apellido1 || ''}</strong>,</p>
      <p>Nos complace informarte que eres el feliz ganador del sorteo de la rifa <strong>"${rifa.nombre}"</strong>.</p>
    </div>

    <div style="background-color: #fffbeb; border: 2px solid #fcd34d; border-radius: 10px; padding: 20px; text-align: center; margin: 25px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Número Ganador</p>
      <p style="margin: 10px 0 0 0; color: #d97706; font-size: 48px; font-weight: 800; line-height: 1;">${ticketNumber}</p>
    </div>

    <div class="content-block">
      <p>Por favor ponte en contacto con los administradores de la Natillera para coordinar la entrega de tu premio.</p>
      <p>¡Gracias por participar y apoyar a la Natillera!</p>
    </div>
  `);

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Natillera MiAhorro" <noreply@natillera.com>',
    to: socio.correo,
    subject: '🏆 ¡FELICITACIONES! Ganaste la Rifa - Natillera MiAhorro',
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Rifa winner email sent to ${socio.correo}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Error sending winner email:', error.message);
    // Don't throw, just log
  }
}

module.exports = {
  sendWeeklyPaymentEmail,
  sendLoanPaymentEmail,
  sendLoanCreationEmail,
  sendRifaWinnerEmail
};
