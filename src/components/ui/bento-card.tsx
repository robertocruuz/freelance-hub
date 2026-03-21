import * as React from "react"
import { cn } from "@/lib/utils"

export interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export const BentoCard = React.forwardRef<HTMLDivElement, BentoCardProps>(
  ({ className, title, action, children, noPadding = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-card text-card-foreground rounded-2xl border border-border shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden transition-all duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]",
          className
        )}
        {...props}
      >
        {(title || action) && (
          <div className={cn("flex items-center justify-between", !noPadding ? "pt-5 px-5 pb-2" : "p-5")}>
            {title && (
              <h3 className="font-semibold text-[15px] tracking-tight text-foreground/90">
                {title}
              </h3>
            )}
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}
        <div className={cn("flex-1", !noPadding && "px-5 pb-5")}>
          {children}
        </div>
      </div>
    )
  }
)
BentoCard.displayName = "BentoCard"
