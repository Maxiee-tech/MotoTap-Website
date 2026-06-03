import { useState, useCallback } from "react";
import FirebaseChatService from "../services/FirebaseChatService.js";

const chatService = new FirebaseChatService();

export function useChat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (
    jobId,
    senderId,
    text
  ) => {
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await chatService.sendMessageToJob(jobId, senderId, text.trim());
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sendMessage,
    loading,
    error
  };
}