"use client";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Phone, Users, ShieldAlert, Heart, ExternalLink, Mail, UserCheck } from "lucide-react";
import API from "@/components/apiClient";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface User {
  _id: string;
  name: string;
  phoneNumber: string;
  role: string;
  email?: string;
}

export default function ContactsPage() {
  const auth = useSelector((s: any) => s.auth);
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth?.token) return;

    const fetchAdmins = async () => {
      setLoading(true);
      try {
        const res = await API.getAllUsers(auth.token);
        const list: User[] = res.data.data || [];
        // Filter only Super Admins
        const filtered = list.filter((u) => u.role === "superAdmin");
        setAdmins(filtered);
      } catch (err) {
        toast.error("Failed to load administrators");
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, [auth?.token]);

  // Initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-5 sm:p-6 space-y-6 animate-fadeIn pb-12">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-zinc-800/80">
        <div>
          <h1 className="text-lg font-bold text-neutral-800 dark:text-zinc-100 font-display uppercase tracking-tight flex items-center gap-2">
            <Users className="text-indigo-500" size={20} /> Super Admins
          </h1>
          <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-0.5">Contact coordinates of portal administrators</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
      ) : admins.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-100 dark:border-zinc-800/80 shadow-premium">
          <ShieldAlert size={40} className="mx-auto mb-3 text-neutral-300 dark:text-zinc-700" />
          <p className="text-xs text-neutral-500 dark:text-zinc-400 font-semibold">No Super Admins found</p>
          <p className="text-[10px] text-neutral-400 dark:text-zinc-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
            Please register a Super Admin account or contact technical support to configure.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {admins.map((admin) => (
            <div
              key={admin._id}
              className="p-5 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-neutral-100 dark:border-zinc-800/80 shadow-premium rounded-2xl flex flex-col justify-between hover:border-neutral-200 dark:hover:border-zinc-750 transition-all duration-300 group"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-xl bg-indigo-600 dark:bg-indigo-500/80 text-white flex items-center justify-center font-bold text-sm shadow-[0_4px_8px_rgba(99,102,241,0.2)] shrink-0">
                  {getInitials(admin.name)}
                </div>

                <div className="min-w-0">
                  <span className="text-[9px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                    Super Admin
                  </span>
                  <h3 className="font-bold text-neutral-850 dark:text-zinc-150 text-sm mt-2 truncate">
                    {admin.name}
                  </h3>
                  <p className="text-[11px] text-neutral-400 dark:text-zinc-500 font-sans mt-0.5 flex items-center gap-1">
                    <Mail size={12} /> {admin.email || `${admin.name.toLowerCase().replace(/\s+/g, "")}@community.org`}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 mt-6 border-t border-neutral-100 dark:border-zinc-800/80 pt-4">
                <a
                  href={`tel:${admin.phoneNumber}`}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600/90 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-indigo-100 dark:shadow-none"
                >
                  <Phone size={14} /> Call Admin
                </a>
                
                <a
                  href={`https://wa.me/91${admin.phoneNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-905/30 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95"
                  title="WhatsApp Chat"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Branding */}
      <div className="text-center py-4 shrink-0 mt-12 border-t border-neutral-100 dark:border-zinc-850/30">
        <p className="text-[10px] text-neutral-400 dark:text-zinc-550 font-medium uppercase tracking-wider flex items-center justify-center gap-1">
          Made with <Heart size={10} className="fill-rose-400 stroke-rose-400" /> for community followups
        </p>
      </div>

      <ToastContainer position="bottom-left" autoClose={3000} />
    </div>
  );
}
