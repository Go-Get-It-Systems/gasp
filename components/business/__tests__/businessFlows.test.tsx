import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { CampaignCard } from '../CampaignCard';
import CampaignReact from '@/app/(modals)/campaign-react';
import CampaignViewer from '@/app/(modals)/campaign-viewer';
import { businessCampaign as mockBusinessCampaign } from '@/test-utils/businessFixtures';

const mockAction = jest.fn();
const mockSubmit = jest.fn().mockResolvedValue(undefined);
const mockDelivery = jest.fn();
const mockBack = jest.fn();
const mockUpload = jest.fn().mockResolvedValue({ downloadUrl: 'https://storage.googleapis.com/pilot/reactions/actor-1/reaction.mp4' });
let mockRecipient = false;
let mockQueryError = false;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('expo-router', () => ({ router: { back: mockBack }, useLocalSearchParams: () => ({ workspaceId: 'workspace-1', campaignId: 'campaign-1' }) }));
jest.mock('@/services/navigation', () => ({ openCampaignComposer: jest.fn(), openCampaignDashboard: jest.fn(), openCampaignViewer: jest.fn(), openCampaignReactionComposer: jest.fn() }));
jest.mock('../CampaignMedia', () => ({ CampaignMedia: () => null }));
jest.mock('../ReactionRecorder', () => ({ ReactionRecorder: () => null }));
jest.mock('@/services/uploadQueue', () => ({ uploadWithRetry: (...args: unknown[]) => mockUpload(...args) }));
jest.mock('@/hooks/useBusinessMedia', () => ({ useBusinessMedia: () => ({ media: { uri: 'file://reaction.mp4', mediaType: 'video' }, picking: false, pick: jest.fn(), setMedia: jest.fn() }) }));
jest.mock('@/hooks/queries/useBusinessMutations', () => ({
  useCampaignAction: () => ({ mutate: mockAction, isPending: false, isError: false }),
  useSubmitCampaignReaction: () => ({ mutateAsync: mockSubmit, isPending: false, isError: false }),
  useCampaignDelivery: () => ({ mutate: mockDelivery, isPending: false, isError: false }),
}));
jest.mock('@/hooks/queries/useBusiness', () => ({
  useBusinessActor: () => 'actor-1',
  usePublicCampaigns: () => ({ data: [{ ...mockBusinessCampaign, state: 'live' }], isLoading: false, isError: mockQueryError, refetch: jest.fn() }),
  useCampaignInbox: () => ({ data: mockRecipient ? [{ workspaceId: 'workspace-1', campaignId: 'campaign-1' }] : [], isError: false }),
}));

describe('Business user flows', () => {
  beforeEach(() => { jest.clearAllMocks(); mockRecipient = false; mockQueryError = false; });
  it('requires an explicit publish confirmation; cancellation never calls the backend', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const screen = render(<CampaignCard campaign={mockBusinessCampaign} owner followerCount={2} />);
    fireEvent.press(screen.getByRole('button', { name: 'business.publish' }));
    expect(mockAction).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0]?.[2];
    expect(buttons?.[0].style).toBe('cancel');
    buttons?.[1].onPress?.();
    expect(mockAction).toHaveBeenCalledWith('publish');
    alert.mockRestore();
  });
  it('does not allow editing or deleting a live campaign', () => {
    const screen = render(<CampaignCard campaign={{ ...mockBusinessCampaign, state: 'live' }} owner />);
    expect(screen.queryByRole('button', { name: 'business.editDraft' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'business.delete' })).toBeNull();
  });
  it('sends an unchecked consent as false with the retry upload path', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const screen = render(<CampaignReact />);
    expect(screen.getByLabelText('business.consent').props.value).toBe(false);
    fireEvent.press(screen.getByRole('button', { name: 'business.sendReaction' }));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith({ videoUrl: 'https://storage.googleapis.com/pilot/reactions/actor-1/reaction.mp4', consentToFeature: false }));
    expect(mockUpload).toHaveBeenCalledWith('file://reaction.mp4', 'reactions', 'actor-1');
    alert.mockRestore();
  });
  it('requires an actual opt-in interaction before sending true', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const screen = render(<CampaignReact />);
    fireEvent(screen.getByLabelText('business.consent'), 'valueChange', true);
    fireEvent.press(screen.getByRole('button', { name: 'business.sendReaction' }));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ consentToFeature: true })));
    alert.mockRestore();
  });
  it('does not upload when the campaign query is unavailable', () => {
    mockQueryError = true;
    const screen = render(<CampaignReact />);
    expect(screen.getByRole('button', { name: 'business.sendReaction' }).props.accessibilityState.disabled).toBe(true);
    expect(mockUpload).not.toHaveBeenCalled();
  });
  it('does not fabricate metrics or expose recording for a public preview', () => {
    const screen = render(<CampaignViewer />);
    expect(mockDelivery).not.toHaveBeenCalled();
    expect(screen.getByText('business.previewOnly')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'business.finishViewing' })).toBeNull();
  });
  it('records opened only for a real inbox delivery, then viewed on completion', () => {
    mockRecipient = true;
    const screen = render(<CampaignViewer />);
    expect(mockDelivery).toHaveBeenCalledWith('opened');
    fireEvent.press(screen.getByRole('button', { name: 'business.finishViewing' }));
    expect(mockDelivery).toHaveBeenCalledWith('viewed', expect.any(Object));
  });
  it('does not retry opened automatically on mutation rerenders or stale query errors', () => {
    mockRecipient = true;
    const screen = render(<CampaignViewer />);
    screen.rerender(<CampaignViewer />);
    expect(mockDelivery).toHaveBeenCalledTimes(1);
    mockQueryError = true;
    screen.rerender(<CampaignViewer />);
    expect(mockDelivery).toHaveBeenCalledTimes(1);
  });
});
