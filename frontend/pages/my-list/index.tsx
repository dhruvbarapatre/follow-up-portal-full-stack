"use client";
import React, { useEffect, useState } from "react";
import { Phone, MessageCircle, UserPlus, X, UserCheck, Inbox, AlertCircle } from "lucide-react";
import { useSelector } from "react-redux";
import EditCustomerModal from "../../components/my-list-com/EditCustomerModal";
import AssignModal from "../../components/my-list-com/AssignModal";
import UserCard from "../../components/my-list-com/User-card";
import { toast, ToastContainer } from "react-toastify";
import { PersistData } from "../../components/my-list-com/types";
import API from "@/components/apiClient";
import CustomerTable from "@/components/my-list-com/CustomerTable";
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

  // Calling Tracker Hook
  const { liveCallingStates } = useCallingTracker(currentUser);

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
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-850 dark:text-zinc-100 font-display uppercase tracking-tight">
                {selectedUserId === currentUser?.id ? "My Assigned Customers" : `Assigned Customers of ${selectedUserName}`}
              </h2>
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 rounded-full font-sans shrink-0">
                {customerList.length} total
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

          {loadingCustomerList ? (
            <Loader />
          ) : customerList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-neutral-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 text-center">
              <Inbox className="w-10 h-10 text-neutral-300 dark:text-zinc-650 mb-3" />
              <p className="text-xs font-semibold text-neutral-500 dark:text-zinc-300">This list is empty</p>
              <p className="text-[10px] text-neutral-400 dark:text-zinc-500 mt-1 max-w-[200px] leading-relaxed">
                No follow-up assignments have been recorded for this user.
              </p>
            </div>
          ) : (
            <CustomerTable
              list={customerList}
              liveCallingStates={liveCallingStates}
              onEdit={(c: any) => setEditCustomer(c)}
              hideResponses={true}
              users={users}
            />
          )}
        </div>

        {/* ===================== UNRESERVED CUSTOMERS ===================== */}
        {(auth?.user?.role === "superAdmin" || auth?.user?.role === "admin") && (
          <div className="space-y-4 border-t border-neutral-100 dark:border-zinc-800/80 pt-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-805 dark:text-zinc-100 font-display uppercase tracking-tight">Unreserved Customers</h2>
                <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 text-[10px] font-bold text-amber-600 dark:text-amber-400 rounded-full font-sans">
                  {unreserved.length} available
                </span>
              </div>
            </div>

            {loadingUnreserved ? (
              <Loader />
            ) : unreserved.length === 0 ? (
              <p className="text-xs text-neutral-450 dark:text-zinc-500 italic text-center py-6">
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
                            <span className="text-[9px] font-extrabold text-rose-500 dark:text-rose-400 animate-pulse uppercase tracking-wider">
                              ({caller} calling)
                            </span>
                          )}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => setAssignCustomer(c)}
                        className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 rounded-xl text-xs font-semibold flex items-center gap-1 transition active:scale-95 duration-200"
                      >
                        <UserPlus size={12} /> Assign
                      </button>
                    </div>
                  );
                })}
              </div>
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

      <ToastContainer position="bottom-left" autoClose={3000} />
    </div>
  );
};

export default UserListPage;
