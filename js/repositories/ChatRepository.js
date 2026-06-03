export default class ChatRepository {
  async sendMessage(chatMessage) {
    throw new Error("ChatRepository.sendMessage() not implemented.");
  }

  async getChatMessages(conversationId) {
    throw new Error("ChatRepository.getChatMessages() not implemented.");
  }

  listenToMessages(conversationId, onUpdate, onError) {
    throw new Error("ChatRepository.listenToMessages() not implemented.");
  }
}
