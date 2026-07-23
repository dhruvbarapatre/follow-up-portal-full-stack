const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to Database
connectDB();

// Initialize Web Push
const webpush = require("web-push");
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Root route or Health Check
app.get("/health", (req, res) => {
  res.status(200).send("Backend server is healthy and running");
});
app.get("/api/health", (req, res) => {
  res.status(200).send("Backend server is healthy and running");
});

// Import Routers
const userRoutes = require("./routes/user.routes");
const customerRoutes = require("./routes/customer.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const adminRoutes = require("./routes/admin.routes");
const pushRoutes = require("./routes/push.routes");

// Customer model — needed for auto-reset of callingStatus
const CustomerModel = require("./models/customer.model");

// Use Routers
app.use("/api/user", userRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/attendence", attendanceRoutes);
app.use("/api/push", pushRoutes);
app.use("/api", adminRoutes); // for /api/get-admins, /api/admins, and /api/switch-db

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Persistent online registry for socket
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
    socket.emit("online-users-list", Array.from(onlineUsers.keys()));
  }

  // ── Auto-reset calling status after 1 minute ──────────────────────────────
  // Tracks active call timers: customerId → timeoutId
  // Each entry is cleaned up either when calling-stop arrives or when the timer fires.
  const callingTimers = new Map();

  socket.on("calling-start", (data) => {
    console.log("calling-start received:", data);
    socket.broadcast.emit("calling-start", data);

    const customerId = data?.customerId;
    if (!customerId) return;

    // Cancel any existing timer for this customer (e.g., rapid re-call)
    if (callingTimers.has(customerId)) {
      clearTimeout(callingTimers.get(customerId));
    }

    // Start a 60-second auto-reset timer
    const timer = setTimeout(async () => {
      callingTimers.delete(customerId);
      console.log(`Auto-reset: callingStatus -> idle for customer ${customerId} (1 min timeout)`);

      try {
        // Reset in database
        await CustomerModel.findByIdAndUpdate(customerId, {
          callingStatus: "idle",
          callingBy: "",
          callingById: "",
        });

        // Broadcast to all clients so their UI refreshes
        io.emit("calling-stop", { customerId, reason: "timeout" });
        io.emit("customer-update", { customerId });
        console.log(`Auto-reset complete for customer ${customerId}`);
      } catch (err) {
        console.error(`Auto-reset failed for customer ${customerId}:`, err.message);
      }
    }, 60 * 1000); // 1 minute

    callingTimers.set(customerId, timer);
  });

  socket.on("calling-stop", (data) => {
    console.log("calling-stop received:", data);
    socket.broadcast.emit("calling-stop", data);

    // Cancel the auto-reset timer since the call ended normally
    const customerId = data?.customerId;
    if (customerId && callingTimers.has(customerId)) {
      clearTimeout(callingTimers.get(customerId));
      callingTimers.delete(customerId);
      console.log(`Timer cancelled for customer ${customerId} (calling-stop received)`);
    }
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

  socket.on("new-notification", async (data) => {
    console.log("new-notification received:", data);
    socket.broadcast.emit("new-notification", data);
    
    // Web Push Notification Logic
    try {
      const UserModel = require("./models/user.model");
      const webpush = require("web-push");
      
      const targetUserIds = data.assignedUserIds || [];
      if (targetUserIds.length > 0) {
        const users = await UserModel.find({ _id: { $in: targetUserIds } });
        
        for (const user of users) {
          if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
            const payload = JSON.stringify({
              title: "New Assignment",
              body: data.message || "You have a new customer assignment",
              url: "/my-list"
            });
            
            for (const sub of user.pushSubscriptions) {
              try {
                await webpush.sendNotification(sub, payload);
              } catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                  // Subscription expired or no longer valid
                  user.pushSubscriptions = user.pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
                  await user.save();
                } else {
                  console.error("Push Error:", err);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error processing web push:", err);
    }
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
  console.log(`Backend server is running on port ${PORT}`);
});
