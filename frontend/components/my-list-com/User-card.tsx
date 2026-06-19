"use client";
import React, { useEffect, useState } from "react";
import { Phone, MessageCircle, X, ShieldAlert, Award } from "lucide-react";
import API from "../apiClient";
import { useSelector } from "react-redux";
import { PersistData } from "./types";
import { toast, ToastContainer } from "react-toastify";

// Simple Popup Component
function UserPopup({ isOpen, onClose, user, isOnline }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/40 dark:bg-neutral-950/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-xl relative animate-slideUp">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300 p-1 hover:bg-neutral-50 dark:hover:bg-zinc-800 rounded-full transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center font-bold text-lg text-indigo-600 dark:text-indigo-400">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className={`absolute -bottom-1 -right-1 flex h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${
              isOnline ? "bg-emerald-500" : "bg-neutral-400 dark:bg-zinc-650"
            }`}>
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-800 dark:text-zinc-100 font-display">{user?.name}</h2>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isOnline 
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30" 
                  : "bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-zinc-400 border border-neutral-200/50 dark:border-zinc-700/50"
              }`}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold text-neutral-450 dark:text-zinc-500 tracking-wider block mt-0.5">
              {user?.role || "Volunteer"}
            </span>
          </div>
        </div>
        
        <div className="space-y-4 border-y border-neutral-100 dark:border-zinc-800 py-4 mb-6">
          <div>
            <label className="text-xs font-semibold text-neutral-405 dark:text-zinc-500 uppercase tracking-wider block">Phone Number</label>
            <p className="font-medium text-neutral-700 dark:text-zinc-200 text-sm mt-0.5">{user?.phoneNumber}</p>
          </div>
          {user?.userType && (
            <div>
              <label className="text-xs font-semibold text-neutral-405 dark:text-zinc-500 uppercase tracking-wider block">Profile Type</label>
              <p className="font-medium text-neutral-700 dark:text-zinc-200 text-sm mt-0.5 capitalize">{user?.userType}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => window.location.href = `tel:${user?.phoneNumber}`}
            className="flex-1 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-2 text-xs font-semibold shadow-md shadow-indigo-100 dark:shadow-none active:scale-95 duration-200"
          >
            <Phone size={14} />
            <span>Call</span>
          </button>

          <button
            onClick={() => {
              const phone = user?.phoneNumber;
              const raw = typeof phone === "string" ? phone : String(phone || "");
              const cleaned = raw.replace(/\D/g, "");
              const finalNum = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
              window.open(`https://wa.me/${finalNum}`, "_blank");
            }}
            className="flex-1 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-2 text-xs font-semibold shadow-md shadow-emerald-100 dark:shadow-none active:scale-95 duration-200"
          >
            <MessageCircle size={14} />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserCard({ user, users, onOpen, onlineUsers = [] }: any) {
  const auth = useSelector((s: PersistData) => s.auth);
  const [userdata, setuserdata] = useState(users);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const isOnline = onlineUsers.includes(user.name);

  const getUserListFromApi = async () => {
    try {
      const res = await API.getUserList(auth.user.id);
      setuserdata(res.data.data || []);
    } catch (error) {
      toast.error("Failed to load users");
    }
  }

  useEffect(() => {
    if (!users?.length) {
      getUserListFromApi();
    } else {
      setuserdata(users);
    }
  }, [users])

  const openWhatsapp = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const phone = user?.phoneNumber;
    const raw = typeof phone === "string" ? phone : String(phone || "");
    const cleaned = raw.replace(/\D/g, "");
    const finalNum = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
    window.open(`https://wa.me/${finalNum}`, "_blank");
  }

  const handleCardClick = () => {
    if (onOpen) {
      onOpen();
    }
    setIsPopupOpen(true);
  }

  return (
    <>
      <div
        className="premium-card border border-neutral-100 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 cursor-pointer 
        flex justify-between items-center bg-white dark:bg-zinc-900"
        onClick={handleCardClick}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className={`absolute -bottom-1 -right-1 flex h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 ${
              isOnline ? "bg-emerald-500" : "bg-neutral-400 dark:bg-zinc-650"
            }`}>
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-neutral-805 dark:text-zinc-100">{user.name}</h3>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isOnline 
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30" 
                  : "bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-zinc-400 border border-neutral-200/50 dark:border-zinc-700/50"
              }`}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <p className="text-xs text-neutral-400 dark:text-zinc-400 mt-0.5">{user.phoneNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `tel:${user.phoneNumber}`;
            }}
            className="p-2 rounded-xl bg-indigo-50 dark:bg-zinc-800 hover:bg-indigo-100 dark:hover:bg-zinc-750 text-indigo-600 dark:text-indigo-400 transition active:scale-95 duration-200"
            title="Call volunteer"
          >
            <Phone size={14} />
          </button>

          <button
            onClick={(e) => openWhatsapp(e)}
            className="p-2 rounded-xl bg-emerald-50 dark:bg-zinc-800 hover:bg-emerald-100 dark:hover:bg-zinc-750 text-emerald-600 dark:text-emerald-400 transition active:scale-95 duration-200"
            title="WhatsApp volunteer"
          >
            <MessageCircle size={14} />
          </button>
        </div>
      </div>

      <UserPopup 
        isOpen={isPopupOpen} 
        onClose={() => setIsPopupOpen(false)} 
        user={user} 
        isOnline={isOnline}
      />
    </>
  );
}