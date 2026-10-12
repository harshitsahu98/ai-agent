
import "dotenv/config";
import nodemailer from "nodemailer";
import { tool } from "@langchain/core/tools";

export type PendingEmail = {
  to: string;
  subject: string;
  text: string;
};

let pendingEmail: PendingEmail | null = null;

export function getPendingEmail(): PendingEmail | null {
  return pendingEmail;
}

export function clearPendingEmail(): void {
  pendingEmail = null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const prepareEmailTool = tool(
  async (input: PendingEmail): Promise<string> => {
    const { to, subject, text } = input;

    // Runtime validation: don't rely only on the model's tool schema.
    if (
      typeof to !== "string" ||
      typeof subject !== "string" ||
      typeof text !== "string"
    ) {
      throw new Error("Email requires a recipient, subject, and text body.");
    }

    if (!isValidEmail(to.trim())) {
      throw new Error("Please provide a valid recipient email address.");
    }

    if (!subject.trim() || !text.trim()) {
      throw new Error("Email subject and body cannot be empty.");
    }

    if (subject.length > 200 || text.length > 20000) {
      throw new Error("Email subject or body exceeds the allowed length.");
    }

    if (pendingEmail) {
      return "An email draft is already awaiting confirmation. Finish or cancel that draft first.";
    }

    pendingEmail = {
      to: to.trim(),
      subject: subject.trim(),
      text,
    };

    return `Email draft prepared for ${pendingEmail.to}. It has NOT been sent. The user must confirm sending it in the terminal.`;
  },
  {
    name: "prepare_email",
    description:
      "Prepare an email draft for the user to review and confirm. Never claim that the email was sent. Use only when the user asks to compose or send an email.",
    schema: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Recipient email address",
        },
        subject: {
          type: "string",
          description: "Email subject",
        },
        text: {
          type: "string",
          description: "Plain-text email body",
        },
      },
      required: ["to", "subject", "text"],
      additionalProperties: false,
    },
  },
);

export async function sendPendingEmail(): Promise<void> {
  const email = pendingEmail;

  if (!email) {
    throw new Error("There is no email draft awaiting confirmation.");
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;

  if (!host || !user || !pass || !from || !Number.isFinite(port)) {
    throw new Error(
      "SMTP configuration is incomplete. Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM in .env.",
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from,
      to: email.to,
      subject: email.subject,
      text: email.text,
    });
  } finally {
    // Don't accidentally send a stale draft again.
    pendingEmail = null;
    transporter.close();
  }
}
