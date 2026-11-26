import { act, renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useBusinessMedia } from '../useBusinessMedia';

const mockCameraPermission = jest.fn();
const mockLibraryPermission = jest.fn();
const mockCamera = jest.fn();
const mockLibrary = jest.fn();
const mockCaptureException = jest.fn();
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: (...args: unknown[]) => mockCameraPermission(...args),
  requestMediaLibraryPermissionsAsync: (...args: unknown[]) => mockLibraryPermission(...args),
  launchCameraAsync: (...args: unknown[]) => mockCamera(...args),
  launchImageLibraryAsync: (...args: unknown[]) => mockLibrary(...args),
}));
jest.mock('@sentry/react-native', () => ({ captureException: (...args: unknown[]) => mockCaptureException(...args) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('Business media selection recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCameraPermission.mockResolvedValue({ granted: true });
    mockLibraryPermission.mockResolvedValue({ granted: true });
    mockCamera.mockResolvedValue({ canceled: true });
    mockLibrary.mockResolvedValue({ canceled: true });
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([false, true])('denied permission never launches the picker and allows a later attempt (camera=%s)', async (camera) => {
    const request = camera ? mockCameraPermission : mockLibraryPermission;
    request.mockResolvedValueOnce({ granted: false });
    const { result } = renderHook(() => useBusinessMedia());
    await act(async () => { await result.current.pick(camera); });
    expect(mockCamera).not.toHaveBeenCalled();
    expect(mockLibrary).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('common.error', 'business.permissionError');
    expect(result.current.picking).toBe(false);
    expect(result.current.media).toBeUndefined();
    await act(async () => { await result.current.pick(camera); });
    expect(camera ? mockCamera : mockLibrary).toHaveBeenCalledTimes(1);
  });

  it('cancellation preserves existing media and does not report an error', async () => {
    const { result } = renderHook(() => useBusinessMedia());
    const existing = { uri: 'file://synthetic.png', mediaType: 'image' as const };
    act(() => result.current.setMedia(existing));
    await act(async () => { await result.current.pick(); });
    expect(result.current.media).toEqual(existing);
    expect(result.current.picking).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('picker failure is reported and does not leave selection stuck', async () => {
    const failure = new Error('Synthetic picker failure');
    mockLibrary.mockRejectedValueOnce(failure);
    const { result } = renderHook(() => useBusinessMedia());
    await act(async () => { await result.current.pick(); });
    expect(mockCaptureException).toHaveBeenCalledWith(failure);
    expect(Alert.alert).toHaveBeenCalledWith('common.error', 'business.error');
    expect(result.current.picking).toBe(false);
    await act(async () => { await result.current.pick(); });
    expect(mockLibrary).toHaveBeenCalledTimes(2);
  });

  it('permission request failure is reported without launching the camera', async () => {
    const failure = new Error('Synthetic permission failure');
    mockCameraPermission.mockRejectedValueOnce(failure);
    const { result } = renderHook(() => useBusinessMedia());
    await act(async () => { await result.current.pick(true); });
    expect(mockCaptureException).toHaveBeenCalledWith(failure);
    expect(mockCamera).not.toHaveBeenCalled();
    expect(result.current.picking).toBe(false);
  });

  it('reaction selection requests video only with a 30-second limit', async () => {
    mockLibrary.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file://synthetic.mp4', type: 'video' }] });
    const { result } = renderHook(() => useBusinessMedia(true));
    await act(async () => { await result.current.pick(); });
    expect(mockLibrary).toHaveBeenCalledWith({ mediaTypes: ['videos'], quality: 0.8, videoMaxDuration: 30 });
    expect(result.current.media).toEqual({ uri: 'file://synthetic.mp4', mediaType: 'video' });
    expect(result.current.picking).toBe(false);
  });

  it('unsupported media does not become a campaign asset', async () => {
    mockLibrary.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file://synthetic.audio', type: 'audio' }] });
    const { result } = renderHook(() => useBusinessMedia());
    await act(async () => { await result.current.pick(); });
    expect(result.current.media).toBeUndefined();
    expect(result.current.picking).toBe(false);
  });
});
