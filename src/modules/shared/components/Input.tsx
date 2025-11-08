import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "../utils/cn";

type InputSize = "xs" | "sm" | "md" | "lg";
type InputVariant = "bordered" | "ghost" | "primary";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: InputSize;
  variant?: InputVariant;
  isJoinItem?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      size = "md",
      variant = "bordered",
      isJoinItem = false,
      ...props
    },
    ref
  ) => {
    return (
      <input
        ref={ref}
        className={cn(
          "input focus:outline-none focus:border-primary",
          {
            "input-xs": size === "xs",
            "input-sm": size === "sm",
            "input-md": size === "md",
            "input-lg": size === "lg",
          },
          {
            "input-bordered": variant === "bordered",
            "input-ghost": variant === "ghost",
            "input-primary": variant === "primary",
          },
          isJoinItem && "join-item",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

