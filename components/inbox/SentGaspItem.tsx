import { DeliveryStatusLabel } from "@/components/gasp/DeliveryStatusLabel";
import { Text } from "@/components/ui/Text";
import { colors } from "@/constants/colors";
import type { Gasp } from "@/services/api/schemas/gasp.schema";
import { formatRelativeTime } from "@/utils/format";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

interface SentGaspItemProps {
  gasp: Gasp;
  onPress?: (gasp: Gasp) => void;
}

export function SentGaspItem({ gasp, onPress }: SentGaspItemProps) {
  const rawTime = formatRelativeTime(gasp.createdAt);
  const timeLabel =
    rawTime === "JUST NOW" ? "just now" : `${rawTime.toLowerCase()} ago`;

  return (
    <Pressable
      onPress={() => onPress?.(gasp)}
      style={styles.container}
      accessibilityLabel={`Sent gasp, status ${gasp.deliveryStatus ?? "sent"}`}
      accessibilityRole="button"
    >
      <View style={styles.thumbnailColumn}>
        <Image
          source={{ uri: gasp.imageUri }}
          placeholder={gasp.blurhash ? { blurhash: gasp.blurhash } : undefined}
          style={styles.thumbnail}
          contentFit="cover"
        />
        <DeliveryStatusLabel status={gasp.deliveryStatus} />
      </View>
      <View style={styles.textContainer}>
        <Text variant="caption" style={styles.time}>
          {timeLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  thumbnailColumn: {
    alignItems: "center",
  },
  thumbnail: {
    width: 56,
    height: 72,
    borderRadius: 10,
    borderCurve: "continuous",
    backgroundColor: colors.surface,
  },
  textContainer: {
    marginTop: 2,
    alignItems: "center",
  },
  time: {
    fontSize: 10,
    color: colors.textTertiary,
  },
});
