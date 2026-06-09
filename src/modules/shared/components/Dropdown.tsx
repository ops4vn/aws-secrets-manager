import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../utils/cn";
import { Button, ButtonProps } from "./Button";

const DropdownCtx = createContext<{ close: () => void }>({ close: () => {} });
export const useDropdown = () => useContext(DropdownCtx);

type DropdownProps = {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  disabled?: boolean;
  active?: boolean;
  buttonTitle?: string;
  buttonVariant?: ButtonProps["variant"];
  contentClassName?: string;
  className?: string;
};

// Generic dropdown menu built on DaisyUI `dropdown` (same click-outside
// mechanism as components/Select.tsx). Items close the menu via the
// DropdownItem helper (or useDropdown().close()).
export function Dropdown({
  trigger,
  children,
  align = "end",
  disabled = false,
  active = false,
  buttonTitle,
  buttonVariant = "ghost",
  contentClassName,
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "dropdown",
        align === "end" && "dropdown-end",
        open && "dropdown-open",
        className
      )}
    >
      <Button
        size="xs"
        variant={active ? "info" : buttonVariant}
        active={active}
        disabled={disabled}
        title={buttonTitle}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        {trigger}
        <ChevronDown
          className={cn(
            "h-3 w-3 ml-1 transition-transform",
            open && "rotate-180"
          )}
        />
      </Button>
      {open && !disabled && (
        <div
          className={cn(
            "dropdown-content bg-base-100 border border-base-300 rounded-md shadow-lg z-[100] mt-1 p-1 min-w-52 max-h-[60vh] overflow-auto",
            contentClassName
          )}
        >
          <DropdownCtx.Provider value={{ close: () => setOpen(false) }}>
            {children}
          </DropdownCtx.Provider>
        </div>
      )}
    </div>
  );
}

type DropdownItemProps = {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  closeOnClick?: boolean;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
};

export function DropdownItem({
  icon,
  children,
  onClick,
  closeOnClick = true,
  active = false,
  disabled = false,
  title,
  className,
}: DropdownItemProps) {
  const { close } = useDropdown();
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      className={cn(
        "w-full text-left rounded px-2 py-1.5 text-xs flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed",
        active ? "bg-primary text-primary-content" : "hover:bg-base-200",
        className
      )}
      onClick={() => {
        if (disabled) return;
        onClick?.();
        if (closeOnClick) close();
      }}
    >
      {icon}
      <span className="flex-1 min-w-0 truncate">{children}</span>
    </button>
  );
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-base-300" />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 py-1 text-[10px] uppercase tracking-wide opacity-50">
      {children}
    </div>
  );
}

export default Dropdown;
