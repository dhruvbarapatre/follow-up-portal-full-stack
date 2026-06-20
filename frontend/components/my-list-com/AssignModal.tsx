"use client";
import { X, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useSelector } from "react-redux";
import { PersistData } from "./types";
import API from "@/components/apiClient";
import { getSocket } from "@/lib/socket";
import "react-toastify/dist/ReactToastify.css";

export default function AssignModal({ customer, users, onClose, reload }: any) {
  const [selected, setSelected] = useState("");
  const [assigned, setAssigned] = useState<any[]>([]);
  const [userList, setUserList] = useState(users || []);
  const auth = useSelector((s: PersistData) => s.auth);

  const handleAdd = () => {
    if (!selected) return toast.error("Select a user");

    if (assigned.find((u: any) => u._id === selected)) {
      return toast.error("Already added");
    }

    const user = userList?.find((u: any) => u._id === selected);
    if (user) setAssigned([...assigned, user]);
    setSelected("");
  };

  const handleSubmit = async () => {
    if (assigned.length === 0)
      return toast.error("Add at least one user");

    const payload = {
      customerId: customer._id,
      UsersIds: assigned.map((u: any) => u._id),
      userType: auth.user.userType,
    };

    try {
      const res = await API.assignCustomer(payload);
      toast.success(res.data.message || "Assigned successfully!");

      try {
        const socket = getSocket();
        socket.connect();
        socket.emit("customer-update", { customerId: customer._id });
        socket.emit("new-notification", {
          type: "new-assignment",
          message: `Customer '${customer.name}' assigned to you`,
          createdAt: new Date(),
          customerName: customer.name,
          assignedUserIds: assigned.map((u: any) => u._id),
          assignedBy: auth.user.name,
        });
      } catch (sockErr) {
        console.error("Socket emit failed", sockErr);
      }

      reload();
      setTimeout(onClose, 1000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to assign customer.");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-neutral-950/40 dark:bg-neutral-950/60 flex items-center justify-center z-50 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 w-full max-w-md p-4 sm:p-6 rounded-2xl shadow-xl overflow-y-auto max-h-[90%] animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-neutral-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-800 dark:text-zinc-100">Assign Follow Up</h3>
              <p className="text-xs text-neutral-500 dark:text-zinc-400">Allocate youth to follow-up doers</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-neutral-400 dark:text-zinc-550 hover:text-neutral-600 dark:hover:text-zinc-300">
            <X size={18} />
          </button>
        </div>

        {/* Customer Detail Card */}
        <div className="bg-neutral-50 dark:bg-zinc-950/40 p-4 rounded-xl mb-5 border border-transparent dark:border-zinc-800/50">
          <p className="font-semibold text-neutral-800 dark:text-zinc-100 text-sm">{customer.name}</p>
          <p className="text-xs text-neutral-450 dark:text-zinc-500 mt-0.5">{customer.phoneNumber}</p>
        </div>

        {/* User Select */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">Select Follow Up Doer</label>
          <div className="flex gap-2">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="flex-1 min-w-0 w-full premium-input py-2 text-xs bg-white dark:bg-zinc-900 text-neutral-800 dark:text-zinc-100"
            >
              <option value="">-- Choose User --</option>
              {userList?.map((u: any) => (
                <option key={u._id} value={u._id} className="bg-white dark:bg-zinc-900 text-neutral-800 dark:text-zinc-100">
                  {u.name} ({u.phoneNumber})
                </option>
              ))}
            </select>

            <button
              onClick={handleAdd}
              className="px-4 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition active:scale-95 duration-200"
            >
              <UserPlus size={14} /> Add
            </button>
          </div>
        </div>

        {/* Assigned List */}
        <div className="mt-5 border-t border-neutral-100 dark:border-zinc-800/80 pt-4">
          <p className="text-xs font-semibold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            {assigned.length} user(s) assigned
          </p>
          {assigned.length === 0 ? (
            <p className="text-xs text-neutral-400 dark:text-zinc-500 italic">No doers assigned yet. Select one above.</p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto scrollable-content py-1">
              {assigned.map((u: any) => (
                <div
                  key={u._id}
                  className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-indigo-750 dark:text-indigo-300 text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <span className="font-medium">{u.name}</span>
                  <button
                    onClick={() =>
                      setAssigned(assigned.filter((x: any) => x._id !== u._id))
                    }
                    className="hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 rounded-full p-0.5 transition"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-neutral-100 dark:border-zinc-800/80 pt-4 mt-6">
          <button onClick={onClose} className="px-4 py-2 border border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 rounded-lg text-xs font-semibold text-neutral-600 dark:text-zinc-400 transition">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-50/50 flex items-center gap-1.5 transition active:scale-95 duration-200"
          >
            <UserPlus size={14} />
            Assign Customer
          </button>
        </div>
      </div>
      <ToastContainer position="bottom-left" autoClose={2000} />
    </div>
  );
}
