const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user.model");
const CustomerModel = require("../models/customer.model");

// POST /api/user/signup
router.post("/signup", async (req, res) => {
    const { name, phoneNumber, password } = req.body;

    if (!name || !phoneNumber || !password) {
        return res.status(409).json({ message: "Fill all fields" });
    }

    try {
        const existingUser = await UserModel.findOne({ phoneNumber });

        if (existingUser) {
            return res.status(409).json({ message: "User already exists" });
        }

        const newUser = await UserModel.create({
            name,
            phoneNumber,
            password,
            role: "user",
        });

        return res.status(200).json({
            message: "User Registered Successfully",
            user: newUser,
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

// POST /api/user/login
router.post("/login", async (req, res) => {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
        return res.status(400).json({ message: "Fill all fields" });
    }

    try {
        const user = await UserModel.findOne({ phoneNumber });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = password == user.password;

        if (!isMatch) {
            return res.status(401).json({ message: "Wrong password" });
        }

        const payload = {
            id: user._id,
            phoneNumber: user.phoneNumber,
            name: user.name,
            role: user.role,
        };

        const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: "7d" });

        return res.status(200).json({
            message: "Login successful",
            token
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

// POST /api/user/check-user
router.post("/check-user", async (req, res) => {
    const { fyp_token } = req.body;

    if (!fyp_token) {
        return res.status(400).json({ message: "Token Not Found..." });
    }

    const secret = process.env.SECRET_KEY;
    if (!secret) {
        return res.status(500).json({ message: "Server Secret Key Missing" });
    }

    jwt.verify(fyp_token, secret, (err, decoded) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        if (!decoded) {
            return res.status(400).json({ message: "Your Token Is Invalid" });
        }

        const { password, ...rest } = decoded;

        return res.status(200).json({
            data: { ...rest, token: fyp_token },
            message: "Welcome Follow Up Portal",
        });
    });
});

// POST /api/user/get-all-user
router.post("/get-all-user", async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ message: "Token is required" });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        if (!decoded) {
            return res.status(400).json({ message: "Invalid Token" });
        }
    } catch (err) {
        return res.status(400).json({
            message: "Invalid Token",
            error: err.message,
        });
    }

    try {
        const users = await UserModel.find({});
        if (!users.length) {
            return res.status(404).json({ message: "No users found." });
        }
        return res.status(200).json({
            data: users,
            message: "All users fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server Error",
            error: error.message,
        });
    }
});

// POST /api/user/get-user-list
router.post("/get-user-list", async (req, res) => {
    try {
        const { followUpId } = req.body;

        if (!followUpId) {
            return res.status(400).json({ message: "followUpId is required" });
        }

        const customers = await CustomerModel.find({
            whoCanFollowUp: { $in: followUpId }
        });

        if (customers && customers.length) {
            return res.status(200).json({
                data: customers,
                message: "User Gets suces"
            });
        }

        return res.status(200).json({
            message: "user has no list"
        });
    } catch (error) {
        console.error("Error finding customers:", error);
        return res.status(500).json({
            message: "Server Error",
            error: error.message
        });
    }
});

module.exports = router;
