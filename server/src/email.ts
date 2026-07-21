import nodemailer from "nodemailer";
import { Resend } from "resend";
import type { AuthServerConfig } from "./config";
import type { EmailSender } from "./types";

export class ConsoleEmailSender implements EmailSender {
  constructor(private readonly shouldLogCodes: boolean) {}

  async sendLoginCode(params: { email: string; code: string; ttlSeconds: number }) {
    if (this.shouldLogCodes) {
      console.info(`[auth] login code for ${params.email}: ${params.code} (ttl ${params.ttlSeconds}s)`);
    }
  }
}

export class SmtpEmailSender implements EmailSender {
  private readonly transporter;
  private readonly from: string;

  constructor(config: AuthServerConfig) {
    const fromAddress = config.emailSender.smtpFrom || "no-reply@example.com";
    this.from = config.emailSender.smtpFromName ? `${config.emailSender.smtpFromName} <${fromAddress}>` : fromAddress;
    this.transporter = nodemailer.createTransport({
      host: config.emailSender.smtpHost,
      port: config.emailSender.smtpPort,
      secure: config.emailSender.smtpSecure,
      auth: config.emailSender.smtpUser
        ? {
            user: config.emailSender.smtpUser,
            pass: config.emailSender.smtpPassword
          }
        : undefined
    });
  }

  async sendLoginCode(params: { email: string; code: string; ttlSeconds: number }) {
    const minutes = Math.max(1, Math.round(params.ttlSeconds / 60));
    await this.transporter.sendMail({
      from: this.from,
      to: params.email,
      subject: "Код для входа в Trener",
      text: `Ваш код для входа: ${params.code}\n\nКод действует ${minutes} минут. Если вы не запрашивали вход, просто проигнорируйте это письмо.`
    });
  }
}

export class ResendEmailSender implements EmailSender {
  private readonly resend: Resend;
  private readonly from: string;

  constructor(config: AuthServerConfig) {
    if (!config.emailSender.resendApiKey) {
      throw new Error("RESEND_API_KEY is required for EMAIL_SENDER=resend");
    }
    const fromAddress = config.emailSender.smtpFrom || "no-reply@example.com";
    this.from = config.emailSender.smtpFromName ? `${config.emailSender.smtpFromName} <${fromAddress}>` : fromAddress;
    this.resend = new Resend(config.emailSender.resendApiKey);
  }

  async sendLoginCode(params: { email: string; code: string; ttlSeconds: number }) {
    const minutes = Math.max(1, Math.round(params.ttlSeconds / 60));
    const text = buildLoginCodeText(params.code, minutes);
    await this.resend.emails.send({
      from: this.from,
      to: params.email,
      subject: "Код для входа в Trener",
      text,
      html: buildLoginCodeHtml(params.code, minutes)
    });
  }
}

export function createEmailSender(config: AuthServerConfig): EmailSender {
  if (config.emailSender.kind === "resend") {
    return new ResendEmailSender(config);
  }
  if (config.emailSender.kind === "smtp") {
    return new SmtpEmailSender(config);
  }
  return new ConsoleEmailSender(!config.isProduction);
}

function buildLoginCodeText(code: string, minutes: number) {
  return `Ваш код для входа: ${code}\n\nКод действует ${minutes} минут. Если вы не запрашивали вход, просто проигнорируйте это письмо.`;
}

function buildLoginCodeHtml(code: string, minutes: number) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <p>Ваш код для входа:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 12px 0;">${escapeHtml(code)}</p>
      <p>Код действует ${minutes} минут.</p>
      <p>Если вы не запрашивали вход, просто проигнорируйте это письмо.</p>
    </div>
  `.trim();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "\"":
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}
