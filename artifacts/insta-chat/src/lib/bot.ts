import { Message } from "./types";

const botResponses = [
  "Haha yeah!",
  "That's so cool 🔥",
  "بجد؟؟",
  "Exactly my thoughts.",
  "Lol",
  "طب وبعدين؟",
  "I don't know tbh",
  "Nice ✨"
];

export function simulateBotReply(
  conversationId: string, 
  userMessage: string, 
  setTyping: (cId: string, isTyping: boolean) => void,
  receiveMessage: (cId: string, m: Message) => void,
  updateStatus: (cId: string, mId: string, status: "seen") => void,
  lastMessageId: string
) {
  setTimeout(() => {
    setTyping(conversationId, true);
    
    setTimeout(() => {
      setTyping(conversationId, false);
      updateStatus(conversationId, lastMessageId, "seen");

      const mId = Math.random().toString(36).substring(7);
      const responseText = userMessage.includes("?") 
        ? "I'm not sure, maybe?" 
        : botResponses[Math.floor(Math.random() * botResponses.length)];

      const botReply: Message = {
        id: mId,
        conversationId,
        senderId: "1", // Simplified, assumes 1 is the other person in most seeds
        type: "text",
        content: responseText,
        reactions: [],
        status: "delivered",
        createdAt: new Date().toISOString(),
      };
      receiveMessage(conversationId, botReply);
    }, 1500 + Math.random() * 2000);
  }, 1000);
}
