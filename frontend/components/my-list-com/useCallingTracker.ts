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

  const initiateCall = (customer: any, programId?: string) => {
    if (!currentUser) return;

    try {
      // 1. Show response modal immediately for instant UI feedback
      setActiveCallCustomer(customer);

      // 2. Save to sessionStorage
      sessionStorage.setItem("activeCallCustomer", JSON.stringify(customer));
      if (programId) {
        sessionStorage.setItem("activeCallProgramId", programId);
      } else {
        sessionStorage.removeItem("activeCallProgramId");
      }

      // 3. Set callingStatus on the customer document (background)
      API.editCustomer({
        _id: customer._id,
        updateData: {
          callingStatus: "calling",
          callingBy: currentUser.name || currentUser.phone || currentUser.phoneNumber,
          callingById: currentUser.id,
        },
      }).catch(err => console.error("Failed to update callingStatus:", err));

      // 4. Fast single-record upsert for event context (background)
      if (programId) {
        API.upsertOneAttendance({
          eventId:    programId,
          customerId: customer._id,
          status:     "calling",
          callingBy:  currentUser.name || currentUser.phone || currentUser.phoneNumber,
        }).catch((err: any) => console.error("Failed to upsert attendance:", err?.message));
      }

      // 5. Emit socket events
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
