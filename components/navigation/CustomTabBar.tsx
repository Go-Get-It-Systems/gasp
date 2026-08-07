import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import type { LucideIcon } from "lucide-react-native";
import {
    Camera,
    Compass,
    Inbox,
    MessageCircle,
    User,
} from "lucide-react-native";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    cancelAnimation,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ContentTypeIndicator } from "@/components/ui/ContentTypeIndicator";
import { hasUnreadChatActivity, shouldClearChatUnreadHint } from "@/components/navigation/chatUnread";
import { useConversations } from "@/hooks/queries/useChat";
import { usePendingGasps } from "@/hooks/queries/useGasps";
import { useNotificationStore } from "@/stores/notificationStore";
import { TabBarIcon } from "./TabBarIcon";

const TAB_ICONS: Record<string, LucideIcon> = {
  discover: Compass,
  camera: Camera,
  inbox: Inbox,
  chat: MessageCircle,
  profile: User,
};

const TAB_LABELS: Record<string, string> = {
  discover: "Discover",
  camera: "Camera",
  inbox: "Gasps",
  chat: "Chat",
  profile: "Profile",
};

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const { data: conversations, dataUpdatedAt: conversationsUpdatedAt } = useConversations();
  const { data: pendingGasps } = usePendingGasps();
  const inboxUnreadType = useNotificationStore((s) => s.inboxUnreadType);
  const chatHasUnreadHint = useNotificationStore((s) => s.chatHasUnread);
  const chatUnreadHintAt = useNotificationStore((s) => s.chatUnreadHintAt);
  const setChatHasUnread = useNotificationStore((s) => s.setChatHasUnread);
  const tabPulseTrigger = useNotificationStore((s) => s.tabPulseTrigger);
  const resetTabPulse = useNotificationStore((s) => s.resetTabPulse);

  const conversationsHaveUnread = conversations?.some((conversation) => conversation.unreadCount > 0) ?? false;
  const hasUnreadChats = hasUnreadChatActivity(conversations, chatHasUnreadHint);
  const hasUnreadGasps = (pendingGasps?.length ?? 0) > 0;

  const pulseScaleSv = useSharedValue(1);

  const inboxTabIndex = state.routes.findIndex((r) => r.name === "inbox");
  const isInboxFocused = state.index === inboxTabIndex;

  useEffect(() => {
    if (shouldClearChatUnreadHint({
      conversationsLoaded: conversations !== undefined,
      conversationsHaveUnread,
      hasUnreadHint: chatHasUnreadHint,
      hintCreatedAt: chatUnreadHintAt,
      conversationsUpdatedAt,
    })) {
      setChatHasUnread(false);
    }
  }, [chatHasUnreadHint, chatUnreadHintAt, conversations, conversationsHaveUnread, conversationsUpdatedAt, setChatHasUnread]);

  useEffect(() => {
    if (tabPulseTrigger > 0 && !isInboxFocused) {
      pulseScaleSv.value = withSequence(
        withRepeat(
          withSequence(
            withTiming(1.4, { duration: 250 }),
            withTiming(1.0, { duration: 250 }),
          ),
          3,
          false,
        ),
        withTiming(1.0, { duration: 0 }, () => {
          runOnJS(resetTabPulse)();
        }),
      );
    }

    return () => {
      cancelAnimation(pulseScaleSv);
    };
  }, [tabPulseTrigger, isInboxFocused, pulseScaleSv, resetTabPulse]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScaleSv.value }],
  }));

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

      <View style={styles.overlay} />

      <View style={styles.tabsRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const Icon = TAB_ICONS[route.name] ?? Compass;
          const label = TAB_LABELS[route.name] ?? options.title ?? route.name;

          const showUnreadChat = route.name === "chat" && hasUnreadChats;
          const showUnreadGasps = route.name === "inbox" && hasUnreadGasps;

          return (
            <View key={route.key} style={styles.tabWrapper}>
              {showUnreadChat ? (
                <View style={styles.unreadDotContainer}>
                  <ContentTypeIndicator type="chat" size="sm" />
                </View>
              ) : null}
              {showUnreadGasps ? (
                <Animated.View
                  style={[styles.unreadDotContainer, pulseAnimatedStyle]}
                >
                  <ContentTypeIndicator
                    type={inboxUnreadType ?? "gasp"}
                    pulsing={inboxUnreadType === "gasp"}
                    size="sm"
                  />
                </Animated.View>
              ) : null}
              <TabBarIcon
                icon={Icon}
                label={label}
                focused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 10, 15, 0.95)",
  },
  tabsRow: {
    flexDirection: "row",
    height: 60,
    alignItems: "center",
  },
  tabWrapper: {
    flex: 1,
    position: "relative",
  },
  unreadDotContainer: {
    position: "absolute",
    top: 6,
    right: "50%",
    marginRight: -18,
    zIndex: 10,
  },
});
