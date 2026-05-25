import { Injectable } from '@nestjs/common';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

@Injectable()
export class EmailService {
  private readonly FROM = process.env.EMAIL_FROM || 'noreply@iris.enterprise';

  async send(payload: EmailPayload): Promise<{ sent: boolean }> {
    const apiKey = process.env.SENDGRID_KEY;
    if (!apiKey) {
      console.log(`[EmailService] SENDGRID_KEY no configurada. Email simulado para ${payload.to}: ${payload.subject}`);
      return { sent: false };
    }
    try {
      await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: payload.to }] }],
          from: { email: payload.from || this.FROM, name: 'IRIS Enterprise' },
          subject: payload.subject,
          content: [{ type: 'text/html', value: payload.html }],
        }),
      });
      return { sent: true };
    } catch (error: any) {
      console.error(`[EmailService] Error sending to ${payload.to}: ${error.message}`);
      return { sent: false };
    }
  }

  async sendWelcome(email: string, name: string, orgName: string): Promise<{ sent: boolean }> {
    return this.send({
      to: email,
      subject: 'Bienvenido a IRIS Enterprise',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1 style="color:#3b82f6">IRIS Enterprise</h1><p>Hola ${name},</p><p>Tu organización <strong>${orgName}</strong> ha sido registrada en IRIS Enterprise.</p><p>Ya puedes iniciar sesión y comenzar a evaluar tus riesgos.</p><a href="${process.env.FRONTEND_URL || 'https://iris-frontend-y053.onrender.com'}/login" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px">Ir al sistema</a><p style="margin-top:24px;font-size:12px;color:#666">IRIS Enterprise — Burgoa Security Consultant</p></div>`,
    });
  }

  async sendInvitation(email: string, invitedBy: string, orgName: string): Promise<{ sent: boolean }> {
    return this.send({
      to: email,
      subject: `Has sido invitado a ${orgName} en IRIS Enterprise`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1 style="color:#3b82f6">IRIS Enterprise</h1><p>${invitedBy} te ha invitado a unirte a <strong>${orgName}</strong>.</p><p>Haz clic para aceptar la invitación y crear tu cuenta.</p><a href="${process.env.FRONTEND_URL || 'https://iris-frontend-y053.onrender.com'}/register" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px">Aceptar invitación</a></div>`,
    });
  }

  async sendAlert(email: string, alertTitle: string, details: string): Promise<{ sent: boolean }> {
    return this.send({
      to: email,
      subject: `[ALERTA] ${alertTitle} — IRIS Enterprise`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1 style="color:#ef4444">Alerta de Seguridad</h1><p><strong>${alertTitle}</strong></p><p>${details}</p><a href="${process.env.FRONTEND_URL || 'https://iris-frontend-y053.onrender.com'}/anomalies" style="display:inline-block;padding:12px 24px;background:#ef4444;color:#fff;text-decoration:none;border-radius:6px">Ver alertas</a></div>`,
    });
  }
}
