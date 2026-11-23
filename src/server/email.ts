import { Resend } from 'resend';
import { config } from '@/lib/config';

let client: Resend | null = null;

export type EmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  /** Display name for the sender, e.g. a founder's name. The address is always MAIL_FROM's. */
  fromName?: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

/** MAIL_FROM may be "hello@vikkaa.lk" or "Vikkaa <hello@vikkaa.lk>". */
export function senderAddress(): string {
  return config.mailFrom.match(/<([^>]+)>/)?.[1] ?? config.mailFrom;
}

export async function sendEmail(input: EmailInput): Promise<{ id?: string }> {
  const { fromName, ...rest } = input;
  const from = fromName ? `${fromName.replace(/["<>\r\n]/g, '')} <${senderAddress()}>` : config.mailFrom;
  if (!config.resendApiKey) {
    if (config.production) throw new Error('RESEND_API_KEY is not set');
    console.info(`[email:dev] from=${from} to=${String(input.to)} subject="${input.subject}"\n${input.text}`);
    return {};
  }
  client ??= new Resend(config.resendApiKey);
  const { data, error } = await client.emails.send({ from, ...rest });
  if (error) throw new Error(`Email failed: ${error.message}`);
  return { id: data?.id };
}
