import * as assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { HydratedDocument, Types } from 'mongoose';
import { Booking, IBooking } from './booking.model';
import { Event } from './event.model';

type HookExecutor = {
  execPre: (
    hookName: string,
    context: HydratedDocument<IBooking>,
    callback: (error?: Error | null) => void
  ) => void;
};

const runBookingPreSave = async (doc: HydratedDocument<IBooking>): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const hooks = (Booking.schema as unknown as { s: { hooks: HookExecutor } }).s.hooks;
    hooks.execPre('save', doc, (error?: Error | null) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const buildBookingPayload = (): Omit<IBooking, 'createdAt' | 'updatedAt'> => ({
  eventId: new Types.ObjectId(),
  email: 'user@example.com',
});

describe('Booking model', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('validates email format at schema level', () => {
    const doc = new Booking({ ...buildBookingPayload(), email: 'invalid-email' });
    const error = doc.validateSync();

    assert.ok(error);
    assert.ok(error.errors.email);
  });

  it('throws when referenced event does not exist', async () => {
    mock.method(Event, 'exists', async () => null);
    const doc = new Booking(buildBookingPayload());

    await assert.rejects(
      async () => runBookingPreSave(doc),
      /referenced event does not exist/
    );
  });

  it('passes pre-save when referenced event exists', async () => {
    mock.method(Event, 'exists', async () => ({ _id: new Types.ObjectId() }));
    const doc = new Booking({ ...buildBookingPayload(), email: 'USER@Example.com' });

    await runBookingPreSave(doc);
    assert.equal(doc.email, 'user@example.com');
  });

  it('skips event existence query when eventId is unchanged on existing docs', async () => {
    const existsSpy = mock.method(Event, 'exists', async () => ({ _id: new Types.ObjectId() }));
    const doc = Booking.hydrate(buildBookingPayload());

    await runBookingPreSave(doc);
    assert.equal(existsSpy.mock.callCount(), 0);
  });
});

