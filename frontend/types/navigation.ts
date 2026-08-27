export type RootStackParamList = {
  '(auth)': undefined;
  '(tabs)': undefined;
  '(modals)': undefined;
};

export type AuthStackParamList = {
  welcome: undefined;
  'phone-login': undefined;
  'verify-code': { phoneNumber: string };
  'create-profile': undefined;
};

export type TabParamList = {
  discover: undefined;
  camera: undefined;
  inbox: undefined;
  chat: undefined;
  profile: undefined;
};

export type ModalParamList = {
  'view-gasp': {
    gaspId?: string;
    // "From chat" mode — uses these instead of pendingGasps store
    chatImageUri?: string;
    chatSenderName?: string;
    chatConversationId?: string;
    chatMessageId?: string;
  };
  'reaction-result': {
    reactionVideoUri: string;
    originalImageUri: string;
    senderName: string;
    gaspId: string;
  };
  'send-gasp': { imageUri: string };
  'camera-preview': { imageUri: string };
  'friend-profile': { friendId: string };
  settings: undefined;
  'edit-profile': undefined;
};
