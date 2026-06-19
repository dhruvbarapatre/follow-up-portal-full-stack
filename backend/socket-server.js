const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("Socket server is healthy and running");
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Persistent online registry
const onlineUsers = new Map();

io.on("connection", (socket) => {
  const socketName = socket.handshake.query.name || "Anonymous";
  console.log(`Client connected: ${socketName} (ID: ${socket.id})`);

  if (socketName && socketName !== "Anonymous") {
    if (!onlineUsers.has(socketName)) {
      onlineUsers.set(socketName, new Set());
    }
    onlineUsers.get(socketName).add(socket.id);
    io.emit("online-users-list", Array.from(onlineUsers.keys()));
  } else {
    // Emit current online users to Anonymous connections too
    socket.emit("online-users-list", Array.from(onlineUsers.keys()));
  }

  socket.on("calling-start", (data) => {
    console.log("calling-start received:", data);
    socket.broadcast.emit("calling-start", data);
  });

  socket.on("calling-stop", (data) => {
    console.log("calling-stop received:", data);
    socket.broadcast.emit("calling-stop", data);
  });

  socket.on("customer-update", (data) => {
    console.log("customer-update received:", data);
    socket.broadcast.emit("customer-update", data);
  });

  socket.on("attendance-update", (data) => {
    console.log("attendance-update received:", data);
    socket.broadcast.emit("attendance-update", data);
  });

  socket.on("event-update", (data) => {
    console.log("event-update received:", data);
    socket.broadcast.emit("event-update", data);
  });

  socket.on("new-notification", (data) => {
    console.log("new-notification received:", data);
    socket.broadcast.emit("new-notification", data);
  });

  socket.on("request-online-users", () => {
    socket.emit("online-users-list", Array.from(onlineUsers.keys()));
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socketName} (ID: ${socket.id})`);
    if (socketName && socketName !== "Anonymous" && onlineUsers.has(socketName)) {
      const socketIds = onlineUsers.get(socketName);
      socketIds.delete(socket.id);
      if (socketIds.size === 0) {
        onlineUsers.delete(socketName);
      }
      io.emit("online-users-list", Array.from(onlineUsers.keys()));
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Socket server is running on port ${PORT}`);
});
