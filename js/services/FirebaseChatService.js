import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase.js";
import ChatRepository from "../repositories/ChatRepository.js";

export default class FirebaseChatService extends ChatRepository {
  constructor(firestore = db) {
    super();
    this.firestore = firestore;
  }

  async sendMessage(chatMessage) {
    const collectionRef = collection(this.firestore, "chatMessages");
    await addDoc(collectionRef, {
      ...chatMessage,
      timestampMillis: chatMessage.timestampMillis || Date.now(),
    });
    return { success: true };
  }

  async sendMessageToJob(jobId, senderId, text) {
    try {
      await addDoc(collection(this.firestore, "jobs", jobId, "messages"), {
        senderId,
        text,
        timestampMillis: Date.now(),
        read: false
      });
    } catch (error) {
      throw new Error("Failed to send message");
    }
  }

  async getChatMessages(conversationId) {
    const q = query(
      collection(this.firestore, "chatMessages"),
      where("conversationId", "==", conversationId),
      orderBy("timestampMillis", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
  }

  listenToMessages(conversationId, onUpdate, onError) {
    const q = query(
      collection(this.firestore, "chatMessages"),
      where("conversationId", "==", conversationId),
      orderBy("timestampMillis", "asc")
    );
    return onSnapshot(q, onUpdate, onError);
  }
}
