import { fireEvent, render } from '@testing-library/react-native';
import { Modal } from 'react-native';
import { router } from 'expo-router';
import CampaignReactionFullScreen from '@/app/(modals)/campaign-reaction-full';

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({
    reactionVideoUri: 'https://example.test/reaction.mp4',
    campaignMediaUri: 'https://example.test/campaign.mp4',
    isVideo: 'true', reactorName: 'Bi', campaignTitle: 'Studio test',
  }),
}));
jest.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: undefined, isLoading: false }) }));
jest.mock('@/hooks/queries/useBusiness', () => ({ useBusinessActor: () => 'owner' }));
jest.mock('@/services/api/business', () => ({ getCampaignsByHandle: jest.fn() }));
jest.mock('@/components/gasp/ReactionComposite', () => ({ ReactionComposite: 'ReactionComposite' }));
jest.mock('@/components/ui/InlineVideo', () => ({ InlineVideo: 'InlineVideo' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

it('uses the route presentation and closes through navigation without a second native modal', () => {
  const screen = render(<CampaignReactionFullScreen />);
  expect(screen.getByText('Studio test')).toBeTruthy();
  expect(screen.getByText('Bi')).toBeTruthy();
  expect(screen.UNSAFE_queryAllByType(Modal)).toHaveLength(0);
  fireEvent.press(screen.getByRole('button', { name: 'reaction.closeReactionView' }));
  expect(router.back).toHaveBeenCalledTimes(1);
});
