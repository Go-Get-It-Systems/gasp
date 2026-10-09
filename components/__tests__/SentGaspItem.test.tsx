import { render } from '@testing-library/react-native';
import React from 'react';
import { SentGaspItem } from '@/components/inbox/SentGaspItem';
import type { Gasp } from '@/services/api/schemas/gasp.schema';

jest.mock('expo-image', () => ({ Image: 'Image' }));

const gasp = (overrides: Partial<Gasp>) => ({
  id: 'g1', imageUri: 'https://cdn/gasps/a.jpg', mediaType: 'image', createdAt: new Date().toISOString(),
  deliveryStatus: 'sent', ...overrides,
}) as Gasp;

describe('SentGaspItem thumbnail', () => {
  it('draws photos with the image itself', () => {
    const { UNSAFE_getAllByType } = render(<SentGaspItem gasp={gasp({})} />);
    expect(UNSAFE_getAllByType('Image' as never)[0].props.source).toEqual({ uri: 'https://cdn/gasps/a.jpg' });
  });

  it('never hands a video file to the image component', () => {
    const { UNSAFE_queryAllByType } = render(<SentGaspItem gasp={gasp({ mediaType: 'video', imageUri: 'https://cdn/gasps/v.mp4' })} />);
    expect(UNSAFE_queryAllByType('Image' as never).some((node) => node.props.source)).toBe(false);
  });
});
