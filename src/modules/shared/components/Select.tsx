import { forwardRef, useRef, useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../utils/cn";

type SelectSize = "xs" | "sm" | "md" | "lg";
type SelectVariant = "bordered" | "ghost" | "primary";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  size?: SelectSize;
  variant?: SelectVariant;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  title?: string;
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      size = "md",
      variant = "bordered",
      value,
      onChange,
      className,
      options,
      placeholder = "Select...",
      disabled = false,
      title,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);
    const selectedLabel = selectedOption?.label || placeholder;

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
      }
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
      onChange?.(optionValue);
      setIsOpen(false);
    };

    return (
      <div
        ref={ref || containerRef}
        className={cn("dropdown dropdown-end w-full", isOpen && "dropdown-open", className)}
      >
        <button
          ref={buttonRef}
          type="button"
          className={cn(
            "select focus:outline-none py-1 px-2 focus:border-primary w-full flex items-center",
            "appearance-none [&::-webkit-appearance]:none [&::-moz-appearance]:none [&::after]:hidden",
            `select-${size}`,
            `select-${variant}`,
            disabled && "select-disabled"
          )}
          style={{ backgroundImage: "none" }}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          title={title}
        >
          <span className="truncate flex-1 text-left">{selectedLabel}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 flex-shrink-0 ml-2 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
        {isOpen && !disabled && (
          <ul
            className={cn(
              "dropdown-content bg-base-100 border border-base-300 rounded-md shadow-lg z-[100] mt-1 p-1 overflow-y-auto",
              "flex flex-col min-w-full",
              {
                "max-h-48": size === "xs",
                "max-h-56": size === "sm",
                "max-h-64": size === "md",
                "max-h-72": size === "lg",
              }
            )}
            style={{ minWidth: buttonRef.current?.offsetWidth || "auto" }}
          >
            {options.map((option) => (
              <li key={option.value} className="w-full">
                <button
                  type="button"
                  className={cn(
                    "w-full text-left rounded px-2 py-1.5 text-xs",
                    value === option.value && "active bg-primary text-primary-content",
                    value !== option.value && "hover:bg-base-200"
                  )}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
