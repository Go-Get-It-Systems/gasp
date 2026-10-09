import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

import '@/lib/i18n';
import { ActivityCard } from '@/components/profile/ActivityCard';

describe('ActivityCard streak', () => {
  it('uses the singular for a one-day streak', () => {
    const { getByText } = render(<ActivityCard streak={1} reactionsReceived={0} memberSince="" />);
    expect(getByText('1 day')).toBeTruthy();
  });

  it('uses the plural for longer streaks', () => {
    const { getByText } = render(<ActivityCard streak={3} reactionsReceived={0} memberSince="" />);
    expect(getByText('3 days')).toBeTruthy();
  });

  it('invites the user to start when there is no streak', () => {
    const { getByText } = render(<ActivityCard streak={0} reactionsReceived={0} memberSince="" />);
    expect(getByText('Start today!')).toBeTruthy();
  });
});
