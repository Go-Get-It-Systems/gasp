import * as SecureStore from 'expo-secure-store';
import { setAuthToken, removeAuthToken } from '../storage';
test('F07: delayed token persistence completes before logout deletion', async () => {
  let finish!: () => void;
  const order: string[] = [];
  (SecureStore.setItemAsync as jest.Mock).mockImplementationOnce(() => new Promise<void>(resolve => { finish = () => { order.push('write'); resolve(); }; }));
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementationOnce(async () => { order.push('delete'); });
  const writing = setAuthToken('synthetic');
  const removing = removeAuthToken();
  for (let i = 0; i < 8; i++) await Promise.resolve();
  expect(order).toEqual([]); finish(); await Promise.all([writing, removing]);
  expect(order).toEqual(['write', 'delete']);
});
