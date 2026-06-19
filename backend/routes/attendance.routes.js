const express = require("express");
const router = express.Router();
const Attendance = require("../models/attendence.model");
const CustomerModel = require("../models/customer.model"); // Pre-registers model

// GET /api/attendence/list
router.get("/list", async (req, res) => {
    try {
        const list = await Attendance.find({})
            .populate("invitedCustomers.customerId")
            .sort({ date: 1, time: 1 });

        return res.status(200).json({ data: list });
    } catch (error) {
        return res.status(400).json({ message: "Error fetching programs", error: error.message });
    }
});

// POST /api/attendence/create
router.post("/create", async (req, res) => {
    try {
        const { title, date, time, description, invitedCustomerIds } = req.body;

        if (!title || !date || !time) {
            return res.status(400).json({ message: "Title, date, and time are required" });
        }

        const dateObj = new Date(date);

        const invitedCustomers = (invitedCustomerIds || []).map((id) => ({
            customerId: id,
            status: "invited",
            response: "pending",
            callingBy: "",
        }));

        const program = await Attendance.create({
            title,
            date: dateObj,
            time,
            description,
            invitedCustomers,
            users: [],
        });

        return res.status(201).json({ message: "Program created successfully", data: program });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "A program is already scheduled on this date." });
        }
        return res.status(400).json({ message: "Error creating program", error: error.message });
    }
});

// PUT /api/attendence/update
router.put("/update", async (req, res) => {
    try {
        const { id, title, date, time, description, invitedCustomerIds, invitedCustomers } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Program ID is required" });
        }

        const updateObj = {};
        if (title !== undefined) updateObj.title = title;
        if (date !== undefined) updateObj.date = new Date(date);
        if (time !== undefined) updateObj.time = time;
        if (description !== undefined) updateObj.description = description;

        if (invitedCustomers !== undefined) {
            updateObj.invitedCustomers = invitedCustomers;
        } else if (invitedCustomerIds !== undefined) {
            const existing = await Attendance.findById(id);
            const existingInvites = existing?.invitedCustomers || [];

            updateObj.invitedCustomers = invitedCustomerIds.map((cid) => {
                const found = existingInvites.find((x) => x.customerId?.toString() === cid);
                if (found) return found;
                return {
                    customerId: cid,
                    status: "invited",
                    response: "pending",
                    callingBy: "",
                };
            });
        }

        const updated = await Attendance.findByIdAndUpdate(id, updateObj, { new: true })
            .populate("invitedCustomers.customerId");

        return res.status(200).json({ message: "Program updated successfully", data: updated });
    } catch (error) {
        return res.status(400).json({ message: "Error updating program", error: error.message });
    }
});

// DELETE /api/attendence/delete
router.delete("/delete", async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Program ID is required" });
        }

        await Attendance.findByIdAndDelete(id);

        return res.status(200).json({ message: "Program deleted successfully" });
    } catch (error) {
        return res.status(400).json({ message: "Error deleting program", error: error.message });
    }
});

module.exports = router;
