import React, { useState } from "react";
import { X, Check, PhoneOff, MapPin } from "lucide-react";
import { toast } from "react-toastify";
import API from "@/components/apiClient";
import { getSocket } from "@/lib/socket";

interface CallResponseModalProps {
  customer: any;
  currentUser: any;
  programId?: string; // Optional program ID if called in the context of an event
  onClose: (updatedCustomer?: any) => void;
  isEditMode?: boolean;
}

export default function CallResponseModal({
  customer,
  currentUser,
  programId,
  onClose,
  isEditMode = false,
}: CallResponseModalProps) {
  const [loading, setLoading] = useState(false);
  const [showOutOfStationForm, setShowOutOfStationForm] = useState(false);
  const [place, setPlace] = useState("");
  const [tillDate, setTillDate] = useState("");
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
  const [customResponse, setCustomResponse] = useState("");

  const responses = [
    { value: "comes to youth class", label: "Comes to youth class", color: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-905/30" },
    { value: "try to come", label: "Try to come", color: "bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/50 hover:bg-sky-100 dark:hover:bg-sky-905/30" },
    { value: "out of station", label: "Out of station", color: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-905/30" },
    { value: "excuse", label: "Excuse / Busy", color: "bg-slate-50 dark:bg-zinc-800/40 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700/50 hover:bg-slate-100 dark:hover:bg-zinc-805/40" },
    { value: "no", label: "No (Not Coming)", color: "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-905/30" },
    { value: "not picked up", label: "Not picked up / No ans", color: "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-905/30" },
    { value: "custom", label: "Custom Response...", color: "bg-fuchsia-50 dark:bg-fuchsia-950/20 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-900/50 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-905/30" },
  ];

  const handleOutOfStationSubmit = async () => {
    setLoading(true);
    try {
      const responseVal = "out of station";
      const updateData: any = {
        callingStatus: "idle",
        callingBy: "",
        callingById: "",
        lastCallResponse: responseVal,
        outOfStation: {
          isOutOfStation: true,
          isOutOfStationPlace: place,
          tillDateOutOfStation: tillDate,
          lastTimeAttend: false,
          lastTimeNotAttendReason: "Out of station",
        },
      };

      // Update customer in database
      await API.editCustomer({
        _id: customer._id,
        updateData,
      });

      // If program context exists, update program customer status/response too
      if (programId) {
        try {
          const progRes = await API.getPrograms();
          const programs = progRes.data.data || [];
          const activeProg = programs.find((p: any) => p._id === programId);
          if (activeProg) {
            const updatedInvites = activeProg.invitedCustomers
              .filter((ic: any) => ic.customerId !== null && ic.customerId !== undefined)
              .map((ic: any) => {
                const cid = ic.customerId?._id || ic.customerId;
                if (cid === customer._id) {
                  return {
                    ...ic,
                    customerId: customer._id,
                    status: "called",
                    response: responseVal,
                    callingBy: currentUser?.name || "Admin",
                  };
                }
                return {
                  ...ic,
                  customerId: cid,
                };
              });
            await API.updateProgram({
              id: programId,
              invitedCustomers: updatedInvites,
            });
          }
        } catch (progErr: any) {
          console.error("Failed to update program invite response:", progErr);
          toast.error("Failed to update event invite: " + (progErr.response?.data?.message || progErr.message));
        }
      }

      // Notify other clients via WebSockets
      const socket = getSocket();
      socket.connect();
      socket.emit("calling-stop", {
        customerId: customer._id,
        response: responseVal,
        programId,
      });
      socket.emit("customer-update", { customerId: customer._id });

      toast.success("Call response updated!");
      onClose(responseVal);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save response");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedResponse) return;

    if (selectedResponse === "out of station") {
      setShowOutOfStationForm(true);
      return;
    }

    if (selectedResponse === "custom" && !customResponse.trim()) {
      toast.error("Please enter a custom response");
      return;
    }

    setLoading(true);
    try {
      const responseVal = selectedResponse === "custom" ? customResponse.trim() : selectedResponse;
      const updateData: any = {
        callingStatus: "idle",
        callingBy: "",
        callingById: "",
        lastCallResponse: responseVal,
        outOfStation: {
          isOutOfStation: false,
          isOutOfStationPlace: "",
          tillDateOutOfStation: "",
        },
      };

      // Update customer in database
      await API.editCustomer({
        _id: customer._id,
        updateData,
      });

      // If program context exists, update program customer status/response too
      if (programId) {
        try {
          // We can fetch program details, update the matching customer item, and update the program
          const progRes = await API.getPrograms();
          const programs = progRes.data.data || [];
          const activeProg = programs.find((p: any) => p._id === programId);
          if (activeProg) {
            const updatedInvites = activeProg.invitedCustomers
              .filter((ic: any) => ic.customerId !== null && ic.customerId !== undefined)
              .map((ic: any) => {
                const cid = ic.customerId?._id || ic.customerId;
                if (cid === customer._id) {
                  return {
                    ...ic,
                    customerId: customer._id,
                    status: "called",
                    response: responseVal,
                    callingBy: currentUser?.name || "Admin",
                  };
                }
                return {
                  ...ic,
                  customerId: cid,
                };
              });
            await API.updateProgram({
              id: programId,
              invitedCustomers: updatedInvites,
            });
          }
        } catch (progErr: any) {
          console.error("Failed to update program invite response:", progErr);
          toast.error("Failed to update event invite: " + (progErr.response?.data?.message || progErr.message));
        }
      }

      // Notify other clients via WebSockets
      const socket = getSocket();
      socket.connect();
      socket.emit("calling-stop", {
        customerId: customer._id,
        response: responseVal,
        programId,
      });
      socket.emit("customer-update", { customerId: customer._id });

      toast.success("Call response updated!");
      onClose(responseVal);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save response");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (isEditMode) {
      onClose();
      return;
    }

    // If they cancel without choosing, set callingStatus back to idle
    setLoading(true);
    try {
      await API.editCustomer({
        _id: customer._id,
        updateData: {
          callingStatus: "idle",
          callingBy: "",
          callingById: "",
        },
      });

      // If program context exists, clear program invite calling status
      if (programId) {
        try {
          const progRes = await API.getPrograms();
          const activeProg = (progRes.data.data || []).find((p: any) => p._id === programId);
          if (activeProg) {
            const updatedInvites = activeProg.invitedCustomers
              .filter((ic: any) => ic.customerId !== null && ic.customerId !== undefined)
              .map((ic: any) => {
                const cid = ic.customerId?._id || ic.customerId;
                if (cid === customer._id) {
                  return {
                    ...ic,
                    customerId: customer._id,
                    callingBy: "",
                  };
                }
                return {
                  ...ic,
                  customerId: cid,
                };
              });
            await API.updateProgram({
              id: programId,
              invitedCustomers: updatedInvites,
            });
          }
        } catch (progErr: any) {
          console.error("Failed to clear program invite call status:", progErr);
          toast.error("Failed to update event invite: " + (progErr.response?.data?.message || progErr.message));
        }
      }

      const socket = getSocket();
      socket.connect();
      socket.emit("calling-stop", {
        customerId: customer._id,
        response: "cancelled",
        programId,
      });
      socket.emit("customer-update", { customerId: customer._id });

      onClose();
    } catch (err) {
      console.error(err);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (showOutOfStationForm) {
    return (
      <div
        className="fixed inset-0 bg-neutral-950/40 dark:bg-neutral-950/60 flex items-center justify-center z-50 p-4 backdrop-blur-md"
        onClick={() => setShowOutOfStationForm(false)}
      >
        <div
          className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-xl overflow-y-auto max-h-[90%] animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 border-b border-neutral-100 dark:border-zinc-800/80 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-800 dark:text-zinc-100">Out of Station Details</h3>
                <p className="text-xs text-neutral-500 dark:text-zinc-400">Where is the customer going?</p>
              </div>
            </div>
            <button
              onClick={() => setShowOutOfStationForm(false)}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-neutral-400 dark:text-zinc-550 hover:text-neutral-600 dark:hover:text-zinc-300"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Destination / Place
              </label>
              <input
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="e.g., Delhi, Mumbai, USA"
                className="w-full premium-input py-2 text-xs text-neutral-800 dark:text-zinc-100 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-3 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Expected Return Date
              </label>
              <input
                type="date"
                value={tillDate}
                onChange={(e) => setTillDate(e.target.value)}
                className="w-full premium-input py-2 text-xs text-neutral-800 dark:text-zinc-100 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-3 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-4 bg-neutral-50 dark:bg-zinc-950/40 border-t border-neutral-100 dark:border-zinc-800/80 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowOutOfStationForm(false)}
              className="px-4 py-2 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-neutral-600 dark:text-zinc-450 hover:bg-neutral-50 dark:hover:bg-zinc-800 transition active:scale-95"
            >
              Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!place || !tillDate) {
                  toast.error("Please provide both destination and return date.");
                  return;
                }
                handleOutOfStationSubmit();
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-md active:scale-95 transition"
            >
              {loading ? "Saving..." : "Save Details"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-neutral-950/40 dark:bg-neutral-950/60 flex items-center justify-center z-50 p-4 backdrop-blur-md"
      onClick={handleCancel}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-xl overflow-y-auto max-h-[90%] animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="p-5 border-b border-neutral-100 dark:border-zinc-800/80 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
              <PhoneOff size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-800 dark:text-zinc-100">{isEditMode ? "Edit Call Response" : "Call Response"}</h3>
              <p className="text-xs text-neutral-500 dark:text-zinc-400">{isEditMode ? "Change customer feedback" : "Record customer feedback"}</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-neutral-400 dark:text-zinc-550 hover:text-neutral-600 dark:hover:text-zinc-300"
          >
            <X size={18} />
          </button>
        </div>

        {/* Customer Details info strip */}
        <div className="bg-neutral-50 dark:bg-zinc-950/40 p-4 border-b border-neutral-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div>
            <p className="font-semibold text-neutral-800 dark:text-zinc-100 text-sm">{customer.name}</p>
            <p className="text-xs text-neutral-500 dark:text-zinc-450 mt-0.5">{customer.phoneNumber}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/50">
              {isEditMode ? "Edit Record" : "Active Call"}
            </span>
          </div>
        </div>

        {/* Responses Grid */}
        <div className="p-5 space-y-3">
          <p className="text-xs font-semibold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Select Customer Response
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            {responses.map((resp) => {
              const isSelected = selectedResponse === resp.value;
              return (
                <button
                  key={resp.value}
                  onClick={() => setSelectedResponse(resp.value)}
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-xl text-left font-medium border text-sm transition-all active:scale-98 flex items-center justify-between ${isSelected
                    ? "ring-2 ring-indigo-500 dark:ring-indigo-400 border-transparent shadow-md " + resp.color
                    : "opacity-80 hover:opacity-100 border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-neutral-700 dark:text-zinc-300 hover:bg-neutral-50 dark:hover:bg-zinc-800"
                    }`}
                >
                  <span className={isSelected ? "" : "text-neutral-700 dark:text-zinc-300"}>{resp.label}</span>
                  {isSelected && <Check size={16} className="text-indigo-600 dark:text-indigo-400" />}
                </button>
              );
            })}
          </div>

          {/* Custom Input Box */}
          {selectedResponse === "custom" && (
            <div className="mt-3 animate-slideUp">
              <input
                type="text"
                autoFocus
                placeholder="Type custom response here..."
                value={customResponse}
                onChange={(e) => setCustomResponse(e.target.value)}
                className="w-full premium-input text-xs py-2.5 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50 dark:bg-zinc-950/40 border-t border-neutral-100 dark:border-zinc-800/80 flex justify-end gap-2.5">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-neutral-600 dark:text-zinc-450 hover:bg-neutral-50 dark:hover:bg-zinc-800 transition active:scale-95"
          >
            {isEditMode ? "Cancel" : "Cancel / Clear Call"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedResponse || (selectedResponse === "custom" && !customResponse.trim())}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:active:scale-100 text-white rounded-lg text-xs font-semibold shadow-md active:scale-95 transition flex items-center gap-2"
          >
            {loading ? "Saving..." : <><Check size={14} /> Save Response</>}
          </button>
        </div>
      </div>
    </div>
  );
}
