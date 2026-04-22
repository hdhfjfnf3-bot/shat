import { Message } from "./types";

const botResponses = [
  "Haha yeah!",
  "That's so cool 🔥",
  "بجد؟؟",
  "Exactly my thoughts.",
  "Lol",
  "طب وبعدين؟",
  "I don't know tbh",
  "Nice ✨",
  "هه تمام",
  "omg 😍",
  "k",
  "tell me more",
];

export function simulateBotReply(
  conversationId: string,
  userMessage: string,
  receiveMessage: (cId: string, m: Message) => void,
  updateMessageStatus: (cId: string, mId: string, status: "seen") => void,
  setTyping?: (cId: string, isTyping: boolean) => void,
  lastOwnMessageId?: string,
  otherSenderId: string = "1",
) {
  const typingDelay = 600 + Math.random() * 800;
  const replyDelay = typingDelay + 1200 + Math.random() * 1800;

  setTimeout(() => {
    setTyping?.(conversationId, true);
  }, typingDelay);

  setTimeout(() => {
    setTyping?.(conversationId, false);

    if (lastOwnMessageId) {
      updateMessageStatus(conversationId, lastOwnMessageId, "seen");
    }

    const responseText = userMessage.trim().endsWith("?")
      ? "hmm let me think 🤔"
      : botResponses[Math.floor(Math.random() * botResponses.length)];

    const botReply: Message = {
      id: Math.random().toString(36).substring(2, 10),
      conversationId,
      senderId: otherSenderId,
      type: "text",
      content: responseText,
      reactions: [],
      status: "delivered",
      createdAt: new Date().toISOString(),
    };
    receiveMessage(conversationId, botReply);
  }, replyDelay);
}
