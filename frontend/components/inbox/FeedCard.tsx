import { CountdownRing } from "@/components/inbox/CountdownRing";
import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";
import { colors } from "@/constants/colors";
import { getCachedUri } from "@/services/mediaCache";
import { formatRelativeTime } from "@/utils/format";
import { Image } from "expo-image";
import { Eye } from "lucide-react-native";
import { Dimensions, StyleSheet, View } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_HORIZONTAL_PADDING = 20;
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_PADDING * 2;
const CARD_HEIGHT = CARD_WIDTH * 1.15;

interface FeedCardProps {
  senderName: string;
  senderAvatarUrl?: string | null;
  imageUri: string;
  blurhash?: string;
  createdAt: string;
  expiresAt: string;
}

export function FeedCard({
  senderName,
  senderAvatarUrl,
  imageUri,
  blurhash,
  createdAt,
  expiresAt,
}: FeedCardProps) {
  const resolvedUri = getCachedUri(imageUri) ?? imageUri;
  const rawTime = formatRelativeTime(createdAt);
  const timeLabel =
    rawTime === "JUST NOW" ? "just now" : `${rawTime.toLowerCase()} ago`;

  return (
    <View
      style={styles.cardWrapper}
      accessibilityLabel={`Gasp from ${senderName}`}
    >
      {/* Purple glow border */}
      <View style={styles.glowBorder}>
        <View style={styles.card}>
          {/* Blurred background image */}
          <Image
            source={{ uri: resolvedUri }}
            placeholder={blurhash ? { blurhash } : undefined}
            style={styles.blurredImage}
            contentFit="cover"
            blurRadius={80}
          />

          {/* Dark overlay for readability */}
          <View style={styles.overlay} />

          {/* Sender info (top-left) with avatar wrapped in CountdownRing */}
          <View style={styles.senderInfo}>
            <CountdownRing
              createdAt={createdAt}
              expiresAt={expiresAt}
              size={40}
              strokeWidth={2.5}
            >
              <Avatar
                uri={senderAvatarUrl ?? null}
                size={33}
                initials={senderName?.slice(0, 1) ?? '?'}
              />
            </CountdownRing>
            <View style={styles.senderTextContainer}>
              <Text variant="body" weight="700" style={styles.senderName}>
                {senderName}
              </Text>
              <Text variant="caption" style={styles.timestamp}>
                {timeLabel}
              </Text>
            </View>
          </View>

          {/* Hold button (center-bottom) */}
          <View style={styles.holdButtonContainer}>
            <View style={styles.holdButton}>
              <Eye size={22} color="#FFFFFF" />
            </View>
            <Text variant="caption" weight="600" style={styles.holdLabel}>
              TAP
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
    marginBottom: 16,
  },
  glowBorder: {
    borderRadius: 20,
    borderCurve: "continuous",
    padding: 2,
    backgroundColor: "transparent",
    // Purple glow effect via shadow
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: "rgba(124, 58, 237, 0.5)",
  },
  card: {
    width: "100%",
    height: CARD_HEIGHT,
    borderRadius: 18,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  blurredImage: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  senderInfo: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  senderTextContainer: {
    flexDirection: "column",
    justifyContent: "center",
  },
  senderName: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  timestamp: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
  },
  holdButtonContainer: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    alignItems: "center",
    gap: 6,
  },
  holdButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(124, 58, 237, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    // Inner glow
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 6,
  },
  holdLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    letterSpacing: 2,
  },
});
