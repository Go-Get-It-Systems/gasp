import { ChatViewToggle } from '@/components/chat/ChatViewToggle';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'chat.inbox.chats': 'Chats',
      'chat.inbox.friends': 'Friends',
    })[key] ?? key,
  }),
}));

describe('ChatViewToggle', () => {
  it('announces the selected Chats tab and switches to Friends', () => {
    const onChange = jest.fn();
    const { getByRole } = render(<ChatViewToggle value="chats" onChange={onChange} />);

    expect(getByRole('tab', { name: 'Chats' }).props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(getByRole('tab', { name: 'Friends' }));
    expect(onChange).toHaveBeenCalledWith('friends');
  });
});
