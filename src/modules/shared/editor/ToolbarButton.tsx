import { ReactNode } from "react";
import { Button, ButtonProps } from "../components/Button";

type Props = {
  icon: ReactNode;
  label: string;
  title?: string;
  onClick?: () => void;
  variant?: ButtonProps["variant"];
  active?: boolean;
  disabled?: boolean;
};

// Inline toolbar button whose text label collapses to icon-only on narrow
// editor columns (container query @md). The title falls back to the label so
// the icon-only state keeps a tooltip. Requires an `@container` ancestor.
export function ToolbarButton({
  icon,
  label,
  title,
  onClick,
  variant = "ghost",
  active = false,
  disabled = false,
}: Props) {
  return (
    <Button
      size="xs"
      variant={active ? "info" : variant}
      active={active}
      disabled={disabled}
      title={title ?? label}
      onClick={onClick}
    >
      {icon}
      <span className="hidden @md:inline ml-1">{label}</span>
    </Button>
  );
}

export default ToolbarButton;
