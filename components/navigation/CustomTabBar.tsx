import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import type { LucideIcon } from "lucide-react-native";
import {
    BriefcaseBusiness,
    Camera,
    Compass,
    Inbox,
    MessageCircle,
    User
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

import { hasUnreadChatActivity, shouldClearChatUnreadHint } from "@/components/navigation/chatUnread";
import { ContentTypeIndicator } from "@/components/ui/ContentTypeIndicator";
import { useConversations } from "@/hooks/queries/useChat";
import { usePendingGasps } from "@/hooks/queries/useGasps";
import { useAuthStore } from "@/stores/authStore";
import { useCameraStore } from "@/stores/cameraStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { TabBarIcon } from "./TabBarIcon";

// ─── Tab configuration ────────────────────────────────────────────────────────
// personal accounts: chat shown, metrics hidden
// business accounts: metrics shown, chat hidden
// Filtering is applied in the render loop below.

const TAB_ICONS: Record<string, LucideIcon> = {
  discover: Compass,
  camera: Camera,
  inbox: Inbox,
  chat: MessageCircle,
  studio: BriefcaseBusiness,
  profile: User,
};

const TAB_LABELS: Record<string, string> = {
  discover: "Discover",
  camera: "Camera",
  inbox: "Gasps",
  chat: "Chat",
  studio: "Studio",
  profile: "Profile",
};

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const isBusiness = useAuthStore((s) => s.user?.accountType === 'business');
  const isCampaignMode = useCameraStore((s) => s.campaignMode);
  const isReactionMode = useCameraStore((s) => !!s.reactionTarget);
  const setCampaignMode = useCameraStore((s) => s.setCampaignMode);

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

  // Reset campaign/reaction mode if stuck on non-camera route (after all hooks)
  const currentRouteName = state.routes[state.index]?.name;
  useEffect(() => {
    if (currentRouteName !== 'camera') {
      if (isCampaignMode) setCampaignMode(false);
      if (isReactionMode) useCameraStore.getState().setReactionTarget(null);
    }
  }, [isCampaignMode, isReactionMode, currentRouteName, setCampaignMode]);

  // Hide the tab bar when camera is in campaign or reaction mode
  if (isCampaignMode || isReactionMode) return null;

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

          // ── Visibility filter ────────────────────────────────────────────
          // personal accounts: hide the studio tab
          // business accounts: hide the chat tab
          if (!isBusiness && route.name === 'studio') return null;
          if (isBusiness && route.name === 'chat') return null;

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const handlePress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
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
                onPress={handlePress}
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
