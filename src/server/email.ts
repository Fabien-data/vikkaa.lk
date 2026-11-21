import { Resend } from 'resend';
import { config } from '@/lib/config';

let client: Resend | null = null;

export async function sendEmail(input: { to: string | string[]; subject: string; text: string }): Promise<void> {
  if (!config.resendApiKey) {
    if (config.production) throw new Error('RESEND_API_KEY is not set');
    console.info(`[email:dev] to=${String(input.to)} subject="${input.subject}"\n${input.text}`);
    return;
  }
  client ??= new Resend(config.resendApiKey);
  const { error } = await client.emails.send({ from: config.mailFrom, ...input });
  if (error) throw new Error(`Email failed: ${error.message}`);
}
