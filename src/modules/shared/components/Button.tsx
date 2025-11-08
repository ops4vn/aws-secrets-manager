import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

type ButtonSize = "xs" | "sm" | "md" | "lg";
type ButtonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "error"
  | "warning"
  | "success"
  | "info"
  | "ghost"
  | "link";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  size?: ButtonSize;
  variant?: ButtonVariant;
  active?: boolean;
  square?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      size = "md",
      variant = "primary",
      active = false,
      square = false,
      fullWidth = false,
      loading = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "btn focus:outline-none",
          {
            "btn-xs": size === "xs",
            "btn-sm": size === "sm",
            "btn-md": size === "md",
            "btn-lg": size === "lg",
          },
          {
            "btn-primary": variant === "primary",
            "btn-secondary": variant === "secondary",
            "btn-accent": variant === "accent",
            "btn-error": variant === "error",
            "btn-warning": variant === "warning",
            "btn-success": variant === "success",
            "btn-info": variant === "info",
            "btn-ghost": variant === "ghost",
            "btn-link": variant === "link",
          },
          active && "btn-active",
          square && "btn-square",
          fullWidth && "w-full",
          loading && "loading",
          disabled && "btn-disabled",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="loading loading-spinner loading-sm"></span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

