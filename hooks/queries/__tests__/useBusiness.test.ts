import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { useBusinessCampaign, useOwnerCampaignReactions, usePublicCampaignReactions, useBusinessWorkspaces } from '../useBusiness';
import { queryKeys } from '@/services/queryKeys';

let mockActor = 'actor-1';
jest.mock('@/stores/authStore', () => ({ useAuthStore: (selector: (s: { user: { id: string } | null }) => unknown) => selector({ user: mockActor ? { id: mockActor } : null }) }));
jest.mock('@/services/api/business', () => ({ getBusinessCampaign: jest.fn(), getOwnerReactions: jest.fn(), getPublicReactions: jest.fn(), getBusinessWorkspaces: jest.fn() }));
const useQueryMock = useQuery as jest.Mock;
describe('Business query boundaries', () => {
  beforeEach(() => { mockActor = 'actor-1'; jest.clearAllMocks(); });
  it('isolates the same campaign by user, workspace and campaign', () => {
    renderHook(() => useBusinessCampaign('w1', 'c1'));
    expect(useQueryMock).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.business.campaign('actor-1', 'w1', 'c1', 'detail') }));
    mockActor = 'actor-2';
    renderHook(() => useBusinessCampaign('w2', 'c1'));
    expect(useQueryMock).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: queryKeys.business.campaign('actor-2', 'w2', 'c1', 'detail') }));
  });
  it('never shares owner, selected or public reaction caches', () => {
    renderHook(() => useOwnerCampaignReactions('w', 'c', true));
    const owner = useQueryMock.mock.calls.at(-1)?.[0].queryKey;
    renderHook(() => usePublicCampaignReactions('w', true));
    expect(useQueryMock.mock.calls.at(-1)?.[0].queryKey).not.toEqual(owner);
  });
  it('disables workspace queries without an authenticated actor', () => {
    mockActor = '';
    renderHook(useBusinessWorkspaces);
    expect(useQueryMock).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
  });
});
