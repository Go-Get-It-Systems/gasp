import { Text } from "@/components/ui/Text";
import { colors } from "@/constants/colors";
import { formatDeliveryStatus } from "@/services/notificationHelpers";
import { StyleSheet } from "react-native";

interface DeliveryStatusLabelProps {
  status: "sent" | "delivered" | "opened" | undefined;
}

const STATUS_COLORS: Record<string, string> = {
  Sent: colors.textTertiary,
  Delivered: colors.textSecondary,
  Opened: "#06B6D4",
};

/**
 * Renders a subtle text label beneath the sent gasp thumbnail
 * showing delivery status. No badge or overlay that obscures content.
 * Satisfies Requirement 6.4.
 */
export function DeliveryStatusLabel({ status }: DeliveryStatusLabelProps) {
  const label = formatDeliveryStatus(status);
  const color = STATUS_COLORS[label] ?? colors.textTertiary;

  return (
    <Text variant="caption" color={color} style={styles.label}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 14,
  },
});
