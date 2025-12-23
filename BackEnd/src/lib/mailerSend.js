import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

export const sendVerificationEmail = async ({ toEmail, toName, verifyUrl }) => {
  const apiKey = process.env.MAILERSEND_API_KEY;
  const fromEmail = process.env.MAILERSEND_FROM_EMAIL;
  const fromName = process.env.MAILERSEND_FROM_NAME || "Chat App";

  if (!apiKey) throw new Error("MAILERSEND_API_KEY is not set");
  if (!fromEmail) throw new Error("MAILERSEND_FROM_EMAIL is not set");

  const mailerSend = new MailerSend({ apiKey });

  const sentFrom = new Sender(fromEmail, fromName);
  const recipients = [new Recipient(toEmail, toName || toEmail)];

  const subject = "Verify your email";
  const text = `Verify your email by opening this link: ${verifyUrl}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Verify your email</h2>
      <p>Please verify your email address by clicking the button below:</p>
      <p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 10px 14px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 6px;">
          Verify Email
        </a>
      </p>
      <p>If the button doesn't work, copy/paste this link:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    </div>
  `;

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject(subject)
    .setText(text)
    .setHtml(html);

  return await mailerSend.email.send(emailParams);
};
