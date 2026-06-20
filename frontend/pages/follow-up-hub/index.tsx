"use client";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import EditCustomerModal from "../../components/my-list-com/EditCustomerModal";
import UserCard from "../../components/my-list-com/User-card";
import { toast, ToastContainer } from "react-toastify";
import { PersistData } from "../../components/my-list-com/types";
import API from "@/components/apiClient";
import CustomerTable from "@/components/my-list-com/CustomerTable";
import { useCallingTracker } from "../../components/my-list-com/useCallingTracker";
import { getSocket } from "@/lib/socket";
import "react-toastify/dist/ReactToastify.css";

const UserListPage = () => {
  const auth = useSelector((s: PersistData) => s?.auth);
  const currentUser = auth?.user;

  const [users, setUsers] = useState<any[]>([]);
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingCustomerList, setLoadingCustomerList] = useState(true);
  const [editCustomer, setEditCustomer] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isTableCollapsed, setIsTableCollapsed] = useState(false);
  const [isDoersCollapsed, setIsDoersCollapsed] = useState(false);

  // Calling Tracker Hook
  const { liveCallingStates } = useCallingTracker(currentUser);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await API.getAllUsers(auth?.token);
      setUsers(res?.data?.data || []);
    } catch {
      toast.error("Failed to load users");
    }
    setLoadingUsers(false);
  };

  const loadCustomerList = async () => {
    setLoadingCustomerList(true);
    try {
      const res = await API.getAllCustomers();
      setCustomerList(res?.data?.data || []);
    } catch {
      toast.error("Failed to load customer list");
    }
    setLoadingCustomerList(false);
  };

  useEffect(() => {
    if (!auth?.token) return;

    loadUsers();
    loadCustomerList();

    const socket = getSocket();
    socket.connect();
    socket.on("online-users-list", (list: string[]) => {
      setOnlineUsers(list);
    });
    socket.emit("request-online-users");

    const handleUpdate = () => {
      console.log("FollowUpHub: Received live update event");
      loadCustomerList();
      loadUsers();
    };

    socket.on("customer-update", handleUpdate);
    socket.on("attendance-update", handleUpdate);
    socket.on("event-update", handleUpdate);

    return () => {
      socket.off("online-users-list");
      socket.off("customer-update", handleUpdate);
      socket.off("attendance-update", handleUpdate);
      socket.off("event-update", handleUpdate);
    };
  }, [auth?.token]);

  const Loader = () => (
    <div className="flex justify-center py-12">
      <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="p-5 sm:p-6 space-y-8">
      <div className="animate-fadeIn space-y-8">
        {/* ===================== CUSTOMER LIST ===================== */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-100 dark:border-zinc-800/80">
            <div
              className="flex items-center gap-2 cursor-pointer select-none hover:opacity-80 transition duration-205"
              onClick={() => setIsTableCollapsed(!isTableCollapsed)}
            >
              <h2 className="text-base font-bold text-neutral-800 dark:text-zinc-100 font-display uppercase tracking-tight">Follow Up Hub</h2>
              <span className="px-2 py-0.5 bg-indigo-55/20 text-indigo-400 border border-indigo-900/50 text-[10px] font-bold rounded-full font-sans">
                {customerList?.length} total
              </span>
              <span className="p-1 rounded-lg
    bg-neutral-100/80 dark:bg-zinc-800/80
    text-neutral-500 dark:text-zinc-300
    border border-neutral-200 dark:border-zinc-700
    shadow-inner
    hover:text-indigo-500 dark:hover:text-indigo-400
    hover:scale-105
    transition-all duration-300 ease-in-out">
                {isTableCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </span>
            </div>

            {/* Neumorphic Search Bar */}
            {!isTableCollapsed && (
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-450 dark:text-zinc-550">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Search youth by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full premium-input !pl-9 text-xs py-2 bg-white dark:bg-zinc-900 shadow-sm neumorphic-input"
                />
              </div>
            )}
          </div>

          {!isTableCollapsed && (
            <>
              {loadingCustomerList ? (
                <Loader />
              ) : customerList?.length === 0 ? (
                <p className="text-xs text-neutral-400 dark:text-zinc-550 italic text-center py-6">
                  No customers found in directory.
                </p>
              ) : (() => {
                const filtered = customerList?.filter(c =>
                  c?.name?.toLowerCase().includes(searchQuery?.toLowerCase()) ||
                  String(c?.phoneNumber ?? "").includes(searchQuery)
                );
                return (
                  <CustomerTable
                    list={filtered}
                    liveCallingStates={liveCallingStates}
                    onEdit={(c: any) => setEditCustomer(c)}
                    hideResponses={true}
                    users={users}
                  />
                );
              })()}
            </>
          )}
        </div>

        {/* ===================== USERS (VOLUNTEERS) ===================== */}
        {(auth?.user?.role === "superAdmin" || auth?.user?.role === "admin") && (
          <div className="space-y-4 border-t border-neutral-100 dark:border-zinc-800/80 pt-6">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-zinc-800/80">
              <div
                className="flex items-center gap-2 cursor-pointer select-none hover:opacity-80 transition duration-205"
                onClick={() => setIsDoersCollapsed(!isDoersCollapsed)}
              >
                <h2 className="text-base font-bold text-neutral-800 dark:text-zinc-100 font-display uppercase tracking-tight">Follow Up Doers</h2>
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 rounded-full font-sans">
                  {users?.length} doers
                </span>
                <span className="p-1 rounded-lg
    bg-neutral-100/80 dark:bg-zinc-800/80
    text-neutral-500 dark:text-zinc-300
    border border-neutral-200 dark:border-zinc-700
    shadow-inner
    hover:text-indigo-500 dark:hover:text-indigo-400
    hover:scale-105
    transition-all duration-300 ease-in-out">
                  {isDoersCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </span>
              </div>
            </div>

            {!isDoersCollapsed && (
              <>
                {loadingUsers ? (
                  <Loader />
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {users?.length === 0 ? (
                      <p className="text-xs text-neutral-400 dark:text-zinc-550 italic text-center py-6">
                        No users found in organization.
                      </p>
                    ) : (
                      users?.map((u: any) => (
                        <UserCard
                          key={u?._id}
                          user={u}
                          customerList={customerList}
                          users={users}
                          onlineUsers={onlineUsers}
                        />
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ===================== MODALS ===================== */}
      {editCustomer && (
        <EditCustomerModal
          customer={editCustomer}
          users={users}
          onClose={() => setEditCustomer(null)}
          refreshCustomerList={loadCustomerList}
        />
      )}

      <ToastContainer position="bottom-left" autoClose={3000} />
    </div>
  );
};

export default UserListPage;
