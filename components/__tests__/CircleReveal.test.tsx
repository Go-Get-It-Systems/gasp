import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { CircleReveal } from '@/components/gasp/CircleReveal';

// The Reanimated mock does not ship useReducedMotion.
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return { ...Reanimated, useReducedMotion: () => false };
});

const shared = (v: number) => ({ value: v, get: () => v, set: jest.fn() });

describe('CircleReveal', () => {
  it('renders its content inside the reveal window', () => {
    const { getByText } = render(
      <CircleReveal progress={shared(0) as never} originX={shared(100) as never}
        originY={shared(600) as never} startRadius={80}>
        <Text>gasp media</Text>
      </CircleReveal>,
    );

    expect(getByText('gasp media')).toBeTruthy();
  });
});
