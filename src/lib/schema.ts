import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  movieEventCode: text('movie_event_code').notNull(),
  movieName: text('movie_name').notNull(),
  venueCodes: text('venue_codes').array().notNull(), // text[] of venue codes
  targetDates: text('target_dates').array().notNull(), // text[] of YYYYMMDD
  active: boolean('active').default(false).notNull(),
  notifiedShowKeys: text('notified_show_keys').array().default([]).notNull(),
  unsubscribeToken: text('unsubscribe_token').notNull().$defaultFn(() => {
    const { randomBytes } = require('crypto');
    return randomBytes(32).toString('hex');
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastCheckedAt: timestamp('last_checked_at'),
  notifiedAt: timestamp('notified_at'),
});

export const otpCodes = pgTable('otp_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  code: text('code').notNull(),
  subscriptionId: text('subscription_id').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cachedMovies = pgTable('cached_movies', {
  eventCode: text('event_code').primaryKey(),
  eventName: text('event_name').notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
});
