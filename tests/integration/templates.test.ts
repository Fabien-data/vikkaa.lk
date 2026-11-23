import { describe, it, expect } from 'vitest';
import { listTemplates, saveTemplate, unknownPlaceholders, render, DEFAULT_TEMPLATES, TEMPLATE_VARS } from '@/server/templates';

describe('message templates', () => {
  it('seeds the starter templates once, and every one uses only known placeholders', async () => {
    expect((await listTemplates()).length).toBe(DEFAULT_TEMPLATES.length);
    expect((await listTemplates()).length).toBe(DEFAULT_TEMPLATES.length);
    for (const t of DEFAULT_TEMPLATES) expect(unknownPlaceholders(`${t.subject ?? ''} ${t.body}`)).toEqual([]);
    expect(TEMPLATE_VARS).toContain('pitchLink');
  });

  it('refuses unknown placeholders and empty messages', async () => {
    const [t] = await listTemplates();
    await expect(saveTemplate(t.id, { subject: 'Hi {fristName}', body: 'x', active: true })).rejects.toThrow(/\{fristName\}/);
    await expect(saveTemplate(t.id, { subject: null, body: '  ', active: true })).rejects.toThrow(/empty/);
    await saveTemplate(t.id, { subject: 'Hi {firstName}', body: 'Body', active: false });
  });

  it('renders known placeholders and blanks missing ones', () => {
    expect(render('Hi {firstName}{company}', { firstName: 'Sunil' })).toBe('Hi Sunil');
  });
});
