const express = require("express");
const router = express.Router();
const Attendance = require("../models/attendence.model");
const EventModel = require("../models/event.model");
const CustomerModel = require("../models/customer.model"); // Pre-registers model

// GET /api/attendence/list
router.get("/list", async (req, res) => {
    try {
        // 1. Fetch all events
        const events = await EventModel.find({}).sort({ date: -1, time: -1 });

        // 2. Fetch all attendance records for these events
        const eventIds = events.map(e => e._id);
        const attendanceRecords = await Attendance.find({ eventId: { $in: eventIds } })
            .populate("customerId");

        // 3. Group/format attendance records into the invitedCustomers array for each event
        const list = events.map(event => {
            const eventAttendance = attendanceRecords.filter(
                r => r.eventId.toString() === event._id.toString()
            );

            const invitedCustomers = eventAttendance
                .filter(att => att.customerId != null) // filter out orphans if any
                .map(att => ({
                    _id: att.customerId._id,
                    customerId: att.customerId, // populated
                    status: att.status,
                    response: att.response,
                    callingBy: att.callingBy,
                    attended: att.attended,
                    createdAt: att.createdAt,
                    updatedAt: att.updatedAt
                }));

            return {
                _id: event._id,
                title: event.title,
                date: event.date,
                time: event.time,
                description: event.description,
                createdAt: event.createdAt,
                updatedAt: event.updatedAt,
                invitedCustomers
            };
        });

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

        // 1. Create the Event
        const event = await EventModel.create({
            title,
            date: dateObj,
            time,
            description,
        });

        // 2. Create Attendance records for each invited customer
        if (invitedCustomerIds && invitedCustomerIds.length > 0) {
            const recordsToInsert = invitedCustomerIds.map(cid => ({
                eventId: event._id,
                customerId: cid,
                status: "invited",
                response: "pending",
                callingBy: "",
                attended: false,
            }));
            await Attendance.insertMany(recordsToInsert);
        }

        // Return the formatted program object matching the original schema
        const populatedAttendance = await Attendance.find({ eventId: event._id }).populate("customerId");

        const formattedEvent = {
            _id: event._id,
            title: event.title,
            date: event.date,
            time: event.time,
            description: event.description,
            invitedCustomers: populatedAttendance
                .filter(att => att.customerId != null)
                .map(att => ({
                    _id: att.customerId._id,
                    customerId: att.customerId,
                    status: att.status,
                    response: att.response,
                    callingBy: att.callingBy,
                    attended: att.attended,
                    createdAt: att.createdAt,
                    updatedAt: att.updatedAt
                })),
            users: [],
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
        };

        return res.status(201).json({ message: "Program created successfully", data: formattedEvent });
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

        // 1. Update the Event model
        const updateObj = {};
        if (title !== undefined) updateObj.title = title;
        if (date !== undefined) updateObj.date = new Date(date);
        if (time !== undefined) updateObj.time = time;
        if (description !== undefined) updateObj.description = description;

        let event = await EventModel.findById(id);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        if (Object.keys(updateObj).length > 0) {
            event = await EventModel.findByIdAndUpdate(id, updateObj, { new: true });
        }

        // 2. Handle invitedCustomers vs invitedCustomerIds
        if (invitedCustomers !== undefined) {
            // Loop through each item in invitedCustomers, and upsert/update the Attendance record.
            for (const item of invitedCustomers) {
                const custId = item.customerId?._id || item.customerId;
                if (!custId) continue;

                // Find or update Attendance record for this event and customer
                await Attendance.findOneAndUpdate(
                    { eventId: id, customerId: custId },
                    {
                        status: item.status || "invited",
                        response: item.response || "pending",
                        callingBy: item.callingBy || "",
                        attended: item.attended === true || item.attended === "true" || false,
                    },
                    { upsert: true, new: true }
                );
            }
        } else if (invitedCustomerIds !== undefined) {
            // Get all current attendance records for this event
            const currentRecords = await Attendance.find({ eventId: id });
            const currentCustomerIds = currentRecords
                .filter(r => r.customerId != null)
                .map(r => r.customerId.toString());

            // Determine records to create, delete, or keep
            const targetCustomerIds = invitedCustomerIds.map(cid => cid.toString());

            // Create records for new invitees
            const idsToCreate = targetCustomerIds.filter(cid => !currentCustomerIds.includes(cid));
            if (idsToCreate.length > 0) {
                const recordsToInsert = idsToCreate.map(cid => ({
                    eventId: id,
                    customerId: cid,
                    status: "invited",
                    response: "pending",
                    callingBy: "",
                    attended: false,
                }));
                await Attendance.insertMany(recordsToInsert);
            }

            // Delete records for removed invitees
            const idsToDelete = currentCustomerIds.filter(cid => !targetCustomerIds.includes(cid));
            if (idsToDelete.length > 0) {
                await Attendance.deleteMany({ eventId: id, customerId: { $in: idsToDelete } });
            }
        }

        // 3. Query updated list of attendance records, populate customerId, and return formatted event
        const updatedAttendance = await Attendance.find({ eventId: id }).populate("customerId");

        const formattedUpdatedEvent = {
            _id: event._id,
            title: event.title,
            date: event.date,
            time: event.time,
            description: event.description,
            invitedCustomers: updatedAttendance
                .filter(att => att.customerId != null)
                .map(att => ({
                    _id: att.customerId._id,
                    customerId: att.customerId,
                    status: att.status,
                    response: att.response,
                    callingBy: att.callingBy,
                    attended: att.attended,
                    createdAt: att.createdAt,
                    updatedAt: att.updatedAt
                })),
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
        };

        return res.status(200).json({ message: "Program updated successfully", data: formattedUpdatedEvent });
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

        // Delete the Event
        await EventModel.findByIdAndDelete(id);

        // Delete all corresponding Attendance records
        await Attendance.deleteMany({ eventId: id });

        return res.status(200).json({ message: "Program deleted successfully" });
    } catch (error) {
        return res.status(400).json({ message: "Error deleting program", error: error.message });
    }
});

module.exports = router;
