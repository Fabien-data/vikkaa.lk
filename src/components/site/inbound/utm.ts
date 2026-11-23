const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

/** The campaign tags a visitor arrived with, to carry into the form as hidden fields. */
export function utmFrom(params: Record<string, string | string[] | undefined>): Record<string, string> {
  return Object.fromEntries(UTM_KEYS.flatMap((k) => (typeof params[k] === 'string' && params[k] ? [[k, (params[k] as string).slice(0, 120)]] : [])));
}
