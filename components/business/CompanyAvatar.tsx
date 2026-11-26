import { useState } from 'react';
import { View, type ImageStyle, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/Text';
import { resolveCompanyLogoUrl } from '@/utils/companyLogoUrl';

export function CompanyAvatar({ uri, name, initials, size, imageStyle, fallbackStyle, textStyle }: {
  uri: string | null; name: string; initials: string; size: number;
  imageStyle?: StyleProp<ImageStyle>; fallbackStyle?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle>;
}) {
  const source = resolveCompanyLogoUrl(uri);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const shape = { width: size, height: size, borderRadius: size / 2 };
  const logoBackground = source?.startsWith('https://www.google.com/s2/favicons?') ? { backgroundColor: '#FFFFFF' } : undefined;
  return source && failedSource !== source ? <Image source={{ uri: source }} style={[shape, logoBackground, imageStyle]}
    contentFit="cover" transition={200} onError={() => setFailedSource(source)}
    accessibilityRole="image" accessibilityLabel={name} />
    : <View style={[shape, { alignItems: 'center', justifyContent: 'center' }, fallbackStyle]}
      accessibilityRole="image" accessibilityLabel={name}><Text style={textStyle}>{initials}</Text></View>;
}
