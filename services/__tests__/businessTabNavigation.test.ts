import { TabRouter } from '@react-navigation/routers';
import { router } from 'expo-router';
import { openBusinessGasps, openBusinessDiscovery } from '../navigation';

jest.mock('@/services/mediaCache', () => ({ cacheMedia: jest.fn() }));
jest.mock('expo-router', () => ({ router: { navigate: jest.fn(), dismissTo: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

it.each([
  ['discover', 'inbox', openBusinessGasps],
  ['inbox', 'discover', openBusinessDiscovery],
] as const)('selects the destination tab from %s', (initialRouteName, destination, open) => {
  const tabs = TabRouter({ initialRouteName });
  const options = { routeNames: ['discover', 'inbox'], routeParamList: {}, routeGetIdList: {} };
  const initial = tabs.getInitialState(options);
  // Expo maps dismissTo to POP_TO, which the tab router cannot handle.
  // @ts-expect-error Deliberately dispatch the invalid stack action used by the regression.
  expect(tabs.getStateForAction(initial, { type: 'POP_TO', payload: { name: destination } }, options)).toBeNull();
  (router.navigate as jest.Mock).mockImplementation((path: string) => {
    const next = tabs.getStateForAction(initial, { type: 'NAVIGATE', payload: { name: path.split('/').at(-1)! } }, options);
    expect(next).not.toBeNull();
    if (next && next.index !== undefined) expect(next.routes[next.index].name).toBe(destination);
  });
  open();
  expect(router.navigate).toHaveBeenCalledWith(`/(tabs)/${destination}`);
  expect(router.dismissTo).not.toHaveBeenCalled();
});

it('keeps stack dismissal for a link inside a Business modal', () => {
  openBusinessGasps(true);
  expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/inbox');
  expect(router.navigate).not.toHaveBeenCalled();
});
