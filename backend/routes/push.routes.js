const express = require("express");
const router = express.Router();
const UserModel = require("../models/user.model.js");

// GET /api/push/vapid-public-key
// Serve the public key to the frontend so it can subscribe
router.get("/vapid-public-key", (req, res) => {
    res.status(200).send(process.env.VAPID_PUBLIC_KEY);
});

// POST /api/push/subscribe
// Save the subscription object to the current user in DB
router.post("/subscribe", async (req, res) => {
    try {
        const { userId, subscription } = req.body;
        if (!userId || !subscription) {
            return res.status(400).json({ success: false, message: "userId and subscription are required" });
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Add subscription to user if not already present
        const exists = user.pushSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
        if (!exists) {
            user.pushSubscriptions.push(subscription);
            await user.save();
        }

        res.status(201).json({ success: true, message: "Subscribed to push notifications" });
    } catch (error) {
        console.error("Error in /push/subscribe:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

module.exports = router;
