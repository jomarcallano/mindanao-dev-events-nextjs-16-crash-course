import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HydratedDocument } from 'mongoose';
import { Event, IEvent } from './event.model';

type HookExecutor = {
  execPre: (
    hookName: string,
    context: HydratedDocument<IEvent>,
    callback: (error?: Error | null) => void
  ) => void;
};

const runEventPreSave = async (doc: HydratedDocument<IEvent>): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const hooks = (Event.schema as unknown as { s: { hooks: HookExecutor } }).s.hooks;
    hooks.execPre('save', doc, (error?: Error | null) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const buildEventPayload = (): Omit<IEvent, 'createdAt' | 'updatedAt'> => ({
  title: 'My Test Event',
  slug: 'my-test-event',
  description: 'Detailed description',
  overview: 'High-level overview',
  image: 'https://example.com/image.png',
  venue: 'Main Hall',
  location: 'New York',
  date: '2026-05-05',
  time: '09:30',
  mode: 'online',
  audience: 'Developers',
  agenda: ['Intro', 'Workshop'],
  organizer: 'Acme Inc.',
  tags: ['tech', 'web'],
});

describe('Event model', () => {
  it('validates required schema fields', () => {
    const payload = buildEventPayload();
    const doc = new Event({ ...payload, title: '' });
    const error = doc.validateSync();

    assert.ok(error);
    assert.ok(error.errors.title);
  });

  it('generates a slug from title in pre-save', async () => {
    const doc = new Event({
      ...buildEventPayload(),
      title: ' Next.js & TypeScript Crash Course ',
      slug: 'old-value',
    });

    await runEventPreSave(doc);
    assert.equal(doc.slug, 'nextjs-typescript-crash-course');
  });

  it('does not regenerate slug when title is unchanged', async () => {
    const doc = Event.hydrate({
      ...buildEventPayload(),
      slug: 'custom-stable-slug',
    });

    await runEventPreSave(doc);
    assert.equal(doc.slug, 'custom-stable-slug');
  });

  it('normalizes date and time formats in pre-save', async () => {
    const doc = new Event({
      ...buildEventPayload(),
      date: 'May 5, 2026',
      time: '3:05 PM',
    });

    await runEventPreSave(doc);
    assert.match(doc.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(doc.time, '15:05');
  });

  it('throws for invalid date/time in pre-save', async () => {
    const invalidDateDoc = new Event({
      ...buildEventPayload(),
      date: 'not-a-date',
    });

    await assert.rejects(
      async () => runEventPreSave(invalidDateDoc),
      /Invalid date format/
    );

    const invalidTimeDoc = new Event({
      ...buildEventPayload(),
      time: '25:99',
    });

    await assert.rejects(
      async () => runEventPreSave(invalidTimeDoc),
      /Invalid time format/
    );
  });
});

