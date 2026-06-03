export function createChatMessage({
  id,
  senderId,
  text,
  timestampMillis,
  read = false,
}) {
  return {
    id,
    senderId,
    text,
    timestampMillis,
    read,
  };
}
