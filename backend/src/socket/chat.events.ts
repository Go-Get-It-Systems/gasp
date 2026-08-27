interface RoomEmitter {
  emit(event: string, payload: unknown): unknown;
}

export interface ChatEventServer {
  to(room: string): RoomEmitter;
}

export interface ChatMessageEvent<TMessage> {
  conversationId: string;
  message: TMessage;
  actorName?: string;
  actorAvatarUrl?: string;
}

/**
 * Delivers persisted chat activity through each participant's durable personal
 * room. Conversation rooms remain available for ephemeral typing and read
 * events, but cannot guarantee delivery after a client reconnects.
 */
export function emitChatEventsToParticipants<TMessage>(
  io: ChatEventServer,
  participantIds: readonly string[],
  event: ChatMessageEvent<TMessage>,
) {
  for (const participantId of new Set(participantIds)) {
    const room = io.to(`user:${participantId}`);
    room.emit('chat:new_message', event);
    room.emit('chat:conversation_updated', {
      conversationId: event.conversationId,
      lastMessage: event.message,
    });
  }
}
