const express = require("express");
const router = express.Router();
const CustomerModel = require("../models/customer.model");
const UserModel = require("../models/user.model");

// POST /api/customer/add-customer
router.post("/add-customer", async (req, res) => {
    const { name, phoneNumber, adderId, isMarried, ...rest } = req.body;
    if (!name || !phoneNumber || !adderId) {
        return res.status(400).json({
            message: "name and phoneNumber must be provided",
        });
    }

    try {
        await CustomerModel.create({
            ...rest,
            name,
            phoneNumber,
            adderId,
            isMarried: isMarried === true || isMarried === "true" || false,
        });
        return res.status(200).json({ message: "User Added Successfully" });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Server Error",
        });
    }
});

// POST /api/customer/check-duplicate
router.post("/check-duplicate", async (req, res) => {
    const { name, phoneNumber } = req.body;
    if (!name && !phoneNumber) {
        return res.status(400).json({
            message: "name or phoneNumber must be provided",
        });
    }

    try {
        const query = [];
        if (name && name.trim()) {
            const escapedName = name.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            query.push({ name: { $regex: new RegExp("^" + escapedName + "$", "i") } });
        }
        if (phoneNumber) {
            const phoneNum = Number(phoneNumber);
            if (!isNaN(phoneNum)) {
                query.push({ phoneNumber: phoneNum });
            }
        }

        if (query.length === 0) {
            return res.status(200).json({ exists: false, customer: null });
        }

        const duplicate = await CustomerModel.findOne({ $or: query });

        if (duplicate) {
            let adderName = "";
            if (duplicate.adderId) {
                try {
                    const adder = await UserModel.findById(duplicate.adderId);
                    if (adder) {
                        adderName = adder.name;
                    }
                } catch (e) {
                    // Ignore lookup errors
                }
            }

            return res.status(200).json({ 
                exists: true, 
                customer: duplicate,
                adderName
            });
        }

        return res.status(200).json({ exists: false, customer: null });
    } catch (error) {
        console.error("Error in check-duplicate customer API:", error);
        return res.status(500).json({
            message: error.message || "Server Error",
        });
    }
});

// POST /api/customer/assign-customer-to-user
router.post("/assign-customer-to-user", async (req, res) => {
    const { customerId, UsersIds, userType } = req.body;

    if (!customerId && !UsersIds) {
        return res.status(400).json({ message: "followUpId is required" });
    }

    try {
        const customers = await CustomerModel.updateOne(
            { _id: customerId },
            {
                $push: {
                    whoCanFollowUp: { $each: UsersIds },
                },
            }
        );
        return res.status(200).json({
            data: customers,
            message: "customer assign to users successfully",
        });
    } catch (error) {
        console.error("Error assigning customers:", error);
        return res.status(500).json({ message: "Server Error" });
    }
});

// PUT /api/customer/edit-customer
router.put("/edit-customer", async (req, res) => {
    const { _id, updateData } = req.body;

    if (!_id) {
        return res.status(400).json({ message: "User ID is required" });
    }

    try {
        const updatedUser = await CustomerModel.findByIdAndUpdate(
            _id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            message: "User updated successfully",
            data: updatedUser,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error updating user",
            error: error.message,
        });
    }
});

// POST /api/customer/get-all-customer
router.post("/get-all-customer", async (req, res) => {
    try {
        const customers = await CustomerModel.find({});
        return res.status(200).json({
            data: customers,
            message: "Customers fetched successfully",
        });
    } catch (error) {
        console.error("Error finding customers:", error);
        return res.status(500).json({ message: "Server Error" });
    }
});

// POST /api/customer/get-un-resrerved-customer
router.post("/get-un-resrerved-customer", async (req, res) => {
    try {
        const data = await CustomerModel.find({
            whoCanFollowUp: { $size: 0 }
        });
        return res.status(200).json({ data });
    } catch (error) {
        return res.status(400).json({ message: "Error fetching unreserved customers", error: error.message });
    }
});

module.exports = router;
