"use client";
import { useEffect, useRef, useState } from "react";
import { X, Phone, MessageCircle, Users, Save, BookOpen, MapPin, Calendar } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { useSelector } from "react-redux";
import API from "@/components/apiClient";
import { useCallingTracker } from "./useCallingTracker";
import CallResponseModal from "./CallResponseModal";
import { getSocket } from "@/lib/socket";
import { normalizePhone } from "@/lib/phoneUtils";
import "react-toastify/dist/ReactToastify.css";
import ModalWrapper from "@/components/ModalWrapper";

export default function EditCustomerModal({
  customer,
  users,
  onClose,
  refreshCustomerList,
}: any) {
  const [original, setOriginal] = useState<any>(null);
  const [edited, setEdited] = useState<any>(null);

  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const [connInput, setConnInput] = useState({
    name: "",
    relation: "",
    phoneNumber: "",
  });

  const unsavedActionRef = useRef<any>(null);

  // Get current user from Redux to pass to the call tracker
  const authState = useSelector((state: any) => state.auth);
  const currentUser = authState?.user;

  // Initialize the calling tracker hook
  const {
    activeCallCustomer,
    initiateCall,
    handleModalClose,
  } = useCallingTracker(currentUser, () => {
    // When a call feedback is saved, refresh lists and close modal
    if (refreshCustomerList) refreshCustomerList();
    onClose();
  });

  // Compare objects
  const isEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

  // Check dirty whenever edited changes
  useEffect(() => {
    if (!original || !edited) return;
    setDirty(!isEqual(original, edited));
  }, [edited, original]);

  // LOAD DATA WHEN MODAL OPENS
  useEffect(() => {
    if (!customer) return;

    const clone = JSON.parse(JSON.stringify(customer));

    if (!Array.isArray(clone.goodConnectionWith))
      clone.goodConnectionWith = [];

    if (!clone.outOfStation)
      clone.outOfStation = {
        isOutOfStation: false,
        isOutOfStationPlace: "",
      };
    setOriginal(JSON.parse(JSON.stringify(clone)));
    setEdited(JSON.parse(JSON.stringify(clone)));
    setEditMode(false);
    setDirty(false);
  }, [customer]);

  if (!customer || !edited) return null;

  // --- FIELD HANDLERS ---
  const handleField = (key: string, value: any) => {
    setEdited({ ...edited, [key]: value });
  };

  const handleNested = (parent: string, key: string, value: any) => {
    setEdited({
      ...edited,
      [parent]: { ...(edited[parent] || {}), [key]: value },
    });
  };

  // --- CLOSE LOGIC ---
  const closeModal = () => {
    if (dirty) {
      unsavedActionRef.current = () => onClose();
      setShowUnsavedModal(true);
    } else {
      onClose();
    }
  };

  // --- SAVE CLICK ---
  const handleSave = () => setShowSaveConfirm(true);

  const performSave = async () => {
    setShowSaveConfirm(false);
    try {
      const payload = { ...edited };
      if (payload.phoneNumber) {
        const normalized = normalizePhone(payload.phoneNumber);
        if (!normalized) {
           toast.error("Please provide a valid 10-digit phone number");
           return;
        }
        payload.phoneNumber = normalized;
      }
      
      await API.editCustomer({
        _id: customer._id,
        updateData: payload,
      });

      // Emit socket update and notifications
      try {
        const socket = getSocket();
        socket.connect();
        socket.emit("customer-update", { customerId: customer._id });

        const originalDoers = original?.whoCanFollowUp || [];
        const editedDoers = edited?.whoCanFollowUp || [];
        const newlyAssigned = editedDoers.filter((uid: string) => !originalDoers.includes(uid));

        if (newlyAssigned.length > 0) {
          socket.emit("new-notification", {
            type: "new-assignment",
            message: `Customer '${edited.name}' assigned to you`,
            createdAt: new Date(),
            customerName: edited.name,
            assignedUserIds: newlyAssigned,
            assignedBy: currentUser?.name || "Admin",
          });
        }
      } catch (sockErr) {
        console.error("Socket emit failed", sockErr);
      }

      setDirty(false);
      if (refreshCustomerList) refreshCustomerList();
      onClose();

      toast.success("Updated!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update");
    }
  };

  // --- UNSAVED CHANGES ---
  const handleUnsavedChoice = (choice: string) => {
    setShowUnsavedModal(false);

    if (choice === "save") return performSave();

    if (choice === "discard") {
      setEdited(JSON.parse(JSON.stringify(original)));
      setDirty(false);
      setEditMode(false);

      if (unsavedActionRef.current) unsavedActionRef.current();
      else onClose();
    }
  };

  // WhatsApp
  const openWhatsapp = () => {
    const raw = (edited.phoneNumber || original.phoneNumber || "").toString();
    const cleaned = raw.replace(/\D/g, "");

    if (!cleaned) {
      toast.error("Invalid phone number");
      return;
    }

    const finalNum = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
    window.open(`https://wa.me/${finalNum}`, "_blank");
  };

  const getFollowUpUser = (whoCanFollowUps: string[]) => {
    if (!Array.isArray(whoCanFollowUps) || !users || !Array.isArray(users)) {
      return [];
    }

    return whoCanFollowUps
      .map((id) => users.find((u: any) => u._id === id))
      .filter(Boolean);
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate consistent color for user
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500 dark:bg-blue-600",
      "bg-purple-500 dark:bg-purple-600",
      "bg-pink-500 dark:bg-pink-600",
      "bg-indigo-500 dark:bg-indigo-600",
      "bg-teal-500 dark:bg-teal-600",
      "bg-orange-500 dark:bg-orange-600",
      "bg-cyan-500 dark:bg-cyan-600",
      "bg-violet-500 dark:bg-violet-600",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const followUpUsers = getFollowUpUser(
    editMode ? edited.whoCanFollowUp || [] : original.whoCanFollowUp || []
  );

  // Toggle user in follow-up list
  const toggleFollowUpUser = (userId: string) => {
    const currentList = edited.whoCanFollowUp || [];
    const isAssigned = currentList.includes(userId);

    if (isAssigned) {
      setEdited({
        ...edited,
        whoCanFollowUp: currentList.filter((id: string) => id !== userId),
      });
    } else {
      setEdited({
        ...edited,
        whoCanFollowUp: [...currentList, userId],
      });
    }
  };

  return (
    <ModalWrapper>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-neutral-950/40 dark:bg-neutral-950/60 flex items-center justify-center z-50 p-4 backdrop-blur-xl"
        onClick={closeModal}
      >
        {/* MODAL */}
        <div
          className="bg-white dark:bg-zinc-900 shadow-xl rounded-2xl w-full max-w-lg max-h-[90%] sm:max-h-[85%] flex flex-col overflow-hidden animate-slideUp border border-neutral-100 dark:border-zinc-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="p-5 border-b border-neutral-100 dark:border-zinc-800/80 shrink-0">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-zinc-550">
                  Customer Profile
                </span>
                <h2 className="text-lg font-bold text-neutral-800 dark:text-zinc-100 font-display mt-0.5">
                  {original.name || "Customer Details"}
                </h2>
              </div>

              <button
                onClick={closeModal}
                className="p-1.5 rounded-full hover:bg-neutral-50 dark:hover:bg-zinc-850 text-neutral-400 dark:text-zinc-550 hover:text-neutral-600 dark:hover:text-zinc-300 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Apple style segmented control */}
            <div className="flex justify-between items-center bg-neutral-50 dark:bg-zinc-950/40 p-1 rounded-xl">
              <div className="flex gap-0.5 w-full">
                <button
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${!editMode
                    ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-neutral-500 dark:text-zinc-500 hover:text-neutral-800 dark:hover:text-zinc-300"
                    }`}
                  onClick={() => setEditMode(false)}
                >
                  View Details
                </button>
                <button
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${editMode
                    ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-neutral-500 dark:text-zinc-500 hover:text-neutral-800 dark:hover:text-zinc-300"
                    }`}
                  onClick={() => setEditMode(true)}
                >
                  Edit Profile
                </button>
              </div>

              {editMode && (
                <button
                  onClick={handleSave}
                  disabled={!dirty}
                  className={`ml-2 shrink-0 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 ${dirty
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                    : "bg-neutral-100 dark:bg-zinc-800 text-neutral-400 dark:text-zinc-600 cursor-not-allowed"
                    }`}
                >
                  <Save size={12} /> Save
                </button>
              )}
            </div>
          </div>

          {/* CONTENT */}
          <div className="overflow-y-auto flex-1 p-5 space-y-5 scrollable-content bg-neutral-50/30 dark:bg-zinc-950/20">
            {/* WHO CAN FOLLOW UP - VOLUNTEERS */}
            <div className="bg-white dark:bg-zinc-900/50 border border-neutral-100 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-neutral-500 dark:text-zinc-450 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Users size={14} className="text-indigo-500" />
                  Follow-up Volunteer(s)
                </span>
                {followUpUsers.length > 0 && (
                  <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 px-2 py-0.5 rounded-full font-bold">
                    {followUpUsers.length} Assigned
                  </span>
                )}
              </div>

              {/* View Assigned Users */}
              {!editMode ? (
                followUpUsers.length === 0 ? (
                  <p className="text-xs text-neutral-400 dark:text-zinc-550 italic py-1">No volunteers assigned to this youth.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {followUpUsers.map((user: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-neutral-50 dark:bg-zinc-950/30 border border-neutral-100 dark:border-zinc-800/50 rounded-xl px-2.5 py-1.5 flex items-center gap-2"
                      >
                        <div className={`w-6 h-6 rounded-lg ${getAvatarColor(user.name)} flex items-center justify-center text-white font-bold text-[10px]`}>
                          {getInitials(user.name)}
                        </div>
                        <span className="text-xs font-semibold text-neutral-700 dark:text-zinc-300">{user.name}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Edit Assigned Users Select grid */
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto scrollable-content py-1">
                  {users && users.length > 0 ? (
                    users.map((user: any) => {
                      const isAssigned = (edited.whoCanFollowUp || []).includes(user._id);
                      return (
                        <button
                          key={user._id}
                          onClick={() => toggleFollowUpUser(user._id)}
                          className={`rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 border text-xs transition duration-200 ${isAssigned
                            ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400 font-semibold"
                            : "bg-white dark:bg-zinc-900 border-neutral-200 dark:border-zinc-800 text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-800"
                            }`}
                        >
                          <div className={`w-5 h-5 rounded-md ${getAvatarColor(user.name)} flex items-center justify-center text-white font-bold text-[8px]`}>
                            {getInitials(user.name)}
                          </div>
                          <span>{user.name}</span>
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-xs text-neutral-400 dark:text-zinc-550 italic">No volunteers loaded.</span>
                  )}
                </div>
              )}
            </div>

            {/* SADHANA & DETAILS SECTION */}
            <div className="bg-white dark:bg-zinc-900/50 border border-neutral-100 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm space-y-4">
              <span className="text-xs font-bold text-neutral-500 dark:text-zinc-450 uppercase tracking-wider block font-sans">
                Profile Information
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* NAME */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Name</label>
                  {editMode ? (
                    <input
                      className="w-full premium-input py-2 text-xs"
                      value={edited.name}
                      onChange={(e) => handleField("name", e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-neutral-800 dark:text-zinc-100">{original.name || "-"}</p>
                  )}
                </div>

                {/* PHONE */}
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Phone</label>
                  {editMode ? (
                    <input
                      className="w-full premium-input py-2 text-xs"
                      value={edited.phoneNumber}
                      onChange={(e) => handleField("phoneNumber", e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-neutral-800 dark:text-zinc-100">{original.phoneNumber || "-"}</p>
                  )}
                </div>

                {/* AGE */}
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Age</label>
                  {editMode ? (
                    <input
                      type="number"
                      className="w-full premium-input py-2 text-xs"
                      value={edited.age || ""}
                      onChange={(e) => handleField("age", e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-neutral-800 dark:text-zinc-100">{original.age || "-"}</p>
                  )}
                </div>

                {/* CHANTING */}
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <BookOpen size={12} className="text-indigo-500" /> Chanting
                  </label>
                  {editMode ? (
                    <input
                      type="number"
                      className="w-full premium-input py-2 text-xs"
                      value={edited.chanting || ""}
                      onChange={(e) => handleField("chanting", e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-neutral-800 dark:text-zinc-100">{original.chanting || "0"} Rounds</p>
                  )}
                </div>

                {/* PROFESSION */}
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Profession</label>
                  {editMode ? (
                    <input
                      className="w-full premium-input py-2 text-xs"
                      value={edited.profession || ""}
                      onChange={(e) => handleField("profession", e.target.value)}
                      placeholder="e.g. Student, Engineer"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-neutral-800 dark:text-zinc-100">{original.profession || "-"}</p>
                  )}
                </div>

                {/* OUT OF STATION DETAILS */}
                <div className="col-span-1 sm:col-span-2 border-t border-neutral-100 dark:border-zinc-800/80 pt-3 mt-1">
                  <label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider block mb-2 font-sans">
                    Out of Station Details
                  </label>
                  
                  {editMode ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="col-span-1 flex items-center h-full">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={edited.outOfStation?.isOutOfStation || false}
                            onChange={(e) => handleNested("outOfStation", "isOutOfStation", e.target.checked)}
                            className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-semibold text-neutral-700 dark:text-zinc-300">Is Out of Station?</span>
                        </label>
                      </div>
                      <div className="col-span-1">
                        <label className="text-[10px] text-neutral-400 uppercase mb-1 block">Place</label>
                        <input
                          className="w-full premium-input py-1.5 text-xs"
                          value={edited.outOfStation?.isOutOfStationPlace || ""}
                          disabled={!edited.outOfStation?.isOutOfStation}
                          onChange={(e) => handleNested("outOfStation", "isOutOfStationPlace", e.target.value)}
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="text-[10px] text-neutral-400 uppercase mb-1 block">Return Date</label>
                        <input
                          type="date"
                          className="w-full premium-input py-1.5 text-xs"
                          value={edited.outOfStation?.tillDateOutOfStation || ""}
                          disabled={!edited.outOfStation?.isOutOfStation}
                          onChange={(e) => handleNested("outOfStation", "tillDateOutOfStation", e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-6">
                      <p className="text-xs font-semibold text-neutral-700 dark:text-zinc-300">
                        <span className="text-neutral-400 dark:text-zinc-500 font-normal mr-1">Status:</span>
                        {original.outOfStation?.isOutOfStation ? (
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Yes</span>
                        ) : "No"}
                      </p>
                      {original.outOfStation?.isOutOfStation && (
                        <>
                          <p className="text-xs font-semibold text-neutral-700 dark:text-zinc-300 flex items-center gap-1">
                            <MapPin size={12} className="text-amber-500" />
                            {original.outOfStation.isOutOfStationPlace || "-"}
                          </p>
                          <p className="text-xs font-semibold text-neutral-700 dark:text-zinc-300 flex items-center gap-1">
                            <Calendar size={12} className="text-amber-500" />
                            {original.outOfStation.tillDateOutOfStation || "-"}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* LAST CALL RESPONSE */}
                <div className="col-span-1 sm:col-span-2 border-t border-neutral-100 dark:border-zinc-800/80 pt-3 mt-1">
                  <label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
                    Last Call Response / Feedback
                  </label>
                  <div className="p-3 bg-neutral-50 dark:bg-zinc-950/40 border border-neutral-150 dark:border-zinc-850/30 rounded-xl space-y-2">
                    <p className="text-xs font-semibold text-neutral-700 dark:text-zinc-300 capitalize">
                      <span className="text-neutral-500 dark:text-zinc-500 font-normal mr-1">Response:</span>
                      {original.lastCallResponse && original.lastCallResponse !== "pending"
                        ? original.lastCallResponse
                        : "No feedback recorded yet"}
                    </p>
                    
                    {/* Display Non-Attendance Reasons */}
                    <div className="flex flex-wrap gap-2 items-center">
                      {original.lastTimeAgreedButNotCome?.anyEmergency && (
                        <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900 text-[10px] font-bold">Emergency</span>
                      )}
                      {original.lastTimeAgreedButNotCome?.forgetToCome && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900 text-[10px] font-bold">Forgot to come</span>
                      )}
                      {original.lastTimeAgreedButNotCome?.isDoingFalsePromise && (
                        <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900 text-[10px] font-bold">False Promise</span>
                      )}
                      {original.lastTimeAgreedButNotCome?.lastTimeReason && (
                        <span className="w-full text-[11px] italic text-neutral-500 dark:text-zinc-400">
                          Note: "{original.lastTimeAgreedButNotCome.lastTimeReason}"
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ADDRESS */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Address</label>
                  {editMode ? (
                    <textarea
                      className="w-full premium-input text-xs min-h-[60px]"
                      value={edited.address || ""}
                      onChange={(e) => handleField("address", e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-neutral-600 dark:text-zinc-400 leading-relaxed">{original.address || "-"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* FIXED FOOTER */}
          {!editMode && (
            <div className="p-4 bg-neutral-50 dark:bg-zinc-950/40 border-t border-neutral-100 dark:border-zinc-800/80 shrink-0">
              <div className="flex gap-3">
                <button
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-semibold shadow-md shadow-indigo-100 transition active:scale-95 duration-200"
                  onClick={() => initiateCall(original)}
                >
                  <Phone size={14} /> Call
                </button>

                <button
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-semibold shadow-md shadow-emerald-100 transition active:scale-95 duration-200"
                  onClick={openWhatsapp}
                >
                  <MessageCircle size={14} /> WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CALL FEEDBACK POPUP OVERLAY */}
      {activeCallCustomer && (
        <CallResponseModal
          customer={activeCallCustomer}
          currentUser={currentUser}
          onClose={handleModalClose}
        />
      )}

      {/* SAVE CONFIRMATION */}
      {showSaveConfirm && (
        <div
          className="fixed inset-0 bg-neutral-950/30 dark:bg-neutral-950/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSaveConfirm(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-xl w-full max-w-xs border border-neutral-100 dark:border-zinc-800 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-neutral-800 dark:text-zinc-100 text-sm">Save changes?</h3>
            <p className="text-xs text-neutral-400 dark:text-zinc-400 mt-1 leading-relaxed">
              Are you sure you want to write these modifications to the database?
            </p>

            <div className="flex justify-end gap-2 mt-5">
              <button
                className="px-3.5 py-1.5 border border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-zinc-400 rounded-lg text-xs font-semibold"
                onClick={() => setShowSaveConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm active:scale-95"
                onClick={performSave}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNSAVED CHANGES */}
      {showUnsavedModal && (
        <div
          className="fixed inset-0 bg-neutral-950/30 dark:bg-neutral-950/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowUnsavedModal(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-xl w-full max-w-xs border border-neutral-100 dark:border-zinc-800 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-neutral-800 dark:text-zinc-100 text-sm">Unsaved Changes</h3>
            <p className="text-xs text-neutral-400 dark:text-zinc-400 mt-1 leading-relaxed">
              You have modifications that are not stored yet. Save before closing?
            </p>

            <div className="flex flex-col gap-2 mt-5">
              <button
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                onClick={() => handleUnsavedChoice("save")}
              >
                Save Changes
              </button>
              <button
                className="w-full py-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-450 border border-rose-100 dark:border-rose-900/50 rounded-lg text-xs font-semibold"
                onClick={() => handleUnsavedChoice("discard")}
              >
                Discard Modifications
              </button>
              <button
                className="w-full py-2 border border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-zinc-450 rounded-lg text-xs font-semibold"
                onClick={() => handleUnsavedChoice("cancel")}
              >
                Stay on Profile
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-left" autoClose={3000} />
    </ModalWrapper>
  );
}