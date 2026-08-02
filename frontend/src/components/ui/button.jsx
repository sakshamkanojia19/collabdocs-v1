import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Transitions cover shadow and transform, not just colour, so controls respond
  // to press instead of feeling static.
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-body font-medium ring-offset-background transition-[background-color,border-color,box-shadow,transform] duration-control ease-emphasis focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-raised hover:bg-primary/90 hover:shadow-lifted",
        destructive:
          "bg-destructive text-destructive-foreground shadow-raised hover:bg-destructive/90 hover:shadow-lifted",
        outline:
          "border border-input bg-background shadow-raised hover:border-foreground/20 hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        // The dense workspace chrome standardises on xs/sm rather than each screen
        // hand-rolling h-6/h-7/h-8 with an arbitrary text size.
        xs: "h-7 rounded-md px-2 text-meta",
        sm: "h-8 rounded-md px-2.5 text-caption",
        lg: "h-11 px-6 text-body-lg",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-xs": "size-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({
  className,
  variant,
  size,
  asChild = false,
  ...props
}, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }

