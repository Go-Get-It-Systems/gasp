import * as fc from 'fast-check';
import type { Gasp, LatestMoment, ReactionReturn } from '@/services/api/schemas/gasp.schema';

const isoDateArbitrary = fc.date({
  min: new Date('2020-01-01T00:00:00.000Z'),
  max: new Date('2030-01-01T00:00:00.000Z'),
  noInvalidDate: true,
}).map((date) => date.toISOString());

export const identityArbitrary = fc.record({
  id: fc.uuid(),
  displayName: fc.string({ minLength: 1, maxLength: 80 }),
  username: fc.string({ minLength: 1, maxLength: 30 }),
  avatarUrl: fc.option(fc.webUrl(), { nil: null }),
});

export const gaspArbitrary: fc.Arbitrary<Gasp> = fc.record({
  id: fc.uuid(),
  senderId: fc.uuid(),
  senderName: fc.string({ minLength: 1, maxLength: 80 }),
  senderAvatarUrl: fc.option(fc.webUrl(), { nil: null }),
  imageUrl: fc.webUrl(),
  imageUri: fc.webUrl(),
  mediaType: fc.constantFrom<'image' | 'video'>('image', 'video'),
  blurhash: fc.string({ minLength: 1, maxLength: 60 }),
  textOverlay: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  replayable: fc.boolean(),
  status: fc.constantFrom<'pending' | 'opened'>('pending', 'opened'),
  deliveryStatus: fc.constantFrom<'sent' | 'delivered' | 'opened'>('sent', 'delivered', 'opened'),
  createdAt: isoDateArbitrary,
  expiresAt: isoDateArbitrary,
  openedAt: fc.option(isoDateArbitrary, { nil: undefined }),
  viewedAt: fc.option(isoDateArbitrary, { nil: undefined }),
});

export const latestMomentArbitrary: fc.Arbitrary<LatestMoment> = fc.record({
  id: fc.uuid(),
  recipientCount: fc.nat(50),
  deliveredCount: fc.nat(50),
  openedCount: fc.nat(50),
  reactionCount: fc.nat(50),
  isExpired: fc.boolean(),
  expiresAt: isoDateArbitrary,
  identitySummaries: fc.array(identityArbitrary, { maxLength: 3 }),
  mediaMetadata: fc.record({
    imageUrl: fc.webUrl(),
    mediaType: fc.constantFrom<'image' | 'video'>('image', 'video'),
    blurhash: fc.string({ minLength: 1, maxLength: 60 }),
    textOverlay: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
    replayable: fc.boolean(),
  }),
});

export const reactionReturnArbitrary: fc.Arbitrary<ReactionReturn> = fc.record({
  id: fc.uuid(),
  gaspId: fc.uuid(),
  reactor: identityArbitrary,
  reactionMediaUrl: fc.webUrl(),
  originalMediaMetadata: fc.record({
    imageUrl: fc.webUrl(),
    mediaType: fc.constantFrom<'image' | 'video'>('image', 'video'),
  }),
  capturedAt: isoDateArbitrary,
  conversationId: fc.option(fc.uuid(), { nil: null }),
  messageId: fc.option(fc.uuid(), { nil: null }),
});
