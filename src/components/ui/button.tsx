import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, MouseEvent, PointerEvent, SyntheticEvent } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-fg text-bg hover:opacity-90",
  secondary: "bg-surface text-fg border border-border hover:bg-surface-2",
  ghost: "text-muted hover:text-fg hover:bg-surface",
  danger: "bg-danger text-fg hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-11 px-3 text-sm",
  md: "h-12 px-4 text-sm",
  lg: "h-14 px-5 text-base min-h-14",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

/** Dedupe pointerdown + click so iframe taps fire once, not twice. */
export function armPress(el: HTMLElement): boolean {
  const now = performance.now();
  if (now - Number(el.dataset.pressedAt ?? 0) < 380) return false;
  el.dataset.pressedAt = String(now);
  return true;
}

export function bindPress(fn: () => void) {
  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!armPress(e.currentTarget)) return;
      fn();
    },
    onClick: (e: MouseEvent<HTMLElement>) => {
      if (!armPress(e.currentTarget)) return;
      fn();
    },
  };
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  onClick,
  onPointerDown,
  ...props
}: Props) {
  const fire = (e: SyntheticEvent<HTMLButtonElement>) => {
    if (props.disabled) return;
    if (!armPress(e.currentTarget)) return;
    onClick?.(e as MouseEvent<HTMLButtonElement>);
  };

  return (
    <button
      type={type}
      className={cn(
        "relative z-[1] inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium select-none touch-manipulation transition-[transform,opacity,background-color] duration-[var(--motion-quick)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        if (e.defaultPrevented) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        fire(e);
      }}
      onClick={(e) => fire(e)}
    />
  );
}
