import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import bcrypt from "bcryptjs";
import sanitizeHtml from "sanitize-html";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, onSnapshot, deleteDoc, updateDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import firebaseConfig from "./firebase-applet-config.json";

const firebaseApp = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

signInAnonymously(auth).then(cred => {
  console.log("Server Firebase Auth uid:", cred.user.uid);
}).catch(e => {
  console.error("Server Firebase Auth error:", e);
});

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

interface ServerUser {
  id: string;
  name: string;
  password?: string;
  color: string;
  avatarSymbol: string;
  joinedAt: number;
  type?: 'user' | 'group' | 'channel';
  creatorId?: string;
  bio?: string;
  email?: string;
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
const DATA_DIR = process.env.DATA_DIRECTORY || (fs.existsSync("/data") ? "/data" : process.cwd());
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

let messages: ServerMessage[] = [];
let registeredUsers: ServerUser[] = [];

function saveUserToDb(user: ServerUser) {
  setDoc(doc(db, "users", user.id), JSON.parse(JSON.stringify(user))).catch(console.error);
}

function saveMessageToDb(msg: ServerMessage) {
  setDoc(doc(db, "messages", msg.id), JSON.parse(JSON.stringify(msg))).catch(console.error);
}

function deleteMessageFromDb(id: string) {
  deleteDoc(doc(db, "messages", id)).catch(console.error);
}

// Fetch initial data and listen for changes
onSnapshot(collection(db, "users"), (snapshot) => {
  const users: ServerUser[] = [];
  snapshot.forEach(doc => {
    users.push({ id: doc.id, ...doc.data() } as ServerUser);
  });
  registeredUsers = users;
}, (error) => {
  console.error('Firestore Error sync users: ', error);
});

onSnapshot(collection(db, "messages"), (snapshot) => {
  const msgs: ServerMessage[] = [];
  snapshot.forEach(doc => {
    msgs.push({ id: doc.id, ...doc.data() } as ServerMessage);
  });
  messages = msgs.sort((a, b) => a.timestamp - b.timestamp);
}, (error) => {
  console.error('Firestore Error sync messages: ', error);
});

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
  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());

  // Authentication Middleware
  const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.cookies.authToken || req.headers.authorization?.split(' ')[1] || req.query.token;
    
    if (!token) {
      return res.status(401).json({ error: "Необходим токен для доступа" });
    }

    try {
      const user = jwt.verify(token as string, JWT_SECRET) as { id: string, name: string };
      (req as any).user = user;
      next();
    } catch (err) {
      return res.status(403).json({ error: "Недействительный или истекший токен" });
    }
  };

  app.get("/api/stream", authenticateToken, (req, res) => {
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

  app.get("/api/messages", authenticateToken, (req, res) => {
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

  app.post("/api/messages", authenticateToken, (req, res) => {
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
      userName: sanitizeHtml(userName || "Anonymous Guest"),
      userColor: userColor || "#2481cc",
      userAvatar: userAvatar || "🐱",
      text: hasText ? sanitizeHtml(text.slice(0, 5000)) : (hasAudio ? "[Голосовое сообщение]" : ""),
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

    saveMessageToDb(newMessage);

    broadcastEvent("message", newMessage);

    if (!recipientId && clients.length <= 1) {
      setTimeout(() => {
        const msg = messages.find(m => m.id === newMessage.id);
        if (msg && msg.status !== 'read') {
          msg.status = 'read';
          saveMessageToDb(msg);
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

  app.post("/api/messages/read", authenticateToken, (req, res) => {
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
        messageIds.forEach((id: string) => {
          const m = messages.find(m => m.id === id);
          if (m) saveMessageToDb(m);
        });
      } catch (e) {
        console.error("Save failed for read updates", e);
      }
      broadcastEvent("messages_read", { messageIds });
    }

    return res.json({ success: true });
  });

  app.post("/api/messages/:id/react", authenticateToken, (req, res) => {
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
      saveMessageToDb(msg);
    } catch (e) {
      console.error("Save failure for reaction", e);
    }

    broadcastEvent("reaction", { messageId: id, reactions: msg.reactions });

    return res.json({ messageId: id, reactions: msg.reactions });
  });

  app.delete("/api/messages/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    const initialLen = messages.length;
    messages = messages.filter((m) => m.id !== id);

    if (messages.length !== initialLen) {
      try {
        deleteMessageFromDb(id);
      } catch (e) {
        console.error("Save failed for delete", e);
      }
      broadcastEvent("delete", { messageId: id });
      return res.json({ success: true, messageId: id });
    }

    return res.status(404).json({ error: "Message not found" });
  });

  app.post("/api/messages/:id/pin", authenticateToken, (req, res) => {
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
      messages.forEach(m => {
        saveMessageToDb(m);
      });
    } catch (e) {
      console.error("Save failed for pin message", e);
    }

    broadcastEvent("pin", { messageId: id, action: "pin" });
    return res.json({ success: true, messageId: id });
  });

  app.post("/api/messages/:id/unpin", authenticateToken, (req, res) => {
    const { id } = req.params;
    const msg = messages.find((m) => m.id === id);
    if (!msg) {
      return res.status(404).json({ error: "Message not found" });
    }

    (msg as any).pinned = false;

    try {
      saveMessageToDb(msg);
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

  app.post("/api/calls/initiate", authenticateToken, (req, res) => {
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

  app.post("/api/calls/:callId/accept", authenticateToken, (req, res) => {
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

  app.post("/api/calls/:callId/reject", authenticateToken, (req, res) => {
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

  app.post("/api/calls/:callId/hangup", authenticateToken, (req, res) => {
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

  app.post("/api/calls/signal", authenticateToken, (req, res) => {
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

  app.post("/api/typing", authenticateToken, (req, res) => {
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

  app.post("/api/auth/register", async (req, res) => {
    const { username, password, avatarSymbol, color, bio } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Имя пользователя и пароль обязательны" });
    }
    const cleanUsername = sanitizeHtml(username.trim());
    if (cleanUsername.length < 2) {
      return res.status(400).json({ error: "Имя пользователя должно содержать минимум 2 символа" });
    }
    const slug = cleanUsername.toLowerCase();

    const nameExists = registeredUsers.some(u => u.name.trim().toLowerCase() === slug);
    if (nameExists) {
      return res.status(400).json({ error: "Пользователь с таким именем уже существует" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser: ServerUser = {
      id: "usr_" + Date.now().toString() + Math.random().toString(36).substring(2, 5),
      name: cleanUsername,
      password: hashedPassword,
      color: sanitizeHtml(color || "#2481cc"),
      avatarSymbol: sanitizeHtml(avatarSymbol || "🦊"),
      bio: sanitizeHtml(bio || ""),
      joinedAt: Date.now(),
      type: "user"
    };

    registeredUsers.push(newUser);
    saveUserToDb(newUser);

    try {
      broadcastEvent("users_updated", { type: "user_registered", userId: newUser.id });
    } catch (e) {
      console.error("Failed to broadcast users_updated event on registration:", e);
    }

    const { password: _, ...safeUser } = newUser;
    const token = jwt.sign({ id: newUser.id, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    return res.status(201).json({ user: safeUser, token });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Имя пользователя и пароль обязательны" });
    }
    const slug = username.trim().toLowerCase();
    const user = registeredUsers.find(u => u.name.trim().toLowerCase() === slug);
    if (!user) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }
    
    // For backwards compatibility with unhashed passwords from before
    const isMatch = user.password && user.password.startsWith('$2a$') 
      ? await bcrypt.compare(password, user.password)
      : user.password === password;
      
    if (!isMatch) {
      return res.status(401).json({ error: "Неверный пароль" });
    }
    
    // Upgrade password to hashed version if it wasn't hashed
    if (user.password === password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      saveUserToDb(user);
    }

    try {
      broadcastEvent("users_updated", { type: "user_logged_in", userId: user.id });
    } catch (e) {
      console.error("Failed to broadcast users_updated event on login:", e);
    }

    const { password: _, ...safeUser } = user;
    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    return res.json({ user: safeUser, token });
  });

  app.post("/api/auth/firebase", async (req, res) => {
    const { uid, email, displayName, photoURL, username, color, avatarSymbol, bio } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "UID обязателен" });
    }
    
    let user = registeredUsers.find(u => u.id === uid || u.email === email);
    
    if (!user) {
      // Create new user for this Firebase account
      user = {
        id: uid,
        name: sanitizeHtml(username || displayName || email?.split('@')[0] || `User_${uid.substring(0, 5)}`),
        color: color ? sanitizeHtml(color) : ("#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')),
        avatarSymbol: avatarSymbol ? sanitizeHtml(avatarSymbol) : "🔥",
        bio: bio ? sanitizeHtml(bio).slice(0, 120) : undefined,
        joinedAt: Date.now(),
        type: "user",
        email: email
      };
      registeredUsers.push(user);
      saveUserToDb(user);
    }

    try {
      broadcastEvent("users_updated", { type: "user_logged_in", userId: user.id });
    } catch (e) {
      console.error("Failed to broadcast event on firebase login:", e);
    }

    const { password: _, ...safeUser } = user;
    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    
    return res.json({ user: safeUser, token });
  });

  app.get("/api/users", authenticateToken, (req, res) => {
    const safeList = registeredUsers.map(u => ({
      id: u.id,
      name: u.name,
      color: u.color,
      avatarSymbol: u.avatarSymbol,
      joinedAt: u.joinedAt,
      type: u.type || 'user',
      creatorId: u.creatorId,
      bio: u.bio
    }));
    return res.json(safeList);
  });

  app.post("/api/users/update", authenticateToken, (req, res) => {
    const { id, name, avatarSymbol, color, bio } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: "id and name are required" });
    }
    const tokenUser = (req as any).user;
    if (tokenUser.id !== id) {
      return res.status(403).json({ error: "Отказано в доступе" });
    }
    const user = registeredUsers.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.name = sanitizeHtml(name.trim());
    if (avatarSymbol) user.avatarSymbol = sanitizeHtml(avatarSymbol);
    if (color) user.color = sanitizeHtml(color);
    user.bio = sanitizeHtml(bio || "");

    try {
      saveUserToDb(user);
      broadcastEvent("users_updated", { type: "user_profile_updated", userId: id });
    } catch (e) {
      console.error("Save users update error", e);
    }

    const { password: _, ...safeUser } = user;
    return res.json(safeUser);
  });

  app.post("/api/groups", authenticateToken, (req, res) => {
    const { name, avatarSymbol, type, creatorId } = req.body;
    if (!name || !type || !creatorId) {
      return res.status(400).json({ error: "Name, type, and creatorId are required" });
    }
    
    const newGroup: ServerUser = {
      id: type + "_" + Date.now().toString() + Math.random().toString(36).substring(2, 5),
      name: sanitizeHtml(name.trim()),
      color: "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
      avatarSymbol: sanitizeHtml(avatarSymbol || (type === "group" ? "👥" : "📢")),
      joinedAt: Date.now(),
      type: type,
      creatorId: creatorId
    };

    registeredUsers.push(newGroup);
    saveUserToDb(newGroup);

    try {
      broadcastEvent("users_updated", { type: "entity_created", entityId: newGroup.id });
    } catch (e) {
      console.error("Failed to broadcast users_updated event on group creation:", e);
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
