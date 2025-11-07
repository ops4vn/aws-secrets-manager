import { ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnBackdrop?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  size = "md",
  closeOnBackdrop = true,
}: ModalProps) {
  if (!open) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-full",
  };

  const modalContent = (
    <div className="modal modal-open">
      <div className={`modal-box ${sizeClasses[size]}`}>
        <h3 className="font-bold text-lg">{title}</h3>
        <div className="py-4">{children}</div>
        {actions && <div className="modal-action">{actions}</div>}
      </div>
      {closeOnBackdrop && (
        <form method="dialog" className="modal-backdrop overflow-hidden">
          <button type="button" onClick={onClose}>
            close
          </button>
        </form>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}

