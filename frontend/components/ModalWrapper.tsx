import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { modalOpened, modalClosed } from "@/components/slices/uiSlice";

interface ModalWrapperProps {
  children: React.ReactNode;
}

export default function ModalWrapper({ children }: ModalWrapperProps) {
  const [mounted, setMounted] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    setMounted(true);
    dispatch(modalOpened());
    return () => {
      dispatch(modalClosed());
    };
  }, [dispatch]);

  if (!mounted) return null;

  return createPortal(children, document.body);
}
