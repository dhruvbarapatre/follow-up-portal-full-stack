import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import API from "@/components/apiClient";

export function useCallingTracker(currentUser: any, onCallReturned?: (response?: string) => void) {
  const [activeCallCustomer, setActiveCallCustomer] = useState<any>(null);
  const [liveCallingStates, setLiveCallingStates] = useState<Record<string, { callingBy: string; status: string }>>({});

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const handleCallingStart = (data: any) => {
      setLiveCallingStates((prev) => ({
        ...prev,
        [data.customerId]: { callingBy: data.userName, status: "calling" },
      }));
    };

    const handleCallingStop = (data: any) => {
      setLiveCallingStates((prev) => {
        const next = { ...prev };
        delete next[data.customerId];
        return next;
      });
    };

    // Listen for real-time states
    socket.on("calling-start", handleCallingStart);
    socket.on("calling-stop", handleCallingStop);

    return () => {
      socket.off("calling-start", handleCallingStart);
      socket.off("calling-stop", handleCallingStop);
    };
  }, []);

  const initiateCall = async (customer: any, programId?: string) => {
    if (!currentUser) return;

    try {
      // 1. Set callingStatus on the customer document
      await API.editCustomer({
        _id: customer._id,
        updateData: {
          callingStatus: "calling",
          callingBy: currentUser.name || currentUser.phone || currentUser.phoneNumber,
          callingById: currentUser.id,
        },
      });

      // 2. If calling from event context — fast single-record upsert to mark as pending
      //    Uses $setOnInsert so existing responses are NEVER overwritten on re-call
      if (programId) {
        API.upsertOneAttendance({
          eventId:    programId,
          customerId: customer._id,
          status:     "calling",
          callingBy:  currentUser.name || currentUser.phone || currentUser.phoneNumber,
          // response:"pending" is only set on INSERT via $setOnInsert — won't overwrite real responses
        }).catch((err: any) => {
          // Non-critical — don't block the call
          console.error("Failed to upsert attendance on call start:", err?.message);
        });
      }

      // 3. Emit socket events
      const socket = getSocket();
      socket.connect();
      socket.emit("calling-start", {
        customerId: customer._id,
        userName: currentUser.name || currentUser.phone || currentUser.phoneNumber,
        userId: currentUser.id,
        programId,
      });
      if (programId) {
        socket.emit("event-update", { programId });
      }

      // 4. Save to sessionStorage
      sessionStorage.setItem("activeCallCustomer", JSON.stringify(customer));
      if (programId) {
        sessionStorage.setItem("activeCallProgramId", programId);
      } else {
        sessionStorage.removeItem("activeCallProgramId");
      }

      // 5. Listen for window focus to show response modal when they return
      const handleFocus = () => {
        window.removeEventListener("focus", handleFocus);
        setTimeout(() => {
          const stored = sessionStorage.getItem("activeCallCustomer");
          if (stored) {
            const parsed = JSON.parse(stored);
            setActiveCallCustomer(parsed);
          }
        }, 1000);
      };
      window.addEventListener("focus", handleFocus);

      // 6. Open dialer
      window.location.href = `tel:${customer.phoneNumber}`;
    } catch (err) {
      console.error("Failed to initiate call:", err);
    }
  };


  const handleModalClose = (response?: string) => {
    setActiveCallCustomer(null);
    sessionStorage.removeItem("activeCallCustomer");
    sessionStorage.removeItem("activeCallProgramId");
    if (onCallReturned) {
      onCallReturned(response);
    }
  };

  return {
    activeCallCustomer,
    liveCallingStates,
    initiateCall,
    handleModalClose,
    activeCallProgramId: typeof window !== "undefined" ? sessionStorage.getItem("activeCallProgramId") : null,
  };
}
