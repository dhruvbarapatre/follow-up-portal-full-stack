const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user.model");
const CustomerModel = require("../models/customer.model");

// GET /api/get-admins
router.get("/get-admins", async (req, res) => {
    try {
        const data = await UserModel.find({ role: "superAdmin" }).select("name phoneNumber");
        return res.status(200).json({ data });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
});

// GET /api/admins
router.get("/admins", async (req, res) => {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ message: "Unauthorized. No user data found." });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userData = decoded._doc ? decoded._doc : decoded;

        const users = await CustomerModel.find({});

        if (!users.length) {
            return res.status(404).json({ message: "No users found." });
        }

        const filteredUsers = users.filter(
            (el) => el.phoneNumber !== userData.phoneNumber
        );

        return res.status(200).json({
            data: filteredUsers,
            message: "All users fetched successfully",
        });
    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized. Invalid Token.",
            error: error.message
        });
    }
});

module.exports = router;
