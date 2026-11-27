import { act, render } from '@testing-library/react-native';
import { CampaignMedia } from '../CampaignMedia';
const mockListeners: Record<string, (event: never) => void> = {};
const mockRemove = jest.fn();
const mockPause = jest.fn();
let mockFocused = true;
const mockPlayer = { pause: mockPause, videoTrack: null, availableVideoTracks: [], addListener: jest.fn((name: string, fn: (event: never) => void) => { mockListeners[name] = fn; return { remove: mockRemove }; }) };
jest.mock('@/hooks/usePrivateVideoPlayer', () => ({ usePrivateVideoPlayer: () => mockPlayer }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('expo-video', () => ({ VideoView: (props: unknown) => jest.requireActual('react').createElement('Video', props) }));
jest.mock('@/components/ui/PrivateImage', () => ({ PrivateImage: (props: unknown) => jest.requireActual('react').createElement('Image', props) }));
jest.mock('./../BusinessUI', () => ({ businessStyles: { media: { height: 250 } } }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
beforeEach(() => { jest.clearAllMocks(); mockFocused = true; });
it('uses the actual loaded track ratio without cropping and resets for another source', () => {
  const view = render(<CampaignMedia uri="private-video" mediaType="video" naturalSize />);
  act(() => mockListeners.sourceLoad({ availableVideoTracks: [{ size: { width: 720, height: 1280 } }] } as never));
  expect(view.UNSAFE_getByType('Video' as never).props.style.aspectRatio).toBe(720 / 1280);
  expect(view.UNSAFE_getByType('Video' as never).props.contentFit).toBe('contain');
  act(() => mockListeners.videoTrackChange({ videoTrack: { size: { width: 1920, height: 1080 } } } as never));
  expect(view.UNSAFE_getByType('Video' as never).props.style.aspectRatio).toBe(1920 / 1080);
  view.rerender(<CampaignMedia uri="another" mediaType="video" naturalSize />);
  expect(view.UNSAFE_getByType('Video' as never).props.style.aspectRatio).toBe(4 / 3);
  expect(mockRemove).toHaveBeenCalledTimes(2);
});
it('preserves the existing composer media size and pauses when leaving', () => {
  const view = render(<CampaignMedia uri="video" mediaType="video" />);
  expect(view.UNSAFE_getByType('Video' as never).props.style.height).toBe(250);
  mockFocused = false; view.rerender(<CampaignMedia uri="video" mediaType="video" />);
  expect(mockPause).toHaveBeenCalled();
});
it('sizes an image from decoded dimensions and ignores invalid dimensions', () => {
  const view = render(<CampaignMedia uri="image" mediaType="image" naturalSize />);
  act(() => view.UNSAFE_getByType('Image' as never).props.onLoad({ source: { width: 600, height: 800 } }));
  expect(view.UNSAFE_getByType('Image' as never).props.style.aspectRatio).toBe(0.75);
  act(() => view.UNSAFE_getByType('Image' as never).props.onLoad({ source: { width: 0, height: 0 } }));
  expect(view.UNSAFE_getByType('Image' as never).props.style.aspectRatio).toBe(0.75);
});
