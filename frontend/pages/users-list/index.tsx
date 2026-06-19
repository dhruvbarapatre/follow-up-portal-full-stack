"use client";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import AssignModal from "../../components/my-list-com/AssignModal";
import UserCard from "../../components/my-list-com/User-card";
import { toast, ToastContainer } from "react-toastify";
import { PersistData } from "../../components/my-list-com/types";
import API from "@/components/apiClient";
import { getSocket } from "@/lib/socket";
import "react-toastify/dist/ReactToastify.css";

const UserListPage = () => {
    const auth = useSelector((s: PersistData) => s.auth);
    const [users, setUsers] = useState([]);
    const [unreserved, setUnreserved] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingUnreserved, setLoadingUnreserved] = useState(true);
    const [assignCustomer, setAssignCustomer] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

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

    useEffect(() => {
        if (!auth?.token) return;

        if (auth?.user?.role === "superAdmin" || auth?.user?.role === "admin") {
            loadUsers();
            loadUnreserved();
        }

        const socket = getSocket();
        socket.connect();
        socket.on("online-users-list", (list: string[]) => {
            setOnlineUsers(list);
        });
        socket.emit("request-online-users");

        return () => {
            socket.off("online-users-list");
        };
    }, [auth?.token, auth?.user?.role]);

    const Loader = () => (
        <div className="flex justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="p-5 sm:p-6 space-y-6">
            <div className="animate-fadeIn space-y-6">
                {(auth?.user?.role === "superAdmin" || auth?.user?.role === "admin") && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-bold text-neutral-800 dark:text-zinc-155 font-display uppercase tracking-tight">Follow Up Doers</h1>
                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 rounded-full">
                                    {users.length} doers
                                </span>
                            </div>
                        </div>

                        {loadingUsers ? (
                            <Loader />
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {users.length === 0 ? (
                                    <p className="text-xs text-neutral-450 italic text-center py-6">
                                        No users found in organization.
                                    </p>
                                ) : (
                                    users.map((u: any) => (
                                        <UserCard
                                            key={u._id}
                                            user={u}
                                            users={users}
                                            isOpen={true}
                                            onOpen={() => setSelectedUser(u)}
                                            onlineUsers={onlineUsers}
                                        />
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {assignCustomer && (
                <AssignModal
                    customer={assignCustomer}
                    users={users}
                    onClose={() => setAssignCustomer(null)}
                    reload={loadUnreserved}
                />
            )}
            
            <ToastContainer position="bottom-left" autoClose={3000} />
        </div>
    );
};

export default UserListPage;
