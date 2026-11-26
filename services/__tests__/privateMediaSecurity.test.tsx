jest.mock('@/services/api', () => ({ api: { post: jest.fn() } }));
let mockActor: string | null = 'alice';
jest.mock('@/stores/authStore', () => ({ useAuthStore: (selector: (s: unknown) => unknown) => selector({ user: mockActor ? { id: mockActor } : null }) }));
jest.mock('expo-image', () => ({ Image: (props: unknown) => require('react').createElement('Image', props) }));
jest.mock('expo-video', () => ({ useVideoPlayer: jest.fn(() => ({})) }));
import React from 'react';
import { render, waitFor, act, renderHook } from '@testing-library/react-native';
import { api } from '@/services/api';
import { PrivateImage } from '@/components/ui/PrivateImage';
import { usePrivateVideoPlayer } from '@/hooks/usePrivateVideoPlayer';
import { useVideoPlayer } from 'expo-video';
import { advanceSession } from '@/services/session';
import { resolveMediaUri } from '@/services/privateMedia';
const reference = 'https://storage.googleapis.com/security-test-bucket/gasps/alice/a.jpg';
const grant = 'https://storage.googleapis.com/security-test-bucket/gasps/alice/a.jpg?X-Goog-Signature=synthetic';
beforeEach(() => { jest.clearAllMocks(); advanceSession(); mockActor = 'alice'; (api.post as jest.Mock).mockResolvedValue({ data: { url: grant } }); });
describe('F03: private media playback fails closed', () => {
  test('an image waits for authorization and disables persistent image caching', async () => {
    const view = render(<PrivateImage testID="media" source={{ uri: reference }} />);
    expect(view.getByTestId('media').props.source).toBeNull();
    await waitFor(() => expect(view.getByTestId('media').props.source).toEqual({ uri: grant }));
    expect(api.post).toHaveBeenCalledWith('/uploads/access', { url: reference });
    expect(view.getByTestId('media').props.cachePolicy).toBe('none');
  });
  test('denial never falls back to the permanent storage URL', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce(new Error('forbidden'));
    const view = render(<PrivateImage testID="media" source={{ uri: reference }} />);
    await act(async () => { await Promise.resolve(); });
    expect(view.getByTestId('media').props.source).toBeNull();
  });
  test('signed-out screens cannot request private media', async () => {
    mockActor = null; const view = render(<PrivateImage testID="media" source={reference} />);
    expect(view.getByTestId('media').props.source).toBeNull(); expect(api.post).not.toHaveBeenCalled();
  });
  test('public avatars and local preview files retain their normal source', () => {
    const avatar = 'https://storage.googleapis.com/security-test-bucket/avatars/alice/a.jpg';
    const view = render(<PrivateImage testID="media" source={avatar} />);
    expect(view.getByTestId('media').props.source).toBe(avatar);
    view.rerender(<PrivateImage testID="media" source={{ uri: 'file:///capture.jpg' }} />);
    expect(view.getByTestId('media').props.source).toEqual({ uri: 'file:///capture.jpg' });
    expect(view.getByTestId('media').props.cachePolicy).toBe('none'); expect(api.post).not.toHaveBeenCalled();
  });
  test('a grant arriving after account change is discarded', async () => {
    let finish!: (value: unknown) => void;
    (api.post as jest.Mock).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const pending = resolveMediaUri(reference).catch(error => error);
    advanceSession(); mockActor = 'bob'; finish({ data: { url: grant } });
    expect((await pending).name).toBe('StaleSessionError');
  });
  test('video uses the authorized URL without the native disk cache', async () => {
    renderHook(() => usePrivateVideoPlayer(reference));
    expect(useVideoPlayer).toHaveBeenCalledWith(null, undefined);
    await waitFor(() => expect(useVideoPlayer).toHaveBeenLastCalledWith({ uri: grant, useCaching: false }, undefined));
  });
});
