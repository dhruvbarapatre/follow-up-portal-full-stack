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

      // 2. If calling from event context — auto-add/mark customer as "pending" in that event
      //    so the response is tracked from the moment the call starts
      if (programId) {
        try {
          const progRes = await API.getPrograms();
          const allPrograms: any[] = progRes.data.data || [];
          const activeProg = allPrograms.find((p: any) => p._id === programId);

          if (activeProg) {
            const existingInvites: any[] = activeProg.invitedCustomers || [];
            const existing = existingInvites.find((ic: any) => {
              const cid = ic.customerId?._id || ic.customerId;
              return cid === customer._id;
            });

            // Only update if they have no response filled yet
            const hasResponse = existing?.response && existing.response !== "pending";
            if (!hasResponse) {
              let updatedInvites: any[];
              if (existing) {
                // Update existing entry → mark as calling / pending
                updatedInvites = existingInvites
                  .filter((ic: any) => ic.customerId != null)
                  .map((ic: any) => {
                    const cid = ic.customerId?._id || ic.customerId;
                    if (cid === customer._id) {
                      return {
                        ...ic,
                        customerId: customer._id,
                        status: "calling",
                        response: "pending",
                        callingBy: currentUser.name || currentUser.phone || currentUser.phoneNumber,
                      };
                    }
                    return { ...ic, customerId: cid };
                  });
              } else {
                // Customer not in list yet — add with pending state
                updatedInvites = [
                  ...existingInvites
                    .filter((ic: any) => ic.customerId != null)
                    .map((ic: any) => ({ ...ic, customerId: ic.customerId?._id || ic.customerId })),
                  {
                    customerId: customer._id,
                    status: "calling",
                    response: "pending",
                    callingBy: currentUser.name || currentUser.phone || currentUser.phoneNumber,
                    attended: false,
                  },
                ];
              }

              await API.updateProgram({ id: programId, invitedCustomers: updatedInvites });
            }
          }
        } catch (progErr) {
          // Non-critical — don't block the call if this fails
          console.error("Failed to auto-set pending in event invite:", progErr);
        }
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
