import { requireStaff } from '@/server/auth-guard';
import { channelDef, listChannels } from '@/server/channels';
import { CHANNEL_STATUSES, type ChannelStatus } from '@/db/schema';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { saveChannelAction } from '../actions';
import { SettingsNav } from '../settings-nav';

const STATUS_TEXT: Record<ChannelStatus, string> = {
  not_set: 'Not set',
  handle_saved: 'Handle saved',
  connected: 'Connected',
  api_approved: 'API approved',
  rejected: 'Rejected',
};
const STATUS_STYLE: Record<ChannelStatus, string> = {
  not_set: 'bg-muted text-muted-foreground',
  handle_saved: 'bg-sky-100 text-sky-900',
  connected: 'bg-emerald-100 text-emerald-900',
  api_approved: 'bg-emerald-600 text-white',
  rejected: 'bg-red-100 text-red-900',
};
const GROUP_TEXT = { social: 'Social', messaging: 'Messaging', trust: 'Reviews and trust', ads: 'Ads', listing: 'Listing sites', infra: 'Email and SMS' } as const;

export default async function ConnectionsPage() {
  await requireStaff();
  const rows = await listChannels();
  const set = rows.filter((r) => r.status !== 'not_set').length;
  const groups = Object.keys(GROUP_TEXT) as (keyof typeof GROUP_TEXT)[];

  return (
    <div className="grid gap-6">
      <header className="grid gap-3">
        <h1 className="page-title">Channels and connections</h1>
        <SettingsNav current="/studio/settings/connections" />
        <p className="max-w-3xl text-sm text-muted-foreground">
          {set} of {rows.length} set. Save each handle and link as you create the account. Public channels appear in the site footer as soon
          as they have a link. API connections are added here once each platform approves the app.
        </p>
      </header>

      {groups.map((g) => {
        const inGroup = rows.filter((r) => channelDef(r.key)?.group === g);
        if (!inGroup.length) return null;
        return (
          <section key={g} className="grid gap-3">
            <h2 className="font-semibold">{GROUP_TEXT[g]}</h2>
            {inGroup.map((r) => {
              const def = channelDef(r.key)!;
              return (
                <div key={r.key} className="panel p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="font-medium">{def.label}</span>
                    <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLE[r.status]}`}>{STATUS_TEXT[r.status]}</span>
                    {def.public && <span className="text-xs text-muted-foreground">Shown on the website once it has a link</span>}
                  </div>
                  <ActionForm action={saveChannelAction} submitLabel="Save">
                    <input type="hidden" name="key" value={r.key} />
                    <div className="grid gap-3 sm:grid-cols-4">
                      <Field label="Handle or name">
                        <input name="handle" defaultValue={r.handle ?? ''} placeholder="@vikkaa.lk" className={inputClass} />
                      </Field>
                      <Field label="Link">
                        <input name="url" defaultValue={r.url ?? ''} placeholder="https://" className={inputClass} />
                      </Field>
                      <Field label="Status">
                        <select name="status" defaultValue={r.status} className={inputClass}>
                          {CHANNEL_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_TEXT[s]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Account or app ID" hint="For API connections later">
                        <input name="externalId" defaultValue={r.externalId ?? ''} className={inputClass} />
                      </Field>
                    </div>
                    <Field label="Notes">
                      <input name="notes" defaultValue={r.notes ?? ''} placeholder="Who has admin access, review status…" className={inputClass} />
                    </Field>
                    {def.public && (
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="showInFooter" defaultChecked={r.showInFooter} /> Show in the site footer
                      </label>
                    )}
                  </ActionForm>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
