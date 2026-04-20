import {
  HydratedDocument,
  Model,
  Schema,
  model,
  models,
} from 'mongoose';

type EventMode = 'online' | 'offline' | 'hybrid' | string;

export interface IEvent {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  mode: EventMode;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

type EventDocument = HydratedDocument<IEvent>;
type EventModel = Model<IEvent>;

const REQUIRED_STRING_FIELDS: ReadonlyArray<keyof Pick<
  IEvent,
  | 'title'
  | 'description'
  | 'overview'
  | 'image'
  | 'venue'
  | 'location'
  | 'date'
  | 'time'
  | 'mode'
  | 'audience'
  | 'organizer'
>> = [
  'title',
  'description',
  'overview',
  'image',
  'venue',
  'location',
  'date',
  'time',
  'mode',
  'audience',
  'organizer',
];

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const normalizeDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date format. Use a valid date value.');
  }
  return parsed.toISOString().split('T')[0];
};

const normalizeTime = (value: string): string => {
  const trimmed = value.trim();
  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (amPmMatch) {
    let hours = Number.parseInt(amPmMatch[1], 10);
    const minutes = Number.parseInt(amPmMatch[2], 10);
    const meridiem = amPmMatch[3].toLowerCase();

    if (hours < 1 || hours > 12 || minutes > 59) {
      throw new Error('Invalid time format. Use HH:mm or h:mm AM/PM.');
    }
    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
  }

  const twentyFourHourMatch = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!twentyFourHourMatch) {
    throw new Error('Invalid time format. Use HH:mm or h:mm AM/PM.');
  }

  return `${twentyFourHourMatch[1].padStart(2, '0')}:${twentyFourHourMatch[2]}`;
};

const EventSchema = new Schema<IEvent, EventModel>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    mode: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    agenda: {
      type: [{ type: String, trim: true }],
      required: true,
      validate: {
        validator: (value: string[]) =>
          Array.isArray(value) &&
          value.length > 0 &&
          value.every((item) => item.trim().length > 0),
        message: 'Agenda must contain at least one non-empty item.',
      },
    },
    organizer: { type: String, required: true, trim: true },
    tags: {
      type: [{ type: String, trim: true }],
      required: true,
      validate: {
        validator: (value: string[]) =>
          Array.isArray(value) &&
          value.length > 0 &&
          value.every((item) => item.trim().length > 0),
        message: 'Tags must contain at least one non-empty item.',
      },
    },
  },
  { timestamps: true }
);

// Keep slug/date/time canonical and reject empty required values before persisting.
EventSchema.pre<EventDocument>('save', async function preSave() {
  for (const field of REQUIRED_STRING_FIELDS) {
    const rawValue = this.get(field);
    if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
      throw new Error(`${field} is required and cannot be empty.`);
    }
    this.set(field, rawValue.trim());
  }

  if (this.isModified('title')) {
    this.slug = toSlug(this.title);
  }

  this.date = normalizeDate(this.date);
  this.time = normalizeTime(this.time);
});

EventSchema.index({ slug: 1 }, { unique: true });

export const Event: EventModel =
  (models.Event as EventModel | undefined) ?? model<IEvent, EventModel>('Event', EventSchema);

