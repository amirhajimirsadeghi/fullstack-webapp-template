
import { cn } from "@/lib/utils";

interface LogoProps {
  withText?: boolean;
  className?: string;
  size?: "small" | "medium" | "large";
}

export function Logo({ withText = false, className, size = "medium" }: LogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src="/logo.png"
        alt="Template Logo"
        className={cn("h-16 w-16", size === "small" && "h-12 w-12", size === "medium" && "h-16 w-16", size === "large" && "h-20 w-20")}
      />
      {withText && (
        <span className={cn("font-display text-foreground", size === "small" && "text-xl", size === "medium" && "text-2xl", size === "large" && "text-3xl")}>Template</span>
      )}
    </div>
  );
}
