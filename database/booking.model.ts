import {
  HydratedDocument,
  Model,
  Schema,
  Types,
  model,
  models,
} from 'mongoose';
import { Event } from './event.model';

export interface IBooking {
  eventId: Types.ObjectId;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type BookingDocument = HydratedDocument<IBooking>;
type BookingModel = Model<IBooking>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BookingSchema = new Schema<IBooking, BookingModel>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string) => EMAIL_REGEX.test(value),
        message: 'Email must be a valid email address.',
      },
    },
  },
  { timestamps: true }
);

BookingSchema.index({ eventId: 1 });

// Prevent orphan bookings by ensuring the related event exists at save time.
BookingSchema.pre<BookingDocument>('save', async function preSave() {
  this.email = this.email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(this.email)) {
    throw new Error('Email must be a valid email address.');
  }

  if (this.isNew || this.isModified('eventId')) {
    const eventExists = await Event.exists({ _id: this.eventId });
    if (!eventExists) {
      throw new Error('Cannot create booking: referenced event does not exist.');
    }
  }
});

export const Booking: BookingModel =
  (models.Booking as BookingModel | undefined) ??
  model<IBooking, BookingModel>('Booking', BookingSchema);

