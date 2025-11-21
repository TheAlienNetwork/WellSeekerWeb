import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "whitespace-nowrap inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold transition-all duration-200" +
  " hover-elevate backdrop-blur-sm",
  {
    variants: {
      variant: {
        default:
          "border-primary/20 bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md",
        secondary: "border-secondary/20 bg-secondary/80 text-secondary-foreground shadow-sm",
        destructive:
          "border-destructive/20 bg-destructive/90 text-destructive-foreground shadow-sm hover:shadow-md",
        success:
          "border-success/20 bg-success/90 text-success-foreground shadow-sm hover:shadow-md",
        warning:
          "border-warning/20 bg-warning/90 text-warning-foreground shadow-sm hover:shadow-md",
        info:
          "border-info/20 bg-info/90 text-info-foreground shadow-sm hover:shadow-md",
        outline: "border-border/50 bg-background/30 backdrop-blur-md shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants }
