import { env } from '../config/env.js'
import { emailActionLabel, emailFooter } from '../modules/notifications/notifications.messages.js'
import type { AppLanguage } from '../modules/settings/settings.types.js'

/**
 * Send an email via Resend API. Silently skips if API key is not configured.
 */
export async function sendEmail(to: string, subject: string, html: string) {
  if (!env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not configured — skipping email to', to)
    return false
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend API error ${res.status}: ${body}`)
  }

  return true
}

/**
 * Send password reset email with styled HTML template.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background-color:#0f0b2e; font-family:'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0b2e; padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#1a1545; border-radius:16px; padding:40px; color:#ffffff;">
        <tr><td align="center" style="padding-bottom:24px;">
          <h1 style="margin:0; font-size:28px; color:#ffffff;">ITAKAI</h1>
        </td></tr>
        <tr><td align="center" style="padding-bottom:16px;">
          <h2 style="margin:0; font-size:20px; color:#e0d4ff;">Restablecer contraseña</h2>
        </td></tr>
        <tr><td style="padding-bottom:24px; color:#b8add4; font-size:15px; line-height:1.6; text-align:center;">
          Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva. El enlace expira en <strong>1 hora</strong>.
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${resetUrl}" style="display:inline-block; background-color:#7c3aed; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:8px; font-size:16px; font-weight:600;">
            Restablecer contraseña
          </a>
        </td></tr>
        <tr><td style="padding-bottom:16px; color:#8b7faa; font-size:13px; text-align:center;">
          Si no solicitaste este cambio, ignora este correo. Tu contraseña no será modificada.
        </td></tr>
        <tr><td style="border-top:1px solid #2d2660; padding-top:16px; color:#6b5f8a; font-size:12px; text-align:center;">
          Este enlace solo funciona una vez y expira en 1 hora.<br>
          © ITAKAI — Plataforma educativa gamificada
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return sendEmail(to, 'Restablecer tu contraseña — ITAKAI', html)
}

/**
 * Send notification email after a successful password change.
 * Security best practice: alert the user so they can react if it wasn't them.
 */
export async function sendPasswordChangedEmail(to: string) {
  const supportEmail = 'soporte@itakai.es'
  const changedAt = new Date().toLocaleString('es-ES', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Madrid',
  })

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background-color:#0f0b2e; font-family:'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0b2e; padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#1a1545; border-radius:16px; padding:40px; color:#ffffff;">
        <tr><td align="center" style="padding-bottom:24px;">
          <h1 style="margin:0; font-size:28px; color:#ffffff;">ITAKAI</h1>
        </td></tr>
        <tr><td align="center" style="padding-bottom:16px;">
          <h2 style="margin:0; font-size:20px; color:#6cf3af;">✓ Contraseña actualizada</h2>
        </td></tr>
        <tr><td style="padding-bottom:24px; color:#b8add4; font-size:15px; line-height:1.6; text-align:center;">
          La contraseña de tu cuenta se ha cambiado correctamente el <strong>${changedAt}</strong>.
        </td></tr>
        <tr><td style="background-color:#2d2660; border-radius:8px; padding:16px; color:#e0d4ff; font-size:14px; line-height:1.5; text-align:center;">
          <strong>¿No has sido tú?</strong><br>
          Contacta inmediatamente con nosotros en <a href="mailto:${supportEmail}" style="color:#6cf3af; text-decoration:none;">${supportEmail}</a> para asegurar tu cuenta.
        </td></tr>
        <tr><td style="border-top:1px solid #2d2660; padding-top:16px; padding-top:24px; color:#6b5f8a; font-size:12px; text-align:center;">
          © ITAKAI — Plataforma educativa gamificada
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return sendEmail(to, 'Tu contraseña ha sido cambiada — ITAKAI', html)
}

/**
 * Aviso de la plataforma por correo (Fase 3, punto 3).
 *
 * Misma plantilla que los correos de cuenta, para que un aviso de entrega no
 * parezca de otro producto. El botón solo sale si el aviso lleva enlace, y todo
 * el texto —incluido el pie— va en el idioma del destinatario.
 */
export async function sendNotificationEmail(
  to: string,
  language: AppLanguage,
  notification: { title: string; message: string; actionUrl?: string; actionLabel?: string }
) {
  const { title, message, actionUrl, actionLabel } = notification

  const actionBlock = actionUrl
    ? `
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${actionUrl}" style="display:inline-block; background-color:#7c3aed; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:8px; font-size:16px; font-weight:600;">
            ${actionLabel || emailActionLabel('open', language)}
          </a>
        </td></tr>`
    : ''

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background-color:#0f0b2e; font-family:'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0b2e; padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#1a1545; border-radius:16px; padding:40px; color:#ffffff;">
        <tr><td align="center" style="padding-bottom:24px;">
          <h1 style="margin:0; font-size:28px; color:#ffffff;">ITAKAI</h1>
        </td></tr>
        <tr><td align="center" style="padding-bottom:16px;">
          <h2 style="margin:0; font-size:20px; color:#e0d4ff;">${title}</h2>
        </td></tr>
        <tr><td style="padding-bottom:24px; color:#b8add4; font-size:15px; line-height:1.6; text-align:center;">
          ${message}
        </td></tr>${actionBlock}
        <tr><td style="border-top:1px solid #2d2660; padding-top:16px; color:#6b5f8a; font-size:12px; text-align:center;">
          ${emailFooter(language)}<br>
          © ITAKAI — Plataforma educativa gamificada
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return sendEmail(to, `${title} — ITAKAI`, html)
}
