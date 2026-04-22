import { Router, type IRouter } from "express";
import { getConversationsHttp, getConversationMessages } from "../realtime";

const router: IRouter = Router();

router.get("/chat/:username/conversations", (req, res) => {
  const username = req.params.username;
  res.json({ conversations: getConversationsHttp(username) });
});

router.get("/chat/:username/with/:peer/messages", (req, res) => {
  const { username, peer } = req.params;
  res.json({ messages: getConversationMessages(username, peer) });
});

export default router;
