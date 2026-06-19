"use client";

import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/router";
import { logout } from "@/components/slices/authSlice";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  UserCheck,
  Users,
  Calendar,
  UserPlus,
  Bell,
  Trash2,
  BarChart3,
  Mail,
  Shield,
  Clock
} from "lucide-react";
import { getSocket } from "@/lib/socket";

interface NotificationItem {
  id: string;
  type: "new-youth" | "new-assignment" | "new-event" | string;
  message: string;
  createdAt: string | Date;
  read: boolean;
}

const Header: React.FC = () => {
  const [show, setShow] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showPermissionBanner, setShowPermissionBanner] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [guideTab, setGuideTab] = useState<"ios" | "android">("ios");
  
  const authState = useSelector((state: any) => state.auth);
  const dispatch = useDispatch();
  const router = useRouter();

  const isIOS = () => {
    if (typeof window === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  };

  const isPWA = () => {
    if (typeof window === "undefined") return false;
    return (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
  };

  const navigateTo = (path: string) => {
    setShow(false);
    setShowNotifications(false);
    setTimeout(() => router.push(path), 200);
  };

  const handleLogout = () => {
    try {
      const socket = getSocket();
      socket.disconnect();
    } catch (e) {
      console.error("Failed to disconnect socket on logout:", e);
    }
    dispatch(logout()); // clear redux state
    localStorage.removeItem("fyp_token"); // remove token
    navigateTo("/login");
  };

  // Check browser notification permission state
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default" && authState?.isLoggedIn) {
        const dismissed = sessionStorage.getItem("fyp_notif_banner_dismissed");
        if (!dismissed) {
          setShowPermissionBanner(true);
        }
      }
    }
  }, [authState?.isLoggedIn]);

  // Load cached notifications on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fyp_notifications");
      if (saved) {
        try {
          setNotifications(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load notifications from cache:", e);
        }
      }
    }
  }, []);

  // Synchronize WebSocket Notifications & Connection Lifecycle
  useEffect(() => {
    const socket = getSocket();

    if (authState?.isLoggedIn) {
      // Reconnect to socket to apply username handshake query parameter
      socket.disconnect();
      socket.connect();
    } else {
      socket.disconnect();
    }

    const handleNewNotification = (data: any) => {
      // Filter targeted assignment notifications
      if (data.type === "new-assignment" && data.assignedUserIds) {
        if (!data.assignedUserIds.includes(authState?.user?.id)) {
          return; // Skip this notification since it's not assigned to us
        }
      }

      const newNotif: NotificationItem = {
        id: data.id || Math.random().toString(36).substring(7),
        type: data.type || "info",
        message: data.message || "New activity detected",
        createdAt: data.createdAt || new Date(),
        read: false,
      };
      
      setNotifications((prev) => {
        const updated = [newNotif, ...prev];
        localStorage.setItem("fyp_notifications", JSON.stringify(updated));
        return updated;
      });

      // Trigger HTML5 Web Notification API
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const title = data.type === "new-youth" ? "🆕 New Youth Registered" :
                      data.type === "new-assignment" ? "📋 Customer Assigned" :
                      data.type === "new-event" ? "📅 New Event Created" : "🔔 Follow Up Alert";

        const n = new Notification(title, {
          body: data.message,
          icon: "/favicon.ico",
          tag: newNotif.id,
          requireInteraction: true, // Persist on screen until clicked or dismissed
        });

        n.onclick = () => {
          window.focus();
          if (data.type === "new-event") {
            router.push("/event");
          } else if (data.type === "new-youth") {
            router.push("/follow-up-hub");
          } else if (data.type === "new-assignment" || data.type === "customer-assigned") {
            router.push("/my-list");
          }
          n.close();
        };
      }
    };

    socket.on("new-notification", handleNewNotification);

    return () => {
      socket.off("new-notification", handleNewNotification);
    };
  }, [authState?.isLoggedIn, authState?.user?.name]);

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("This browser does not support Web Notifications.");
      return;
    }

    if (isIOS() && !isPWA()) {
      setGuideTab("ios");
      setShowGuideModal(true);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setShowPermissionBanner(false);
        new Notification("Notifications Enabled!", {
          body: "You're all set! You will receive real-time notifications.",
          icon: "/favicon.ico",
          requireInteraction: true,
        });
      } else if (permission === "denied") {
        setGuideTab("android");
        setShowGuideModal(true);
      }
    } catch (err) {
      console.error("Failed to request notifications permission:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      localStorage.setItem("fyp_notifications", JSON.stringify(updated));
      return updated;
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem("fyp_notifications");
  };

  const userRole = authState?.user?.role;
  const isAdmin = userRole && ["admin", "superAdmin"].includes(userRole);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "new-youth":
        return <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5"></span>;
      case "new-assignment":
        return <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5"></span>;
      case "new-event":
        return <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5"></span>;
      default:
        return <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0 mt-1.5"></span>;
    }
  };

  return (
    <div className="font-sans antialiased">
      {/* NAVBAR */}
      <nav className="w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-neutral-100 dark:border-zinc-800/80 px-5 py-3 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div
          className="text-lg font-bold text-neutral-800 dark:text-zinc-100 font-display cursor-pointer tracking-tight hover:text-indigo-600 dark:hover:text-indigo-400 transition duration-200"
          onClick={() => navigateTo("/")}
        >
          Follow Up Portal
        </div>

        <div className="flex items-center gap-1.5 relative">
          {/* BELL NOTIFICATION POPUP */}
          {authState?.isLoggedIn && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-850 hover:text-neutral-900 dark:hover:text-zinc-100 transition-colors active:scale-95 duration-200 relative"
                title="Notifications"
              >
                <Bell size={20} className={unreadCount > 0 ? "text-indigo-600 dark:text-indigo-400" : ""} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500"></span>
                )}
              </button>

              {/* NOTIFICATION FLOATING DROPDOWN */}
              {showNotifications && (
                <div className="absolute right-0 mt-2.5 w-72 max-h-[300px] bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 shadow-2xl rounded-2xl p-3 z-50 animate-slideUp space-y-2 overflow-y-auto scrollable-content">
                  <div className="flex justify-between items-center px-1 border-b border-neutral-100 dark:border-zinc-800/80 pb-2 mb-2 text-[9px] font-bold text-neutral-550 dark:text-zinc-450 uppercase tracking-wider">
                    <span>Activity Logs</span>
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); markAllAsRead(); }} className="hover:text-indigo-600 dark:hover:text-indigo-400">Mark Read</button>
                      <button onClick={(e) => { e.stopPropagation(); clearNotifications(); }} className="hover:text-rose-500 dark:hover:text-rose-450 flex items-center gap-0.5">
                        <Trash2 size={10} /> Clear
                      </button>
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="text-[10px] text-neutral-400 dark:text-zinc-550 italic text-center py-6">No notifications yet</p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotifications((prev) => {
                            const updated = prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n));
                            localStorage.setItem("fyp_notifications", JSON.stringify(updated));
                            return updated;
                          });
                          setShowNotifications(false);
                          if (notif.type === "new-event") {
                            navigateTo("/event");
                          } else if (notif.type === "new-youth") {
                            navigateTo("/follow-up-hub");
                          } else if (notif.type === "new-assignment" || notif.type === "customer-assigned") {
                            navigateTo("/my-list");
                          }
                        }}
                        className={`p-2 rounded-lg border flex gap-2 items-start transition cursor-pointer text-[10px] leading-relaxed ${
                          notif.read
                            ? "bg-neutral-50/50 dark:bg-zinc-950/10 border-neutral-100 dark:border-zinc-900/50 text-neutral-500 dark:text-zinc-500"
                            : "bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-100/50 dark:border-indigo-900/30 text-neutral-800 dark:text-zinc-300 font-medium"
                        }`}
                      >
                        {getNotifIcon(notif.type)}
                        <div className="flex-1 min-w-0 font-sans">
                          <p>{notif.message}</p>
                          <p className="text-[8px] text-neutral-400 dark:text-zinc-550 mt-1 flex items-center gap-1 font-semibold">
                            <Clock size={8} />
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setShow(true)}
            className="p-2 rounded-xl text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-800 hover:text-neutral-900 dark:hover:text-zinc-100 transition-colors active:scale-95 duration-200"
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {/* Notification Permission Banner */}
      {showPermissionBanner && (
        <div className="bg-indigo-50/90 dark:bg-indigo-950/40 border-b border-indigo-100/50 dark:border-indigo-900/30 px-5 py-2 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-400 backdrop-blur-md sticky top-[53px] z-20 animate-slideDown">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="font-medium text-[10px] leading-snug">
              Enable push notifications to receive real-time updates.
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={requestNotificationPermission}
              className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-bold transition active:scale-95 shadow-sm"
            >
              Enable
            </button>
            <button
              onClick={() => {
                setShowPermissionBanner(false);
                sessionStorage.setItem("fyp_notif_banner_dismissed", "true");
              }}
              className="text-neutral-450 hover:text-neutral-600 dark:text-zinc-550 dark:hover:text-zinc-300 font-semibold text-[9px]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* BACKDROP */}
      <div
        className={`fixed inset-0 bg-neutral-950/20 dark:bg-neutral-950/40 backdrop-blur-xs z-40 transition-opacity duration-300 ${
          show ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => {
          setShow(false);
          setShowNotifications(false);
        }}
      ></div>

      {/* SIDEBAR DRAWER */}
      <div
        className={`fixed top-0 left-0 w-72 h-full bg-white dark:bg-zinc-950 shadow-xl z-50 transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${
          show ? "translate-x-0" : "-translate-x-full"
        } flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-zinc-800/80">
          <h2 className="text-base font-semibold text-neutral-800 dark:text-zinc-100 uppercase tracking-wider font-display">Menu</h2>
          <button
            onClick={() => {
              setShow(false);
              setShowNotifications(false);
            }}
            className="text-neutral-400 dark:text-zinc-550 hover:text-neutral-600 dark:hover:text-zinc-300 p-1 rounded-lg hover:bg-neutral-50 dark:hover:bg-zinc-800 transition active:scale-90"
          >
            <X size={18} />
          </button>
        </div>

        {/* NAV LINKS */}
        <nav className="flex flex-col p-5 space-y-1 overflow-y-auto grow scrollable-content">
          <button
            onClick={() => navigateTo("/")}
            className={`flex items-center gap-3 text-left py-2.5 px-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              router.pathname === "/"
                ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                : "text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-900/50 hover:text-neutral-900 dark:hover:text-zinc-100"
            }`}
          >
            <LayoutDashboard size={18} className={router.pathname === "/" ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400 dark:text-zinc-500"} />
            <span>Dashboard</span>
          </button>

          {authState?.isLoggedIn && (
            <button
              onClick={() => navigateTo("/my-list")}
              className={`flex items-center gap-3 text-left py-2.5 px-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                router.pathname === "/my-list"
                  ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-900/50 hover:text-neutral-900 dark:hover:text-zinc-100"
              }`}
            >
              <UserCheck size={18} className={router.pathname === "/my-list" ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400 dark:text-zinc-500"} />
              <span>My List</span>
            </button>
          )}

          {authState?.isLoggedIn && (
            <button
              onClick={() => navigateTo("/follow-up-hub")}
              className={`flex items-center gap-3 text-left py-2.5 px-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                router.pathname === "/follow-up-hub"
                  ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-900/50 hover:text-neutral-900 dark:hover:text-zinc-100"
              }`}
            >
              <Users size={18} className={router.pathname === "/follow-up-hub" ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400 dark:text-zinc-500"} />
              <span>Youth Directory</span>
            </button>
          )}

          {authState?.isLoggedIn && (
            <button
              onClick={() => navigateTo("/event")}
              className={`flex items-center gap-3 text-left py-2.5 px-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                router.pathname === "/event"
                  ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-900/50 hover:text-neutral-900 dark:hover:text-zinc-100"
              }`}
            >
              <Calendar size={18} className={router.pathname === "/event" ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400 dark:text-zinc-550"} />
              <span>Event Manager</span>
            </button>
          )}

          {authState?.isLoggedIn && (
            <button
              onClick={() => navigateTo("/attendence")}
              className={`flex items-center gap-3 text-left py-2.5 px-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                router.pathname === "/attendence"
                  ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-900/50 hover:text-neutral-900 dark:hover:text-zinc-100"
              }`}
            >
              <UserCheck size={18} className={router.pathname === "/attendence" ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400 dark:text-zinc-555"} />
              <span>Attendance Check-in</span>
            </button>
          )}

          {authState?.isLoggedIn && (
            <button
              onClick={() => navigateTo("/analytics")}
              className={`flex items-center gap-3 text-left py-2.5 px-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                router.pathname === "/analytics"
                  ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-900/50 hover:text-neutral-900 dark:hover:text-zinc-100"
              }`}
            >
              <BarChart3 size={18} className={router.pathname === "/analytics" ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400 dark:text-zinc-550"} />
              <span>Analytics</span>
            </button>
          )}

          {authState?.isLoggedIn && (
            <button
              onClick={() => navigateTo("/contacts")}
              className={`flex items-center gap-3 text-left py-2.5 px-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                router.pathname === "/contacts"
                  ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-900/50 hover:text-neutral-900 dark:hover:text-zinc-100"
              }`}
            >
              <Mail size={18} className={router.pathname === "/contacts" ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400 dark:text-zinc-550"} />
              <span>Contacts</span>
            </button>
          )}

          {((isAdmin && userRole === "superAdmin") && authState?.isLoggedIn) && (
            <button
              onClick={() => navigateTo("/users-list")}
              className={`flex items-center gap-3 text-left py-2.5 px-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                router.pathname === "/users-list"
                  ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-900/50 hover:text-neutral-900 dark:hover:text-zinc-100"
              }`}
            >
              <Shield size={18} className={router.pathname === "/users-list" ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400 dark:text-zinc-500"} />
              <span>User Admin Hub</span>
            </button>
          )}

          {(isAdmin && userRole === "superAdmin") && (
            <button
              onClick={() => navigateTo("/sign-up")}
              className={`flex items-center gap-3 text-left py-2.5 px-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                router.pathname === "/sign-up"
                  ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-900/50 hover:text-neutral-900 dark:hover:text-zinc-100"
              }`}
            >
              <UserPlus size={18} className={router.pathname === "/sign-up" ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400"} />
              <span>Create User</span>
            </button>
          )}

          {!authState?.isLoggedIn && (
            <button
              onClick={() => navigateTo("/login")}
              className={`flex items-center gap-3 text-left py-2.5 px-3.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                router.pathname === "/login"
                  ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-900/50 hover:text-neutral-900 dark:hover:text-zinc-100"
              }`}
            >
              <UserCheck size={18} className={router.pathname === "/login" ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400 dark:text-zinc-555"} />
              <span>Login</span>
            </button>
          )}
        </nav>

        {/* USER INFO + LOGOUT */}
        {authState?.isLoggedIn && authState?.user && (
          <div className="mt-auto p-5 border-t border-neutral-100 dark:border-zinc-800/80 flex items-center gap-3 bg-neutral-50/50 dark:bg-zinc-900/20 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-[0_2px_4px_rgba(99,102,241,0.2)]">
              {authState?.user?.name.charAt(0).toUpperCase()}
            </div>

            <div className="flex flex-col grow min-w-0 font-sans">
              <span className="font-semibold text-neutral-800 dark:text-zinc-100 text-sm truncate">
                {authState?.user?.name}
              </span>
              <span className="text-[10px] text-neutral-400 dark:text-zinc-550 font-medium capitalize">
                {authState?.user?.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl hover:text-rose-600 dark:hover:text-rose-400 transition active:scale-90"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-neutral-950/40 dark:bg-neutral-950/70 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-xl relative animate-slideUp">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300 p-1 hover:bg-neutral-50 dark:hover:bg-zinc-800 rounded-full transition"
            >
              <X size={18} />
            </button>

            <div className="mb-4">
              <h3 className="text-base font-bold text-neutral-800 dark:text-zinc-100 font-display">Notification Setup Guide</h3>
              <p className="text-xs text-neutral-450 dark:text-zinc-400 mt-1">Follow these steps to enable alerts on your device.</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-100 dark:border-zinc-800 mb-4 font-sans">
              <button
                onClick={() => setGuideTab("ios")}
                className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition ${
                  guideTab === "ios"
                    ? "border-indigo-650 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-450"
                }`}
              >
                iOS Safari
              </button>
              <button
                onClick={() => setGuideTab("android")}
                className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition ${
                  guideTab === "android"
                    ? "border-indigo-650 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-450"
                }`}
              >
                Android / Chrome
              </button>
            </div>

            {/* Content */}
            <div className="space-y-3 text-xs text-neutral-600 dark:text-zinc-300 min-h-[160px] flex flex-col justify-center font-sans leading-relaxed">
              {guideTab === "ios" ? (
                <div className="space-y-2">
                  <p className="font-semibold text-rose-500 dark:text-rose-450 text-[10px] uppercase tracking-wider font-sans">⚠️ Important iOS Rule:</p>
                  <p>iOS Safari requires you to <strong>Add the App to your Home Screen</strong> to receive notifications:</p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1">
                    <li>Tap the <strong>Share</strong> button (box with upward arrow) at the bottom of Safari.</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                    <li>Open the portal from your device Home Screen.</li>
                    <li>Click the <strong>Enable</strong> notifications banner in the app.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-2 font-sans">
                  <p>To enable notifications on Chrome, Android, or Desktop:</p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1">
                    <li>Click the <strong>settings/sliders or padlock icon</strong> on the left side of your browser URL bar.</li>
                    <li>Locate <strong>Notifications</strong>.</li>
                    <li>Change the permission toggle to <strong>Allow</strong>.</li>
                    <li>Refresh the page to apply settings.</li>
                  </ol>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-neutral-100 dark:border-zinc-800 pt-4 flex justify-end font-sans">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-semibold transition active:scale-95 shadow-md shadow-indigo-50 dark:shadow-none"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;