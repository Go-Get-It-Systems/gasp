import { memo } from 'react';
import { BubbleWrapper } from './BubbleWrapper';
import { TextBubble } from './TextBubble';
import { GaspBubble } from './GaspBubble';
import { ReactionBubble } from './ReactionBubble';
import type { Message } from '@/services/api/schemas/chat.schema';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  isSequential: boolean;
  isHighlighted?: boolean;
  replyToMessage?: Message | null;
  otherParticipantName?: string;
  onLongPress?: () => void;
}

function MessageBubbleInner({
  message,
  isOwnMessage,
  isSequential,
  isHighlighted,
  replyToMessage,
  otherParticipantName,
  onLongPress,
}: MessageBubbleProps) {
  return (
    <BubbleWrapper
      isOwnMessage={isOwnMessage}
      isSequential={isSequential}
      isHighlighted={isHighlighted}
      createdAt={message.createdAt}
      onLongPress={onLongPress}
    >
      {message.type === 'text' && (
        <TextBubble content={message.content} isOwnMessage={isOwnMessage} />
      )}
      {(message.type === 'gasp' || message.type === 'image') && (
        <GaspBubble
          message={message}
          isOwnMessage={isOwnMessage}
          otherParticipantName={otherParticipantName}
        />
      )}
      {message.type === 'reaction' && (
        <ReactionBubble
          message={message}
          isOwnMessage={isOwnMessage}
          replyToMessage={replyToMessage}
          otherParticipantName={otherParticipantName}
        />
      )}
    </BubbleWrapper>
  );
}

export const MessageBubble = memo(MessageBubbleInner, (prev, next) =>
  prev.message.id === next.message.id
  && prev.isOwnMessage === next.isOwnMessage
  && prev.isSequential === next.isSequential
  && prev.isHighlighted === next.isHighlighted
  && prev.replyToMessage?.id === next.replyToMessage?.id
  && prev.onLongPress === next.onLongPress
);
