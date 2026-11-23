import { requireStaff } from '@/server/auth-guard';
import { listTemplates, TEMPLATE_VARS } from '@/server/templates';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { saveTemplateAction } from '../actions';
import { SettingsNav } from '../settings-nav';

export default async function TemplatesPage() {
  await requireStaff();
  const templates = await listTemplates();
  return (
    <div className="grid gap-6">
      <header className="grid gap-3">
        <h1 className="page-title">Message templates</h1>
        <SettingsNav current="/studio/settings/templates" />
        <p className="max-w-3xl text-sm text-muted-foreground">
          The words used in outreach. Placeholders you can use: {TEMPLATE_VARS.map((v) => `{${v}}`).join(' ')}. Every email gets an unsubscribe
          link added automatically, and every WhatsApp a &ldquo;Reply STOP&rdquo; line.
        </p>
      </header>
      {templates.map((t) => (
        <section key={t.id} className={`panel p-5 ${t.active ? '' : 'opacity-60'}`}>
          <h2 className="mb-3 font-semibold">
            {t.label} <span className="text-sm font-normal text-muted-foreground">· {t.channel}</span>
          </h2>
          <ActionForm action={saveTemplateAction} submitLabel="Save template">
            <input type="hidden" name="id" value={t.id} />
            {t.channel === 'email' && (
              <Field label="Subject">
                <input name="subject" defaultValue={t.subject ?? ''} className={inputClass} />
              </Field>
            )}
            <Field label="Message">
              <textarea name="body" rows={t.channel === 'email' ? 12 : 4} defaultValue={t.body} className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={t.active} /> In use
            </label>
          </ActionForm>
        </section>
      ))}
    </div>
  );
}
