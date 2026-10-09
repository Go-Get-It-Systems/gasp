import { DeliveryStatusLabel } from "@/components/gasp/DeliveryStatusLabel";
import { Text } from "@/components/ui/Text";
import { colors } from "@/constants/colors";
import type { Gasp } from "@/services/api/schemas/gasp.schema";
import { formatRelativeTime } from "@/utils/format";
import { Image } from "expo-image";
import { ImageOff, Play } from "lucide-react-native";
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
        {/* expo-image cannot draw a video file, and expired media is cleared,
            so both get an explicit placeholder instead of a blank tile. */}
        {gasp.mediaType === "video" || !gasp.imageUri ? (
          <View style={[styles.thumbnail, styles.placeholder]}>
            {gasp.blurhash ? (
              <Image placeholder={{ blurhash: gasp.blurhash }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : null}
            {gasp.imageUri ? (
              <Play size={20} color={colors.textPrimary} fill={colors.textPrimary} />
            ) : (
              <ImageOff size={18} color={colors.textTertiary} />
            )}
          </View>
        ) : (
          <Image
            source={{ uri: gasp.imageUri }}
            placeholder={gasp.blurhash ? { blurhash: gasp.blurhash } : undefined}
            style={styles.thumbnail}
            contentFit="cover"
          />
        )}
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
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
