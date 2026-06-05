import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase.js";
import {
  getChatRoomId,
  getAllConversationIdsForParticipants,
} from "../utils/geo.js";
import ChatRepository from "../repositories/ChatRepository.js";

export { getChatRoomId, getAllConversationIdsForParticipants };

export default class FirebaseChatService extends ChatRepository {
  constructor(firestore = db) {
    super();
    this.firestore = firestore;
  }

  messagesCollection(roomId) {
    return collection(this.firestore, "chats", roomId, "messages");
  }

  legacyMessagesCollection() {
    return collection(this.firestore, "chatMessages");
  }

  chatPartnersCollection(userId) {
    return collection(this.firestore, "users", userId, "chatPartners");
  }

  sortMessages(messages) {
    return [...messages].sort(
      (a, b) => (a.timestampMillis || 0) - (b.timestampMillis || 0)
    );
  }

  dedupeMessages(messages) {
    const byKey = new Map();
    for (const message of messages) {
      const key = `${message.senderId}|${message.text}|${message.timestampMillis}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, message);
        continue;
      }
      if (existing._source === "legacy" && message._source !== "legacy") {
        byKey.set(key, message);
      }
    }
    return [...byKey.values()].map(({ _source, ...message }) => message);
  }

  resolveConversationIds({ participantIds, roomId }) {
    const ids = [...new Set(participantIds || [])].filter(Boolean);
    if (ids.length >= 2) {
      return getAllConversationIdsForParticipants(ids[0], ids[1]);
    }
    return roomId ? [roomId] : [];
  }

  async syncChatPartnerEntries({
    participantIds,
    participantNames = {},
    preview = "",
    millis = Date.now(),
    senderId = "",
  }) {
    const participants = [...new Set(participantIds || [])].filter(Boolean);
    if (participants.length < 2) return;

    const [userA, userB] = participants;
    const sortedParticipants = [...participants].sort();
    const writes = [
      [userA, userB],
      [userB, userA],
    ].map(([ownerId, partnerId]) =>
      setDoc(
        doc(this.firestore, "users", ownerId, "chatPartners", partnerId),
        {
          partnerId,
          partnerName: participantNames[partnerId] || "User",
          participantIds: sortedParticipants,
          roomId: getChatRoomId(userA, userB),
          lastMessageText: preview,
          lastMessageSenderId: senderId,
          lastMessageMillis: millis,
          updatedAtMillis: millis,
        },
        { merge: true }
      )
    );

    await Promise.all(writes);
  }

  async ensureChatRoom(roomId, participantIds, participantNames = {}) {
    const participants = [...new Set(participantIds)].sort();
    const names = Object.fromEntries(
      Object.entries(participantNames).filter(([, name]) => String(name || "").trim())
    );
    const roomRef = doc(this.firestore, "chats", roomId);
    const now = Date.now();

    await setDoc(
      roomRef,
      {
        participants,
        participantNames: names,
        lastActiveMillis: now,
        lastActive: now,
      },
      { merge: true }
    );
  }

  async ensureChatRooms(roomIds, participantIds, participantNames = {}) {
    await Promise.all(
      roomIds.map((roomId) =>
        this.ensureChatRoom(roomId, participantIds, participantNames)
      )
    );
    await this.syncChatPartnerEntries({
      participantIds,
      participantNames,
      preview: "",
      millis: Date.now(),
    });
  }

  async sendConversationMessage({
    roomId,
    conversationId,
    senderId,
    text,
    participantIds,
    participantNames = {},
    driverId,
    mechanicId,
  }) {
    const trimmed = String(text || "").trim();
    if (!senderId || !trimmed) {
      throw new Error("Invalid message");
    }

    const resolvedParticipants =
      participantIds?.length >= 2
        ? participantIds
        : driverId && mechanicId
          ? [driverId, mechanicId]
          : [];

    const conversationIds = this.resolveConversationIds({
      participantIds: resolvedParticipants,
      roomId: roomId || conversationId,
    });
    if (!conversationIds.length) {
      throw new Error("Invalid message");
    }

    const now = Date.now();
    const sortedParticipants = [...new Set(resolvedParticipants)].sort();
    const messagePayload = {
      senderId,
      text: trimmed,
      timestampMillis: now,
      read: false,
      participantIds: sortedParticipants,
    };
    const parentUpdate = {
      participants: sortedParticipants,
      lastActiveMillis: now,
      lastActive: now,
      lastMessageText: trimmed,
      lastMessageSenderId: senderId,
      lastMessageMillis: now,
    };

    const roomResults = await Promise.allSettled(
      conversationIds.map(async (chatRoomId) => {
        await addDoc(this.messagesCollection(chatRoomId), messagePayload);
        await setDoc(doc(this.firestore, "chats", chatRoomId), parentUpdate, {
          merge: true,
        });
      })
    );

    const legacyResults = await Promise.allSettled(
      conversationIds.map((conversationIdValue) =>
        addDoc(this.legacyMessagesCollection(), {
          ...messagePayload,
          conversationId: conversationIdValue,
        })
      )
    );

    const hadRoomWrite = roomResults.some((result) => result.status === "fulfilled");
    const hadLegacyWrite = legacyResults.some((result) => result.status === "fulfilled");
    if (!hadRoomWrite && !hadLegacyWrite) {
      const firstError =
        roomResults.find((result) => result.status === "rejected")?.reason ||
        legacyResults.find((result) => result.status === "rejected")?.reason;
      throw firstError || new Error("Failed to send message");
    }

    await this.syncChatPartnerEntries({
      participantIds: sortedParticipants,
      participantNames,
      preview: trimmed,
      millis: now,
      senderId,
    });

    return { success: true };
  }

  async sendMessage(chatMessage) {
    return this.sendConversationMessage({
      roomId: chatMessage.conversationId || chatMessage.roomId,
      senderId: chatMessage.senderId,
      text: chatMessage.text,
      participantIds: chatMessage.participantIds,
      participantNames: chatMessage.participantNames,
      driverId: chatMessage.driverId,
      mechanicId: chatMessage.mechanicId,
    });
  }

  async sendMessageToJob(jobId, senderId, text) {
    try {
      await addDoc(collection(this.firestore, "jobs", jobId, "messages"), {
        senderId,
        text,
        timestampMillis: Date.now(),
        read: false,
      });
    } catch (error) {
      throw new Error("Failed to send message");
    }
  }

  async setTypingStatus({
    roomId,
    roomIds,
    userId,
    isTyping,
    participantIds = [],
  }) {
    if (!userId) return;

    const targetRoomIds = [
      ...new Set([...(roomIds || []), roomId].filter(Boolean)),
    ];
    if (!targetRoomIds.length) return;

    const now = Date.now();
    const participants = [...new Set(participantIds)].filter(Boolean).sort();
    const payload = {
      [`typingStatus.${userId}`]: Boolean(isTyping),
      lastActiveMillis: now,
      lastActive: now,
    };
    if (participants.length >= 2) {
      payload.participants = participants;
    }

    await Promise.allSettled(
      targetRoomIds.map((chatRoomId) =>
        setDoc(doc(this.firestore, "chats", chatRoomId), payload, { merge: true })
      )
    );
  }

  async markMessagesAsRead(roomId, readerId, messages) {
    if (!roomId || !readerId || !Array.isArray(messages)) return;

    const unread = messages.filter(
      (message) =>
        message.id &&
        !String(message.id).startsWith("pending_") &&
        message.senderId !== readerId &&
        message.read !== true
    );

    await Promise.all(
      unread.map((message) =>
        updateDoc(doc(this.firestore, "chats", roomId, "messages", message.id), {
          read: true,
        })
      )
    );
  }

  async getChatMessages(roomIdOrConversationId) {
    const snapshot = await getDocs(this.messagesCollection(roomIdOrConversationId));
    return this.sortMessages(
      snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
    );
  }

  listenForMessages(roomId, onMessages, onError) {
    return this.listenForMessagesMerged(
      { roomIds: [roomId], conversationIds: [roomId] },
      onMessages,
      onError
    );
  }

  listenForMessagesMerged(
    { roomIds, conversationIds, participantIds },
    onMessages,
    onError
  ) {
    const roomIdList = [...new Set((roomIds || []).filter(Boolean))];
    const conversationIdList = [
      ...new Set((conversationIds || roomIdList).filter(Boolean)),
    ];
    const participantIdList = [...new Set((participantIds || []).filter(Boolean))];
    const participantKey =
      participantIdList.length >= 2
        ? [...participantIdList].sort().join("|")
        : "";
    const subcollectionByRoom = new Map();
    const legacyByConversation = new Map();
    let legacyByParticipants = [];

    const emit = () => {
      const subcollectionMessages = [...subcollectionByRoom.values()].flat();
      const legacyMessages = [
        ...legacyByConversation.values(),
        legacyByParticipants,
      ].flat();
      onMessages(this.sortMessages(this.dedupeMessages([...subcollectionMessages, ...legacyMessages])));
    };

    const reportError = (error) => {
      console.error("Chat listener error:", error);
      if (onError) onError(error);
    };

    const unsubs = roomIdList.map((roomId) =>
      onSnapshot(
        query(this.messagesCollection(roomId)),
        (snapshot) => {
          subcollectionByRoom.set(
            roomId,
            snapshot.docs.map((entry) => ({
              id: entry.id,
              ...entry.data(),
              _source: "subcollection",
            }))
          );
          emit();
        },
        reportError
      )
    );

    conversationIdList.forEach((conversationId) => {
      unsubs.push(
        onSnapshot(
          query(
            this.legacyMessagesCollection(),
            where("conversationId", "==", conversationId)
          ),
          (snapshot) => {
            legacyByConversation.set(
              conversationId,
              snapshot.docs.map((entry) => ({
                id: entry.id,
                ...entry.data(),
                _source: "legacy",
              }))
            );
            emit();
          },
          reportError
        )
      );
    });

    if (participantIdList.length >= 2) {
      participantIdList.forEach((participantId) => {
        unsubs.push(
          onSnapshot(
            query(
              this.legacyMessagesCollection(),
              where("participantIds", "array-contains", participantId)
            ),
            (snapshot) => {
              legacyByParticipants = snapshot.docs
                .map((entry) => ({ id: entry.id, ...entry.data(), _source: "legacy" }))
                .filter((message) => {
                  const ids = [...new Set(message.participantIds || [])].sort();
                  return ids.join("|") === participantKey;
                });
              emit();
            },
            reportError
          )
        );
      });
    }

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }

  listenToMessages(roomIdOrConversationId, onUpdate, onError) {
    return this.listenForMessages(
      roomIdOrConversationId,
      (messages) => {
        onUpdate({
          docs: messages.map((message) => ({
            id: message.id,
            data: () => message,
          })),
        });
      },
      onError
    );
  }

  mergeTypingStatus(roomDataById) {
    const typingStatus = {};
    for (const roomData of roomDataById.values()) {
      const statusMap = roomData?.typingStatus;
      if (!statusMap || typeof statusMap !== "object") continue;
      Object.entries(statusMap).forEach(([uid, value]) => {
        const isTyping =
          value === true ||
          value === 1 ||
          (typeof value === "string" && value.toLowerCase() === "true");
        if (isTyping) {
          typingStatus[uid] = true;
        } else if (!(uid in typingStatus)) {
          typingStatus[uid] = false;
        }
      });
    }
    return { typingStatus };
  }

  listenToChatRoom(roomId, onRoomUpdate, onError) {
    return this.listenToChatRoomsMerged([roomId], onRoomUpdate, onError);
  }

  listenToChatRoomsMerged(roomIds, onRoomUpdate, onError) {
    const roomIdList = [...new Set((roomIds || []).filter(Boolean))];
    const roomDataById = new Map();

    const emit = () => {
      onRoomUpdate(this.mergeTypingStatus(roomDataById));
    };

    const reportError = (error) => {
      console.error("Chat room listener error:", error);
      if (onError) onError(error);
    };

    const unsubs = roomIdList.map((roomId) =>
      onSnapshot(
        doc(this.firestore, "chats", roomId),
        (snapshot) => {
          roomDataById.set(roomId, snapshot.exists() ? snapshot.data() : null);
          emit();
        },
        reportError
      )
    );

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }

  listenToUserChatPartners(userId, onPartners, onError) {
    return onSnapshot(
      this.chatPartnersCollection(userId),
      (snapshot) => {
        const partners = snapshot.docs
          .map((entry) => ({ id: entry.id, ...entry.data() }))
          .sort(
            (a, b) =>
              (b.lastMessageMillis || b.updatedAtMillis || 0) -
              (a.lastMessageMillis || a.updatedAtMillis || 0)
          );
        onPartners(partners);
      },
      onError
    );
  }

  listenToUserChatRooms(userId, onRooms, onError) {
    const q = query(
      collection(this.firestore, "chats"),
      where("participants", "array-contains", userId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const rooms = snapshot.docs
          .map((entry) => ({ id: entry.id, ...entry.data() }))
          .sort(
            (a, b) =>
              (b.lastActiveMillis || b.lastActive || b.lastMessageMillis || 0) -
              (a.lastActiveMillis || a.lastActive || a.lastMessageMillis || 0)
          );
        onRooms(rooms);
      },
      onError
    );
  }
}
