/** A wa.me link that opens WhatsApp with a prefilled message. */
export function whatsappLink(e164: string, text: string): string {
  return `https://wa.me/${e164.replace(/^\+/, '')}?text=${encodeURIComponent(text)}`;
}
