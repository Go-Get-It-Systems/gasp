import * as fc from 'fast-check';
import { router } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { openReactionContinuation } from '@/services/navigation';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@sentry/react-native', () => ({ captureMessage: jest.fn() }));
jest.mock('@/services/mediaCache', () => ({ cacheMedia: jest.fn() }));

const requiredString = fc.string({ minLength: 1, maxLength: 60 });

describe('Feature: gasps-social-pulse, Property 14: reaction navigation no-duplicate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('dispatches exactly one chat navigation when conversation context exists', () => {
    fc.assert(fc.property(requiredString, fc.option(requiredString, { nil: null }), requiredString, requiredString, (conversationId, messageId, reactionId, gaspId) => {
      jest.clearAllMocks();
      expect(openReactionContinuation({ reactionId, conversationId, messageId, gaspId })).toBe('chat');
      expect(router.push).toHaveBeenCalledTimes(1);
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    }), { numRuns: 100 });
  });

  it('uses one result route with warning when complete fallback media exists', () => {
    fc.assert(fc.property(requiredString, requiredString, fc.webUrl(), fc.webUrl(), requiredString, (reactionId, gaspId, reactionVideoUri, originalImageUri, senderName) => {
      jest.clearAllMocks();
      expect(openReactionContinuation({ reactionId, gaspId, reactionVideoUri, originalImageUri, senderName })).toBe('reaction');
      expect(router.push).toHaveBeenCalledTimes(1);
      expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    }), { numRuns: 100 });
  });

  it('aborts with one warning when neither destination is valid', () => {
    fc.assert(fc.property(requiredString, requiredString, (reactionId, gaspId) => {
      jest.clearAllMocks();
      expect(openReactionContinuation({ reactionId, gaspId })).toBe('none');
      expect(router.push).not.toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    }), { numRuns: 100 });
  });
});
