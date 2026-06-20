"use client";
import React, { useEffect, useState } from "react";
import { Phone, MessageCircle, UserPlus, X, UserCheck, Inbox, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useSelector } from "react-redux";
import EditCustomerModal from "../../components/my-list-com/EditCustomerModal";
import AssignModal from "../../components/my-list-com/AssignModal";
import UserCard from "../../components/my-list-com/User-card";
import CallResponseModal from "../../components/my-list-com/CallResponseModal";
import { toast, ToastContainer } from "react-toastify";
import { PersistData } from "../../components/my-list-com/types";
import API from "@/components/apiClient";
import { useCallingTracker } from "../../components/my-list-com/useCallingTracker";
import { getSocket } from "@/lib/socket";
import "react-toastify/dist/ReactToastify.css";

const UserListPage = () => {
  const auth = useSelector((s: PersistData) => s.auth);
  const currentUser = auth?.user;

  const [users, setUsers] = useState<any[]>([]);
  const [unreserved, setUnreserved] = useState<any[]>([]);
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // loaders
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingUnreserved, setLoadingUnreserved] = useState(true);
  const [loadingCustomerList, setLoadingCustomerList] = useState(true);

  // Modals
  const [assignCustomer, setAssignCustomer] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  // Collapsible states
  const [isAssignedCollapsed, setIsAssignedCollapsed] = useState(false);
  const [isUnreservedCollapsed, setIsUnreservedCollapsed] = useState(false);

  // Calling Tracker Hook
  const {
    activeCallCustomer,
    liveCallingStates,
    initiateCall,
    handleModalClose,
  } = useCallingTracker(currentUser, () => {
    if (selectedUserId) {
      loadCustomerList(selectedUserId);
    }
  });

  // ============================
  // LOAD USERS
  // ============================
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await API.getAllUsers(auth.token);
      setUsers(res.data.data || []);
    } catch {
      toast.error("Failed to load users");
    }
    setLoadingUsers(false);
  };

  // ============================
  // LOAD UNRESERVED CUSTOMERS
  // ============================
  const loadUnreserved = async () => {
    setLoadingUnreserved(true);
    try {
      const res = await API.getUnReserved(auth.token);
      setUnreserved(res.data.data || []);
    } catch {
      toast.error("Failed to load unreserved list");
    }
    setLoadingUnreserved(false);
  };

  // ============================
  // LOAD CUSTOMER LIST FOR SPECIFIC USER
  // ============================
  const loadCustomerList = async (userId: string) => {
    if (!userId) return;
    setLoadingCustomerList(true);
    try {
      const res = await API.getUserList(userId);
      setCustomerList(res.data.data || []);
    } catch {
      toast.error("Failed to load customer list");
    }
    setLoadingCustomerList(false);
  };

  useEffect(() => {
    if (auth?.token) {
      loadUsers(); // load users for mapping doer names & dropdowns for all roles
      if (auth?.user?.role === "superAdmin" || auth?.user?.role === "admin") {
        loadUnreserved();
      }
    }
  }, [auth?.token, auth?.user?.role]);

  useEffect(() => {
    if (auth?.user?.id) {
      setSelectedUserId(auth.user.id);
    }
  }, [auth?.user?.id]);

  useEffect(() => {
    if (selectedUserId) {
      loadCustomerList(selectedUserId);
    }
  }, [selectedUserId]);

  // Real-time synchronization for changes (assignments, edits, attendance) via WebSockets
  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const handleUpdate = () => {
      console.log("MyList: Received live update event");
      if (selectedUserId) {
        loadCustomerList(selectedUserId);
      }
      if (auth?.user?.role === "superAdmin" || auth?.user?.role === "admin") {
        loadUnreserved();
      }
    };

    socket.on("customer-update", handleUpdate);
    socket.on("attendance-update", handleUpdate);
    socket.on("event-update", handleUpdate);

    return () => {
      socket.off("customer-update", handleUpdate);
      socket.off("attendance-update", handleUpdate);
      socket.off("event-update", handleUpdate);
    };
  }, [selectedUserId, auth?.user?.role]);

  // --------- Loader Component ----------
  const Loader = () => (
    <div className="flex justify-center py-12">
      <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
    </div>
  );


  const selectedUserName = users.find((u: any) => u._id === selectedUserId)?.name || currentUser?.name || "User";

  return (
    <div className="p-5 sm:p-6 space-y-8">
      <div className="animate-fadeIn space-y-8">
        {/* ===================== CUSTOMER LIST ===================== */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-100 dark:border-zinc-800/80">
            <div
              className="flex items-center gap-2 cursor-pointer select-none hover:opacity-80 transition duration-205"
              onClick={() => setIsAssignedCollapsed(!isAssignedCollapsed)}
            >
              <h2 className="text-base font-bold text-neutral-855 dark:text-zinc-100 font-display uppercase tracking-tight">
                {selectedUserId === currentUser?.id ? "My Assigned Customers" : `Assigned Customers of ${selectedUserName}`}
              </h2>
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-955/30 border border-indigo-100 dark:border-indigo-900/50 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 rounded-full font-sans shrink-0">
                {customerList.length} total
              </span>
              <span className="p-1 rounded-lg bg-neutral-105/50 dark:bg-zinc-850/50 text-neutral-450 dark:text-zinc-400 hover:text-indigo-500 transition shadow-inner">
                {isAssignedCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </span>
            </div>

            {/* User Selector for Admins */}
            {(auth?.user?.role === "superAdmin" || auth?.user?.role === "admin") && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-neutral-450 dark:text-zinc-400 font-semibold font-sans whitespace-nowrap">View Doer List:</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="premium-input py-1 px-3 text-xs bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 text-neutral-800 dark:text-zinc-100 rounded-xl"
                >
                  <option value={currentUser?.id}>Me ({currentUser?.name})</option>
                  {users
                    .filter((u: any) => u._id !== currentUser?.id)
                    .map((u: any) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {!isAssignedCollapsed && (
            loadingCustomerList ? (
              <Loader />
            ) : customerList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 neumorphic-inset text-center">
                <Inbox className="w-10 h-10 text-neutral-300 dark:text-zinc-650 mb-3" />
                <p className="text-xs font-semibold text-neutral-500 dark:text-zinc-300">This list is empty</p>
                <p className="text-[10px] text-neutral-400 dark:text-zinc-550 mt-1 max-w-[200px] leading-relaxed">
                  No follow-up assignments have been recorded for this user.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customerList.map((c: any) => {
                  const isExpanded = expandedCustomerId === c._id;
                  const isCallingLocally = liveCallingStates[c._id]?.status === "calling" || c.callingStatus === "calling";
                  const caller = liveCallingStates[c._id]?.callingBy || c.callingBy;

                  const assignedDoers = c.whoCanFollowUp
                    ? c.whoCanFollowUp
                      .map((uid: string) => users.find((u: any) => u._id === uid))
                      .filter(Boolean)
                    : [];

                  return (
                    <div
                      key={c._id}
                      className={`neumorphic-card neumorphic-card-hover p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 border-l-4 ${isExpanded
                        ? "border-l-indigo-500 bg-[#161619]"
                        : isCallingLocally
                          ? "border-l-rose-500"
                          : "border-l-transparent"
                        }`}
                    >
                      <div
                        className="flex justify-between items-center cursor-pointer select-none"
                        onClick={() => setExpandedCustomerId(isExpanded ? null : c._id)}
                      >
                        <div className="space-y-1 pr-3 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-neutral-805 dark:text-zinc-100 hover:text-indigo-400 transition-colors truncate">
                              {c.name}
                            </span>
                            {isCallingLocally && (
                              <span className="text-[9px] font-extrabold px-2 py-0.5 bg-rose-950/20 text-rose-450 border border-rose-900/50 rounded-full animate-pulse">
                                {caller} calling...
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-450 dark:text-zinc-500 font-sans">
                            {c.phoneNumber}
                          </p>
                        </div>

                        <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => initiateCall(c)}
                            disabled={isCallingLocally && caller !== currentUser?.name}
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition active:scale-95 ${isCallingLocally && caller !== currentUser?.name
                              ? "bg-zinc-800 text-zinc-650 cursor-not-allowed shadow-none"
                              : "bg-indigo-650 hover:bg-indigo-700 text-white shadow-md shadow-indigo-950/50 neumorphic-btn"
                              }`}
                          >
                            <Phone size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Content Detail */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-4 animate-slideUp">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block font-sans">Age</span>
                              <span className="font-semibold text-zinc-200">{c.age || "-"}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block font-sans">Chanting</span>
                              <span className="font-semibold text-zinc-200">{c.chanting ? `${c.chanting} Rounds` : "-"}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block font-sans">Profession</span>
                              <span className="font-semibold text-zinc-200">{c.profession || "-"}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block font-sans">Address</span>
                              <span className="font-semibold text-zinc-200 block truncate" title={c.address}>{c.address || "-"}</span>
                            </div>
                          </div>

                          {assignedDoers.length > 0 && (
                            <div>
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5 font-sans">Assigned Volunteers</span>
                              <div className="flex flex-wrap gap-1.5">
                                {assignedDoers.map((doer: any) => (
                                  <span key={doer._id} className="px-2.5 py-1 bg-zinc-950/40 border border-zinc-800 rounded-xl text-[11px] text-zinc-300 flex items-center gap-1.5 font-sans">
                                    <span className="w-4 h-4 rounded bg-indigo-500 text-white flex items-center justify-center text-[9px] font-black uppercase font-sans">{doer.name.charAt(0)}</span>
                                    {doer.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {c.note && (
                            <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-850/60">
                              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1 font-sans">Remarks / Note</span>
                              <p className="text-xs text-zinc-300 italic">"{c.note}"</p>
                            </div>
                          )}

                          {/* Inline Quick Call Logger */}
                          <div className="space-y-2 pt-1">
                            <span className="text-[10px] text-indigo-450 font-bold uppercase tracking-wider block font-sans">Quick Log Response</span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {[
                                { value: "comes to youth class", label: "Comes to class" },
                                { value: "try to come", label: "Try to come" },
                                { value: "out of station", label: "Out of station" },
                                { value: "excuse", label: "Excuse / Busy" },
                                { value: "no", label: "No (Not Coming)" },
                                { value: "not picked up", label: "No Answer" },
                              ].map((opt) => {
                                const isActive = c.lastCallResponse?.toLowerCase() === opt.value.toLowerCase();
                                return (
                                  <button
                                    key={opt.value}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (opt.value === "out of station") {
                                        // Out of station requires date/place, so edit full profile
                                        setEditCustomer(c);
                                        return;
                                      }
                                      try {
                                        await API.editCustomer({
                                          _id: c._id,
                                          updateData: {
                                            lastCallResponse: opt.value,
                                            callingStatus: "idle",
                                            callingBy: "",
                                            callingById: "",
                                          },
                                        });
                                        const socket = getSocket();
                                        socket.emit("customer-update", { customerId: c._id });
                                        toast.success(`Logged: ${opt.label}`);
                                        loadCustomerList(selectedUserId);
                                      } catch {
                                        toast.error("Failed to log response");
                                      }
                                    }}
                                    className={`py-2 px-1.5 rounded-xl border text-[10px] font-bold text-center transition-all font-sans ${isActive
                                      ? "bg-indigo-950/20 border-indigo-500/50 text-indigo-400 font-extrabold shadow-inner"
                                      : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-255 hover:bg-zinc-800"
                                      }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex gap-2.5 pt-2 border-t border-zinc-850/40">
                            <button
                              onClick={() => {
                                const raw = (c.phoneNumber || "").toString().replace(/\D/g, "");
                                const finalNum = raw.startsWith("91") ? raw : `91${raw}`;
                                window.open(`https://wa.me/${finalNum}`, "_blank");
                              }}
                              className="flex-1 py-2.5 px-3 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-950/50 neumorphic-btn"
                            >
                              WhatsApp
                            </button>
                            <button
                              onClick={() => setEditCustomer(c)}
                              className="flex-1 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm neumorphic-btn"
                            >
                              Edit Profile
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* ===================== UNRESERVED CUSTOMERS ===================== */}
        {(auth?.user?.role === "superAdmin" || auth?.user?.role === "admin") && (
          <div className="space-y-4 border-t border-neutral-100 dark:border-zinc-800/80 pt-6">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-zinc-800/80">
              <div
                className="flex items-center gap-2 cursor-pointer select-none hover:opacity-80 transition duration-205"
                onClick={() => setIsUnreservedCollapsed(!isUnreservedCollapsed)}
              >
                <h2 className="text-base font-bold text-neutral-805 dark:text-zinc-100 font-display uppercase tracking-tight">Unreserved Customers</h2>
                <span className="px-2 py-0.5 bg-amber-55/20 border border-amber-900/50 text-[10px] font-bold text-amber-500 rounded-full font-sans">
                  {unreserved.length} available
                </span>
                <span className="p-1 rounded-lg dark:bg-zinc-850/50 text-neutral-450 dark:text-zinc-400 hover:text-indigo-500 transition shadow-inner">
                  {isUnreservedCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </span>
              </div>
            </div>

            {!isUnreservedCollapsed && (
              loadingUnreserved ? (
                <Loader />
              ) : unreserved.length === 0 ? (
                <p className="text-xs text-neutral-455 dark:text-zinc-500 italic text-center py-6">
                  All youth have been allocated!
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {unreserved.map((c: any) => {
                    const liveState = liveCallingStates[c._id];
                    const isCalling = liveState?.status === "calling" || c.callingStatus === "calling";
                    const caller = liveState?.callingBy || c.callingBy;

                    return (
                      <div
                        key={c._id}
                        className="p-4 bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800/80 shadow-premium rounded-xl flex justify-between items-center group hover:border-neutral-200 dark:hover:border-zinc-700 transition duration-200"
                      >
                        <div>
                          <p className="font-semibold text-neutral-800 dark:text-zinc-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{c.name}</p>
                          <p className="text-xs text-neutral-400 dark:text-zinc-500 mt-0.5 flex items-center gap-2 font-sans">
                            <span>{c.phoneNumber}</span>
                            {isCalling && (
                              <span className="text-[9px] font-extrabold text-rose-500 dark:text-rose-455 animate-pulse uppercase tracking-wider">
                                ({caller} calling)
                              </span>
                            )}
                          </p>
                        </div>

                        <button
                          onClick={() => setAssignCustomer(c)}
                          className="px-3 py-1.5 bg-amber-50 dark:bg-amber-955/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 rounded-xl text-xs font-semibold flex items-center gap-1 transition active:scale-95 duration-200"
                        >
                          <UserPlus size={12} /> Assign
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ===================== MODALS ===================== */}
      {assignCustomer && (
        <AssignModal
          customer={assignCustomer}
          users={users}
          onClose={() => setAssignCustomer(null)}
          reload={() => {
            loadUnreserved();
            if (selectedUserId) {
              loadCustomerList(selectedUserId);
            }
          }}
        />
      )}

      {editCustomer && (
        <EditCustomerModal
          customer={editCustomer}
          users={users}
          onClose={() => setEditCustomer(null)}
          refreshCustomerList={() => {
            if (selectedUserId) {
              loadCustomerList(selectedUserId);
            }
          }}
        />
      )}

      {/* CALL RESPONSE OVERLAY */}
      {activeCallCustomer && (
        <CallResponseModal
          customer={activeCallCustomer}
          currentUser={currentUser}
          onClose={handleModalClose}
        />
      )}

      <ToastContainer position="bottom-left" autoClose={3000} />
    </div>
  );
};

export default UserListPage;
