import { act, render, waitFor } from '@testing-library/react-native';
import { CampaignVideoCover } from '../CampaignVideoCover';

let mockUri: string | null = null;
let mockActor: string | null = 'bi';
let mockGeneration = 1;
const mockPlayers: { muted: boolean; duration: number; replaceAsync: jest.Mock; generateThumbnailsAsync: jest.Mock; release: jest.Mock }[] = [];
const mockCreate = jest.fn();
jest.mock('@/hooks/useAuthorizedMediaUri', () => ({ useAuthorizedMediaUri: () => mockUri }));
jest.mock('@/stores/authStore', () => ({ useAuthStore: (select: (state: unknown) => unknown) => select({ user: mockActor ? { id: mockActor } : null }) }));
jest.mock('@/services/session', () => ({ getSessionGeneration: () => mockGeneration }));
jest.mock('expo-video', () => ({ createVideoPlayer: (...args: unknown[]) => mockCreate(...args) }));
jest.mock('expo-image', () => ({ Image: (props: unknown) => jest.requireActual('react').createElement('Image', props) }));
jest.mock('lucide-react-native', () => ({ Play: () => null }));

beforeEach(() => {
  mockUri = null; mockActor = 'bi'; mockGeneration = 1; mockPlayers.length = 0;
  mockCreate.mockReset().mockImplementation(() => {
    const player = { muted: false, duration: 12, replaceAsync: jest.fn().mockResolvedValue(undefined),
      generateThumbnailsAsync: jest.fn().mockResolvedValue([{ nativeRef: 'frame' }]), release: jest.fn() };
    mockPlayers.push(player); return player;
  });
});

test('waits for a read grant and never passes the permanent private URL to the player', async () => {
  const view = render(<CampaignVideoCover uri="https://storage.googleapis.com/bucket/gasps/iaco/video.mp4" />);
  expect(mockCreate).not.toHaveBeenCalled();
  mockUri = 'https://example.test/authorized-video';
  view.rerender(<CampaignVideoCover uri="https://storage.googleapis.com/bucket/gasps/iaco/video.mp4" />);
  await waitFor(() => expect(view.getByTestId('campaign-video-cover')).toBeTruthy());
  expect(mockPlayers[0].replaceAsync).toHaveBeenCalledWith({ uri: mockUri, useCaching: false });
  expect(mockPlayers[0].muted).toBe(true);
  expect(mockPlayers[0].generateThumbnailsAsync).toHaveBeenCalledWith([1], { maxWidth: 640, maxHeight: 640 });
  expect(view.getByTestId('campaign-video-cover').props.cachePolicy).toBe('none');
  expect(mockPlayers[0].release).toHaveBeenCalledTimes(1);
});

test('removes an existing cover immediately when the session changes', async () => {
  mockUri = 'https://example.test/authorized-video';
  const view = render(<CampaignVideoCover uri="video" />);
  await waitFor(() => expect(view.getByTestId('campaign-video-cover')).toBeTruthy());
  mockGeneration++; mockActor = null; mockUri = null;
  view.rerender(<CampaignVideoCover uri="video" />);
  expect(view.queryByTestId('campaign-video-cover')).toBeNull();
  expect(mockCreate).toHaveBeenCalledTimes(1);
});

test('keeps the same cover across grant refreshes but hides it when access is revoked', async () => {
  mockUri = 'https://example.test/grant-1';
  const view = render(<CampaignVideoCover uri="video" />);
  await waitFor(() => expect(view.getByTestId('campaign-video-cover')).toBeTruthy());
  mockUri = 'https://example.test/grant-2';
  view.rerender(<CampaignVideoCover uri="video" />);
  expect(view.getByTestId('campaign-video-cover')).toBeTruthy();
  expect(mockCreate).toHaveBeenCalledTimes(1);
  mockUri = null;
  view.rerender(<CampaignVideoCover uri="video" />);
  expect(view.queryByTestId('campaign-video-cover')).toBeNull();
});

test('discards a thumbnail completed after account change and releases its player', async () => {
  let finish!: (frames: unknown[]) => void;
  mockUri = 'https://example.test/authorized-video';
  mockCreate.mockImplementationOnce(() => {
    const player = { muted: false, duration: 12, replaceAsync: jest.fn().mockResolvedValue(undefined),
      generateThumbnailsAsync: jest.fn(() => new Promise(resolve => { finish = resolve; })), release: jest.fn() };
    mockPlayers.push(player); return player;
  });
  const view = render(<CampaignVideoCover uri="video" />);
  await waitFor(() => expect(mockPlayers[0].generateThumbnailsAsync).toHaveBeenCalled());
  mockGeneration++; mockActor = null; mockUri = null;
  view.rerender(<CampaignVideoCover uri="video" />);
  await act(async () => { finish([{ nativeRef: 'old-account-frame' }]); });
  expect(view.queryByTestId('campaign-video-cover')).toBeNull();
  expect(mockPlayers[0].release).toHaveBeenCalledTimes(1);
});

test('keeps a fallback and releases resources when loading fails', async () => {
  mockUri = 'https://example.test/authorized-video';
  mockCreate.mockImplementationOnce(() => {
    const player = { muted: false, duration: 0, replaceAsync: jest.fn().mockRejectedValue(new Error('offline')),
      generateThumbnailsAsync: jest.fn(), release: jest.fn() };
    mockPlayers.push(player); return player;
  });
  const view = render(<CampaignVideoCover uri="video" />);
  await waitFor(() => expect(mockPlayers[0].release).toHaveBeenCalledTimes(1));
  expect(view.queryByTestId('campaign-video-cover')).toBeNull();
  expect(mockPlayers[0].generateThumbnailsAsync).not.toHaveBeenCalled();
});
