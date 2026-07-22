import React, { useState, useEffect } from "react";
import { X, Check, PhoneOff, MapPin, AlertTriangle, Phone, MessageCircle } from "lucide-react";
import { toast } from "react-toastify";
import API from "@/components/apiClient";
import { getSocket } from "@/lib/socket";
import ModalWrapper from "@/components/ModalWrapper";

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

  const [lastAttendance, setLastAttendance] = useState<any>(null);
  const [loadingLastAttendance, setLoadingLastAttendance] = useState(false);

  // States for reasons (initialized from current customer data if present)
  const [anyEmergency, setAnyEmergency] = useState(customer?.lastTimeAgreedButNotCome?.anyEmergency || false);
  const [forgetToCome, setForgetToCome] = useState(customer?.lastTimeAgreedButNotCome?.forgetToCome || false);
  const [isDoingFalsePromise, setIsDoingFalsePromise] = useState(customer?.lastTimeAgreedButNotCome?.isDoingFalsePromise || false);
  const [lastTimeReason, setLastTimeReason] = useState(customer?.lastTimeAgreedButNotCome?.lastTimeReason || "");

  useEffect(() => {
    if (!programId || !customer?._id) return;

    const fetchLastAttendance = async () => {
      setLoadingLastAttendance(true);
      try {
        let lastRecord = null;
        try {
          const res = await API.getLastAttendance(customer._id, programId);
          lastRecord = res.data.data;
        } catch (err: any) {
          // If the custom endpoint fails (e.g. 404 from a deployed production backend),
          // fallback to client-side filtering of all programs.
          console.warn("getLastAttendance endpoint failed, falling back to frontend filter:", err);
          const programsRes = await API.getPrograms();
          const programsList = programsRes.data.data || [];

          const pastInvites = [];
          for (const program of programsList) {
            if (program._id === programId) continue;

            const invite = program.invitedCustomers?.find(
              (ic: any) => {
                const icCustId = ic.customerId?._id || ic.customerId;
                return icCustId && icCustId.toString() === customer._id.toString();
              }
            );

            if (invite) {
              pastInvites.push({
                eventId: program._id,
                eventTitle: program.title,
                eventDate: program.date,
                attended: invite.attended,
                response: invite.response,
                callingBy: invite.callingBy,
              });
            }
          }

          // Sort by date descending
          pastInvites.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

          if (pastInvites.length > 0) {
            lastRecord = pastInvites[0];
          }
        }

        setLastAttendance(lastRecord);
      } catch (err) {
        console.error("Failed to load last attendance:", err);
      } finally {
        setLoadingLastAttendance(false);
      }
    };

    fetchLastAttendance();
  }, [customer?._id, programId]);

  const responses = [
    { value: "yes, coming", label: "yes, coming", color: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-905/30" },
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

      if (programId) {
        // ── Event-scoped: parallel fast upsert — no full program fetch needed ──
        const customerUpdateData: any = {
          callingStatus: "idle",
          callingBy: "",
          callingById: ""
        };
        if (lastAttendance && !lastAttendance.attended) {
          customerUpdateData.lastTimeAgreedButNotCome = {
            anyEmergency,
            forgetToCome,
            isDoingFalsePromise,
            lastTimeReason: lastTimeReason.trim(),
          };
        }

        await Promise.all([
          API.editCustomer({
            _id: customer._id,
            updateData: customerUpdateData,
          }),
          API.upsertOneAttendance({
            eventId: programId,
            customerId: customer._id,
            status: "called",
            response: responseVal,
            callingBy: currentUser?.name || "Admin",
          }),
        ]);
      } else {
        // ── Global profile update (no event context) ──
        await API.editCustomer({
          _id: customer._id,
          updateData: {
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
          },
        });
      }

      // Notify other clients via WebSockets
      const socket = getSocket();
      socket.connect();
      socket.emit("calling-stop", { customerId: customer._id, response: responseVal, programId });
      socket.emit("customer-update", { customerId: customer._id });
      if (programId) socket.emit("event-update", { programId });

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

      if (programId) {
        // ── Event-scoped: parallel fast upsert — no full program fetch needed ──
        const customerUpdateData: any = {
          callingStatus: "idle",
          callingBy: "",
          callingById: ""
        };
        if (lastAttendance && !lastAttendance.attended) {
          customerUpdateData.lastTimeAgreedButNotCome = {
            anyEmergency,
            forgetToCome,
            isDoingFalsePromise,
            lastTimeReason: lastTimeReason.trim(),
          };
        }

        await Promise.all([
          API.editCustomer({
            _id: customer._id,
            updateData: customerUpdateData,
          }),
          API.upsertOneAttendance({
            eventId: programId,
            customerId: customer._id,
            status: "called",
            response: responseVal,
            callingBy: currentUser?.name || "Admin",
          }),
        ]);
      } else {
        // ── Global profile update (no event context) ──
        await API.editCustomer({
          _id: customer._id,
          updateData: {
            callingStatus: "idle",
            callingBy: "",
            callingById: "",
            lastCallResponse: responseVal,
            outOfStation: { isOutOfStation: false, isOutOfStationPlace: "", tillDateOutOfStation: "" },
          },
        });
      }

      // Notify other clients via WebSockets
      const socket = getSocket();
      socket.connect();
      socket.emit("calling-stop", { customerId: customer._id, response: responseVal, programId });
      socket.emit("customer-update", { customerId: customer._id });
      if (programId) socket.emit("event-update", { programId });

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
        API.upsertOneAttendance({
          eventId: programId,
          customerId: customer._id,
          status: "invited",
          callingBy: "",
        }).catch(() => { }); // fire-and-forget, non-critical
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
      <ModalWrapper>
        <div
          className="fixed inset-0 bg-neutral-950/40 dark:bg-neutral-950/60 flex items-center justify-center z-50 p-4 backdrop-blur-xl"
          onClick={() => setShowOutOfStationForm(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[90%] animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-neutral-100 dark:border-zinc-800/80 flex justify-between items-center shrink-0">
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
            <div className="p-5 space-y-4 flex-1 overflow-y-auto min-h-0">
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
            <div className="p-4 bg-neutral-50 dark:bg-zinc-950/40 border-t border-neutral-100 dark:border-zinc-800/80 flex justify-end gap-2.5 shrink-0">
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
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper>
      <div
        className="fixed inset-0 bg-neutral-950/40 dark:bg-neutral-950/60 flex items-center justify-center z-50 p-4 backdrop-blur-xl"
        onClick={handleCancel}
      >
        <div
          className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[90%] animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >

          <div className="p-5 border-b border-neutral-100 dark:border-zinc-800/80 flex justify-between items-center shrink-0">
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

          <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Customer Details info strip */}
            <div className="bg-neutral-50 dark:bg-zinc-950/40 p-4 border-b border-neutral-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-neutral-800 dark:text-zinc-100 text-sm">{customer.name}</p>
                <p className="text-xs text-neutral-500 dark:text-zinc-455 mt-0.5 font-mono">{customer.phoneNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/91${customer.phoneNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold transition active:scale-95"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </a>
                <a
                  href={`tel:${customer.phoneNumber}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-100 dark:shadow-none transition active:scale-95"
                >
                  <Phone size={14} />
                  Call Now
                </a>
              </div>
            </div>

            {/* Last Attendance Info Section */}
            {programId && (
              loadingLastAttendance ? (
                <div className="p-4 border-b border-neutral-100 dark:border-zinc-800/80 flex justify-center items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                  <span className="text-xs text-neutral-500 dark:text-zinc-400 ml-2">Loading last attendance...</span>
                </div>
              ) : (lastAttendance && !lastAttendance.attended) ? (
                <div className="p-4 bg-amber-50/30 dark:bg-amber-950/10 border-b border-neutral-100 dark:border-zinc-800/80 space-y-3 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-550 dark:text-zinc-400">Last Attendance</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/50">
                      Absent
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="text-neutral-700 dark:text-zinc-300">
                      Event: <span className="font-semibold">{lastAttendance.eventTitle}</span>
                    </p>
                    <p className="text-neutral-500 dark:text-zinc-450 text-[11px]">
                      Date: {new Date(lastAttendance.eventDate).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {lastAttendance.response && lastAttendance.response !== "pending" && (
                      <p className="text-neutral-500 dark:text-zinc-455 text-[11px]">
                        Response (Promise): <span className="italic font-semibold">"{lastAttendance.response}"</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-neutral-200/50 dark:border-zinc-800/50 space-y-2.5">
                    {(lastAttendance.response === "yes, coming" || lastAttendance.response === "try to come") ? (
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>He promised to come but didn't show up.</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-neutral-500 dark:text-zinc-450 italic">
                        Did not attend last event.
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-neutral-400 dark:text-zinc-550 uppercase tracking-wider">
                        Why didn't they attend? (Select reasons)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <label className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${anyEmergency
                          ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-250 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400"
                          : "bg-white dark:bg-zinc-900 border-neutral-200 dark:border-zinc-800 text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-800"
                          }`}>
                          <input
                            type="checkbox"
                            checked={anyEmergency}
                            onChange={(e) => setAnyEmergency(e.target.checked)}
                            className="sr-only"
                          />
                          <span>Emergency</span>
                        </label>

                        <label className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${forgetToCome
                          ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-250 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400"
                          : "bg-white dark:bg-zinc-900 border-neutral-200 dark:border-zinc-800 text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-800"
                          }`}>
                          <input
                            type="checkbox"
                            checked={forgetToCome}
                            onChange={(e) => setForgetToCome(e.target.checked)}
                            className="sr-only"
                          />
                          <span>Forgot</span>
                        </label>

                        <label className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${isDoingFalsePromise
                          ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-250 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400"
                          : "bg-white dark:bg-zinc-900 border-neutral-200 dark:border-zinc-800 text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-800"
                          }`}>
                          <input
                            type="checkbox"
                            checked={isDoingFalsePromise}
                            onChange={(e) => setIsDoingFalsePromise(e.target.checked)}
                            className="sr-only"
                          />
                          <span>False Promise</span>
                        </label>
                      </div>

                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="Other reason or details..."
                          value={lastTimeReason}
                          onChange={(e) => setLastTimeReason(e.target.value)}
                          className="w-full premium-input text-xs py-2 px-3 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null
            )}

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
          </div>

          {/* Footer */}
          <div className="p-4 bg-neutral-50 dark:bg-zinc-950/40 border-t border-neutral-100 dark:border-zinc-800/80 flex justify-end gap-2.5 shrink-0">
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
    </ModalWrapper>
  );
}
