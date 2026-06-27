import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase.js";
import {
  getChatRoomId,
  getAllConversationIdsForParticipants,
} from "../utils/geo.js";
import ChatRepository from "../repositories/ChatRepository.js";
import { MAX_CHAT_MESSAGE_LENGTH } from "../appConfig.js";

function validateJobMessageText(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    throw new Error("Message cannot be empty.");
  }
  if (trimmed.length > MAX_CHAT_MESSAGE_LENGTH) {
    throw new Error(`Message must be ${MAX_CHAT_MESSAGE_LENGTH} characters or fewer.`);
  }
  return trimmed;
}

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
    const trimmedPreview = String(preview || "").trim();
    const writes = [
      [userA, userB],
      [userB, userA],
    ].map(([ownerId, partnerId]) => {
      const payload = {
        partnerId,
        partnerName: participantNames[partnerId] || "User",
        participantIds: sortedParticipants,
        roomId: getChatRoomId(userA, userB),
        updatedAtMillis: millis,
      };
      if (trimmedPreview) {
        payload.lastMessageText = trimmedPreview;
        payload.lastMessageSenderId = senderId;
        payload.lastMessageMillis = millis;
      }
      return setDoc(
        doc(this.firestore, "users", ownerId, "chatPartners", partnerId),
        payload,
        { merge: true }
      );
    });

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
    if (trimmed.length > MAX_CHAT_MESSAGE_LENGTH) {
      throw new Error("Message is too long");
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
      const trimmed = validateJobMessageText(text);
      await addDoc(collection(this.firestore, "jobs", jobId, "messages"), {
        senderId,
        text: trimmed,
        timestampMillis: Date.now(),
        read: false,
      });
    } catch (error) {
      throw new Error("Failed to send message");
    }
  }

  async syncPartnerTypingInbox({ participantIds, userId, isTyping, millis }) {
    const participants = [...new Set(participantIds || [])].filter(Boolean);
    if (participants.length < 2 || !userId) return;

    const partnerId = participants.find((id) => id !== userId);
    if (!partnerId) return;

    await setDoc(
      doc(this.firestore, "users", partnerId, "chatPartners", userId),
      {
        partnerId: userId,
        partnerIsTyping: Boolean(isTyping),
        partnerTypingAtMillis: millis,
      },
      { merge: true }
    );
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

    const roomResults = await Promise.allSettled(
      targetRoomIds.map((chatRoomId) =>
        setDoc(doc(this.firestore, "chats", chatRoomId), payload, { merge: true })
      )
    );

    const inboxResult = await Promise.allSettled([
      this.syncPartnerTypingInbox({
        participantIds: participants,
        userId,
        isTyping,
        millis: now,
      }),
    ]);

    const hadRoomWrite = roomResults.some((result) => result.status === "fulfilled");
    const hadInboxWrite = inboxResult.some((result) => result.status === "fulfilled");
    if (!hadRoomWrite && !hadInboxWrite) {
      const firstError =
        roomResults.find((result) => result.status === "rejected")?.reason ||
        inboxResult.find((result) => result.status === "rejected")?.reason;
      throw firstError || new Error("Failed to update typing status");
    }
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

  async fetchRecentMessagesForRoom(roomId, maxResults = 25) {
    if (!roomId) return [];
    try {
      const snapshot = await getDocs(
        query(
          this.messagesCollection(roomId),
          orderBy("timestampMillis", "desc"),
          limit(maxResults)
        )
      );
      return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    } catch (error) {
      const snapshot = await getDocs(this.messagesCollection(roomId));
      return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    }
  }

  async fetchRecentLegacyMessages({ conversationId, participantIds }) {
    const messages = [];
    if (conversationId) {
      try {
        const snapshot = await getDocs(
          query(
            this.legacyMessagesCollection(),
            where("conversationId", "==", conversationId),
            orderBy("timestampMillis", "desc"),
            limit(25)
          )
        );
        messages.push(...snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
      } catch (error) {
        const snapshot = await getDocs(
          query(
            this.legacyMessagesCollection(),
            where("conversationId", "==", conversationId)
          )
        );
        messages.push(...snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
      }
    }

    const ids = [...new Set(participantIds || [])].filter(Boolean);
    if (ids.length >= 2) {
      const participantKey = [...ids].sort().join("|");
      try {
        const snapshot = await getDocs(
          query(
            this.legacyMessagesCollection(),
            where("participantIds", "array-contains", ids[0]),
            orderBy("timestampMillis", "desc"),
            limit(50)
          )
        );
        snapshot.docs.forEach((entry) => {
          const message = { id: entry.id, ...entry.data() };
          const messageIds = [...new Set(message.participantIds || [])].sort();
          if (messageIds.join("|") === participantKey) {
            messages.push(message);
          }
        });
      } catch (error) {
        // Participant-based legacy query is best-effort only.
      }
    }

    return messages;
  }

  pickInboxPreviewMessage(messages, { myId, partnerId }) {
    const sorted = this.sortMessages(
      this.dedupeMessages(
        (messages || []).map((message) => ({
          ...message,
          _source: message._source || "preview",
        }))
      )
    );
    if (!sorted.length) return null;

    const partnerMessage = [...sorted].reverse().find((message) => message.senderId === partnerId);
    return partnerMessage || sorted[sorted.length - 1];
  }

  async getChatPartnerEntry(userId, partnerId) {
    if (!userId || !partnerId) return null;
    const snapshot = await getDoc(
      doc(this.firestore, "users", userId, "chatPartners", partnerId)
    );
    return snapshot.exists() ? { id: partnerId, ...snapshot.data() } : null;
  }

  async getChatRoomParticipantName(roomIds, partnerId) {
    for (const roomId of [...new Set((roomIds || []).filter(Boolean))]) {
      const snapshot = await getDoc(doc(this.firestore, "chats", roomId));
      if (!snapshot.exists()) continue;
      const name = snapshot.data()?.participantNames?.[partnerId];
      if (String(name || "").trim() && name !== "User") {
        return String(name).trim();
      }
    }
    return null;
  }

  async getInboxPreviewMessage({ myId, partnerId, entry = {} }) {
    const trimmedPreview = String(entry.lastMessageText || "").trim();
    if (trimmedPreview) {
      return {
        text: trimmedPreview,
        senderId: entry.lastMessageSenderId || "",
        timestampMillis: entry.lastMessageMillis || entry.updatedAtMillis || 0,
      };
    }

    const conversationIds = getAllConversationIdsForParticipants(myId, partnerId);
    let bestRoomPreview = null;

    for (const roomId of conversationIds) {
      const snapshot = await getDoc(doc(this.firestore, "chats", roomId));
      if (!snapshot.exists()) continue;
      const data = snapshot.data();
      const text = String(data.lastMessageText || "").trim();
      if (!text) continue;
      const millis = data.lastMessageMillis || data.lastActiveMillis || data.lastActive || 0;
      if (!bestRoomPreview || millis > bestRoomPreview.timestampMillis) {
        bestRoomPreview = {
          text,
          senderId: data.lastMessageSenderId || "",
          timestampMillis: millis,
        };
      }
    }

    if (bestRoomPreview) return bestRoomPreview;

    const collected = [];
    for (const roomId of conversationIds) {
      const roomMessages = await this.fetchRecentMessagesForRoom(roomId);
      collected.push(...roomMessages);
      const legacyMessages = await this.fetchRecentLegacyMessages({
        conversationId: roomId,
        participantIds: [myId, partnerId],
      });
      collected.push(...legacyMessages);
    }

    const picked = this.pickInboxPreviewMessage(collected, { myId, partnerId });
    if (!picked?.text) return null;

    return {
      text: String(picked.text).trim(),
      senderId: picked.senderId || "",
      timestampMillis: picked.timestampMillis || 0,
    };
  }

  listenForMessages(roomId, onMessages, onError) {
    return this.listenForMessagesMerged(
      { roomIds: [roomId], conversationIds: [roomId] },
      onMessages,
      onError
    );
  }

  listenForMessagesMerged(
    { roomIds, conversationIds, participantIds, currentUserId },
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

    const reportError = (error, { optional = false } = {}) => {
      if (optional && error?.code === "permission-denied") {
        console.warn("Optional chat listener skipped:", error);
        return;
      }
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
        (error) => reportError(error)
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
          (error) => reportError(error, { optional: true })
        )
      );
    });

    // Only query legacy messages containing the signed-in user — querying the
    // partner's id fails Firestore rules (query must not return unreadable docs).
    if (participantIdList.length >= 2 && currentUserId) {
      unsubs.push(
        onSnapshot(
          query(
            this.legacyMessagesCollection(),
            where("participantIds", "array-contains", currentUserId)
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
          (error) => reportError(error, { optional: true })
        )
      );
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

  listenToPartnerTyping(userId, partnerId, onPartnerTyping, onError) {
    return onSnapshot(
      doc(this.firestore, "users", userId, "chatPartners", partnerId),
      (snapshot) => {
        onPartnerTyping(snapshot.exists() ? snapshot.data() : null);
      },
      (error) => {
        console.error("Partner typing listener error:", error);
        if (onError) onError(error);
      }
    );
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

  /**
   * Remove a conversation from this user's inbox by deleting their own
   * chatPartners entry. The shared chat messages are left intact; this only
   * clears the conversation from the current user's message list.
   */
  async deleteChatPartner(userId, partnerId) {
    if (!userId || !partnerId) {
      throw new Error("Missing conversation reference.");
    }
    await deleteDoc(
      doc(this.firestore, "users", userId, "chatPartners", partnerId)
    );
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
