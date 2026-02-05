import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-sm",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl",
        outline: "border border-border bg-background hover:bg-muted rounded-xl",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl",
        ghost: "hover:bg-muted/60 rounded-xl",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-gradient-hero text-primary-foreground hover:opacity-90 rounded-xl shadow-sm",
        glass: "bg-card/70 backdrop-blur-xl border border-border/30 text-foreground hover:bg-card/90 rounded-xl",
        hero: "bg-gradient-hero text-primary-foreground shadow-glow hover:shadow-large font-semibold rounded-2xl",
        ios: "bg-primary text-primary-foreground font-semibold rounded-[14px] shadow-sm hover:bg-primary/90",
        "ios-secondary": "bg-secondary text-primary font-semibold rounded-[14px]",
        "ios-ghost": "bg-transparent text-primary font-medium rounded-[14px] hover:bg-muted/40",
        "ios-destructive": "bg-destructive/10 text-destructive font-semibold rounded-[14px] hover:bg-destructive/20",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-xl px-4 text-sm",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-11 w-11 rounded-xl",
        "ios-sm": "h-8 px-3 text-[15px] rounded-[10px]",
        "ios-md": "h-11 px-5 text-[17px] rounded-[14px]",
        "ios-lg": "h-[50px] px-6 text-[17px] rounded-[14px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
