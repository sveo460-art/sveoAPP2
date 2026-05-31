import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface ServerUser {
  id: string;
  name: string;
  password?: string;
  color: string;
  avatarSymbol: string;
  joinedAt: number;
  type?: 'user' | 'group' | 'channel';
  creatorId?: string;
}

interface ServerMessage {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  userAvatar: string;
  text: string;
  photo?: string;
  audio?: string;
  audioDuration?: number;
  timestamp: number;
  replyTo?: {
    id: string;
    userName: string;
    text: string;
  };
  reactions: Record<string, string[]>;
  status?: 'sent' | 'read';
  recipientId?: string;
}

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
  recipientId?: string;
}

const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_NAME || process.env.RAILWAY_STATIC_URL;
const PORT = isRailway && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const MESSAGES_FILE = path.join(process.cwd(), "messages.json");
const USERS_FILE = path.join(process.cwd(), "users.json");

let messages: ServerMessage[] = [];
try {
  if (fs.existsSync(MESSAGES_FILE)) {
    const data = fs.readFileSync(MESSAGES_FILE, "utf-8");
    messages = JSON.parse(data);
    if (messages.length > 300) {
      messages = messages.slice(messages.length - 300);
    }
  } else {
    messages = [];
    fs.promises.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2)).catch(console.error);
  }
} catch (e) {
  console.error("Failed to load messages", e);
}

let registeredUsers: ServerUser[] = [];
try {
  if (fs.existsSync(USERS_FILE)) {
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    registeredUsers = JSON.parse(data);
  } else {
    registeredUsers = [];
  }
} catch (e) {
  console.error("Failed to load users", e);
}

try {
  fs.promises.writeFile(USERS_FILE, JSON.stringify(registeredUsers, null, 2)).catch(console.error);
} catch (e) {
  console.error("Failed to save user seeds to disk", e);
}

let clients: { id: string; userId?: string; res: express.Response }[] = [];

function getOnlineUserIds(): string[] {
  const ids = new Set<string>();
  clients.forEach((c) => {
    if (c.userId) {
      ids.add(c.userId);
    }
  });
  return Array.from(ids);
}

function broadcastEvent(type: string, data: any) {
  clients.forEach((client) => {
    if (type === "message" && data && data.recipientId) {
      const isGroupOrChannel = registeredUsers.some(u => u.id === data.recipientId && (u.type === 'group' || u.type === 'channel'));
      if (!isGroupOrChannel) {
        if (client.userId !== data.userId && client.userId !== data.recipientId) {
          return;
        }
      }
    }

    if (type === "messages_read" && data && data.messageIds) {
      const anyPrivateMsg = messages.find(m => data.messageIds.includes(m.id) && m.recipientId);
      if (anyPrivateMsg) {
        if (client.userId !== anyPrivateMsg.userId && client.userId !== anyPrivateMsg.recipientId) {
          return;
        }
      }
    }

    const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    try {
      client.res.write(payload);
    } catch (err) {
    }
  });
}

let typingUsers: Record<string, TypingUser> = {};

setInterval(() => {
  let changed = false;
  clients = clients.filter((c) => {
    try {
      c.res.write(":\n\n");
      return true;
    } catch (e) {
      changed = true;
      return false;
    }
  });
  if (changed) {
    const updatedOnlineUsers = getOnlineUserIds();
    broadcastEvent("online_count", { count: updatedOnlineUsers.length, onlineUsers: updatedOnlineUsers });
  }
}, 15000);

setInterval(() => {
  const now = Date.now();
  let changed = false;
  Object.keys(typingUsers).forEach((userId) => {
    if (now - typingUsers[userId].timestamp > 4000) {
      delete typingUsers[userId];
      changed = true;
    }
  });
  if (changed) {
    broadcastEvent("typing", Object.values(typingUsers));
  }
}, 2000);

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  app.get("/api/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const userId = req.query.userId?.toString() || undefined;
    const clientId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    clients.push({ id: clientId, userId, res });

    const onlineUsers = getOnlineUserIds();
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, onlineCount: onlineUsers.length, onlineUsers: onlineUsers })}\n\n`);

    broadcastEvent("online_count", { count: onlineUsers.length, onlineUsers: onlineUsers });

    req.on("close", () => {
      clients = clients.filter((c) => c.id !== clientId);
      const updatedOnlineUsers = getOnlineUserIds();
      broadcastEvent("online_count", { count: updatedOnlineUsers.length, onlineUsers: updatedOnlineUsers });
    });
  });

  app.get("/api/messages", (req, res) => {
    const activeUserId = req.query.userId?.toString();
    if (!activeUserId) {
      return res.json(messages.filter((m) => !m.recipientId));
    }
    const filtered = messages.filter((m) => {
      if (!m.recipientId) return true;
      const isGroupOrChannel = registeredUsers.some(u => u.id === m.recipientId && (u.type === 'group' || u.type === 'channel'));
      if (isGroupOrChannel) return true;
      return m.userId === activeUserId || m.recipientId === activeUserId;
    });
    res.json(filtered);
  });

  app.post("/api/messages", (req, res) => {
    const { userId, userName, userColor, userAvatar, text, photo, audio, audioDuration, replyTo, recipientId } = req.body;

    const hasText = typeof text === "string" && text.trim() !== "";
    const hasPhoto = typeof photo === "string" && photo.trim() !== "";
    const hasAudio = typeof audio === "string" && audio.trim() !== "";

    if (!hasText && !hasPhoto && !hasAudio) {
      return res.status(400).json({ error: "Message text, photo, or audio is required" });
    }

    const newMessage: ServerMessage = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      userId: userId || "guest",
      userName: userName || "Anonymous Guest",
      userColor: userColor || "#2481cc",
      userAvatar: userAvatar || "🐱",
      text: hasText ? text.slice(0, 5000) : (hasAudio ? "[Голосовое сообщение]" : ""),
      photo: hasPhoto ? photo : undefined,
      audio: hasAudio ? audio : undefined,
      audioDuration: hasAudio ? Number(audioDuration) || 0 : undefined,
      timestamp: Date.now(),
      replyTo: replyTo || undefined,
      reactions: {},
      status: 'sent',
      recipientId: recipientId || undefined
    };

    messages.push(newMessage);
    if (messages.length > 500) {
      messages = messages.slice(messages.length - 500);
    }

    try {
      fs.promises.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2)).catch(console.error);
    } catch (e) {
      console.error("Save failed", e);
    }

    broadcastEvent("message", newMessage);

    if (!recipientId && clients.length <= 1) {
      setTimeout(() => {
        const msg = messages.find(m => m.id === newMessage.id);
        if (msg && msg.status !== 'read') {
          msg.status = 'read';
          try {
            fs.promises.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2)).catch(console.error);
          } catch (e) {
            console.error("Save failed for auto-read simulation", e);
          }
          broadcastEvent("messages_read", { messageIds: [newMessage.id] });
        }
      }, 2000);
    }

    if (userId && typingUsers[userId]) {
      delete typingUsers[userId];
      broadcastEvent("typing", Object.values(typingUsers));
    }

    return res.status(201).json(newMessage);
  });

  app.post("/api/messages/read", (req, res) => {
    const { messageIds } = req.body;
    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ error: "messageIds array is required" });
    }

    let updated = false;
    messageIds.forEach((id: string) => {
      const msg = messages.find((m) => m.id === id);
      if (msg && msg.status !== 'read') {
        msg.status = 'read';
        updated = true;
      }
    });

    if (updated) {
      try {
        fs.promises.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2)).catch(console.error);
      } catch (e) {
        console.error("Save failed for read updates", e);
      }
      broadcastEvent("messages_read", { messageIds });
    }

    return res.json({ success: true });
  });

  app.post("/api/messages/:id/react", (req, res) => {
    const { id } = req.params;
    const { userId, emoji } = req.body;

    if (!userId || !emoji) {
      return res.status(400).json({ error: "Missing userId or emoji" });
    }

    const msg = messages.find((m) => m.id === id);
    if (!msg) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (!msg.reactions[emoji]) {
      msg.reactions[emoji] = [];
    }

    const userIndex = msg.reactions[emoji].indexOf(userId);
    if (userIndex > -1) {
      msg.reactions[emoji] = msg.reactions[emoji].filter((uid) => uid !== userId);
      if (msg.reactions[emoji].length === 0) {
        delete msg.reactions[emoji];
      }
    } else {
      msg.reactions[emoji].push(userId);
    }

    try {
      fs.promises.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2)).catch(console.error);
    } catch (e) {
      console.error("Save failure for reaction", e);
    }

    broadcastEvent("reaction", { messageId: id, reactions: msg.reactions });

    return res.json({ messageId: id, reactions: msg.reactions });
  });

  app.delete("/api/messages/:id", (req, res) => {
    const { id } = req.params;
    const initialLen = messages.length;
    messages = messages.filter((m) => m.id !== id);

    if (messages.length !== initialLen) {
      try {
        fs.promises.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2)).catch(console.error);
      } catch (e) {
        console.error("Save failed for delete", e);
      }
      broadcastEvent("delete", { messageId: id });
      return res.json({ success: true, messageId: id });
    }

    return res.status(404).json({ error: "Message not found" });
  });

  app.post("/api/messages/:id/pin", (req, res) => {
    const { id } = req.params;
    const msg = messages.find((m) => m.id === id);
    if (!msg) {
      return res.status(404).json({ error: "Message not found" });
    }

    const isPrivate = !!msg.recipientId;
    const recipientId = msg.recipientId;
    const userId = msg.userId;

    messages.forEach((m) => {
      if (isPrivate) {
        const isSameChat = 
          m.recipientId && 
          ((m.userId === userId && m.recipientId === recipientId) || 
           (m.userId === recipientId && m.recipientId === userId));
        if (isSameChat) {
          (m as any).pinned = false;
        }
      } else {
        if (!m.recipientId) {
          (m as any).pinned = false;
        }
      }
    });

    (msg as any).pinned = true;

    try {
      fs.promises.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2)).catch(console.error);
    } catch (e) {
      console.error("Save failed for pin message", e);
    }

    broadcastEvent("pin", { messageId: id, action: "pin" });
    return res.json({ success: true, messageId: id });
  });

  app.post("/api/messages/:id/unpin", (req, res) => {
    const { id } = req.params;
    const msg = messages.find((m) => m.id === id);
    if (!msg) {
      return res.status(404).json({ error: "Message not found" });
    }

    (msg as any).pinned = false;

    try {
      fs.promises.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2)).catch(console.error);
    } catch (e) {
      console.error("Save failed for unpin message", e);
    }

    broadcastEvent("pin", { messageId: id, action: "unpin" });
    return res.json({ success: true, messageId: id });
  });

  interface ActiveCall {
    id: string;
    callerId: string;
    receiverId: string;
    status: 'ringing' | 'active' | 'ended' | 'rejected';
    startedAt?: number;
  }
  let activeCalls: ActiveCall[] = [];

  app.post("/api/calls/initiate", (req, res) => {
    const { callerId, receiverId } = req.body;
    if (!callerId || !receiverId) {
      return res.status(400).json({ error: "Missing callerId or receiverId" });
    }

    activeCalls = activeCalls.filter(c => {
      const involvesUser = c.callerId === callerId || c.receiverId === callerId || c.callerId === receiverId || c.receiverId === receiverId;
      if (involvesUser) {
        broadcastEvent("call_event", { type: "ended", callId: c.id });
        return false;
      }
      return true;
    });

    const callId = "call_" + Date.now() + Math.random().toString(36).substring(2, 5);
    const newCall: ActiveCall = {
      id: callId,
      callerId,
      receiverId,
      status: "ringing"
    };

    activeCalls.push(newCall);

    broadcastEvent("call_event", { 
      type: "incoming", 
      callId, 
      callerId, 
      receiverId 
    });

    return res.json(newCall);
  });

  app.post("/api/calls/:callId/accept", (req, res) => {
    const { callId } = req.params;
    const call = activeCalls.find(c => c.id === callId);
    if (!call) {
      return res.status(404).json({ error: "Call not found" });
    }

    call.status = "active";
    call.startedAt = Date.now();

    broadcastEvent("call_event", { 
      type: "accepted", 
      callId 
    });

    return res.json(call);
  });

  app.post("/api/calls/:callId/reject", (req, res) => {
    const { callId } = req.params;
    const callIndex = activeCalls.findIndex(c => c.id === callId);
    if (callIndex === -1) {
      return res.status(404).json({ error: "Call not found" });
    }

    const call = activeCalls[callIndex];
    call.status = "rejected";
    
    broadcastEvent("call_event", { 
      type: "rejected", 
      callId 
    });

    activeCalls.splice(callIndex, 1);
    return res.json({ success: true });
  });

  app.post("/api/calls/:callId/hangup", (req, res) => {
    const { callId } = req.params;
    const callIndex = activeCalls.findIndex(c => c.id === callId);
    if (callIndex === -1) {
      return res.json({ success: true });
    }

    const call = activeCalls[callIndex];
    call.status = "ended";

    broadcastEvent("call_event", { 
      type: "ended", 
      callId 
    });

    activeCalls.splice(callIndex, 1);
    return res.json({ success: true });
  });

  app.post("/api/calls/signal", (req, res) => {
    const { targetId, senderId, signal } = req.body;
    if (!targetId || !senderId || !signal) {
      return res.status(400).json({ error: "Missing signaling parameters" });
    }

    broadcastEvent("call_signal", {
      targetId,
      senderId,
      signal
    });

    return res.json({ success: true });
  });

  app.post("/api/typing", (req, res) => {
    const { userId, userName, recipientId } = req.body;

    if (userId && userName) {
      typingUsers[userId] = {
        userId,
        userName,
        timestamp: Date.now(),
        recipientId: recipientId || undefined
      };
      broadcastEvent("typing", Object.values(typingUsers));
    }

    res.json({ success: true });
  });

  app.post("/api/auth/register", (req, res) => {
    const { username, password, avatarSymbol, color } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Имя пользователя и пароль обязательны" });
    }
    const cleanUsername = username.trim();
    if (cleanUsername.length < 2) {
      return res.status(400).json({ error: "Имя пользователя должно содержать минимум 2 символа" });
    }
    const slug = cleanUsername.toLowerCase();
    const exists = registeredUsers.some(u => u.name.trim().toLowerCase() === slug);
    if (exists) {
      return res.status(400).json({ error: "Пользователь с таким именем уже существует" });
    }

    const newUser: ServerUser = {
      id: "usr_" + Date.now().toString() + Math.random().toString(36).substring(2, 5),
      name: cleanUsername,
      password: password,
      color: color || "#2481cc",
      avatarSymbol: avatarSymbol || "🦊",
      joinedAt: Date.now()
    };

    registeredUsers.push(newUser);
    try {
      fs.promises.writeFile(USERS_FILE, JSON.stringify(registeredUsers, null, 2)).catch(console.error);
    } catch (e) {
      console.error("Save users error", e);
    }

    const { password: _, ...safeUser } = newUser;
    return res.status(201).json(safeUser);
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Имя пользователя и пароль обязательны" });
    }
    const slug = username.trim().toLowerCase();
    const user = registeredUsers.find(u => u.name.trim().toLowerCase() === slug);
    if (!user) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }
    if (user.password !== password) {
      return res.status(401).json({ error: "Неверный пароль" });
    }

    const { password: _, ...safeUser } = user;
    return res.json(safeUser);
  });

  app.get("/api/users", (req, res) => {
    const safeList = registeredUsers.map(u => ({
      id: u.id,
      name: u.name,
      color: u.color,
      avatarSymbol: u.avatarSymbol,
      joinedAt: u.joinedAt,
      type: u.type,
      creatorId: u.creatorId
    }));
    return res.json(safeList);
  });

  app.post("/api/groups", (req, res) => {
    const { name, avatarSymbol, type, creatorId } = req.body;
    if (!name || !type || !creatorId) {
      return res.status(400).json({ error: "Name, type, and creatorId are required" });
    }
    
    const newGroup: ServerUser = {
      id: type + "_" + Date.now().toString() + Math.random().toString(36).substring(2, 5),
      name: name.trim(),
      color: "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
      avatarSymbol: avatarSymbol || (type === "group" ? "👥" : "📢"),
      joinedAt: Date.now(),
      type: type,
      creatorId: creatorId
    };

    registeredUsers.push(newGroup);
    try {
      fs.promises.writeFile(USERS_FILE, JSON.stringify(registeredUsers, null, 2)).catch(console.error);
    } catch (e) {
      console.error("Save users error", e);
    }

    return res.status(201).json(newGroup);
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", clientsCount: clients.length });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
