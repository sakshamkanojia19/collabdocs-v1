import { clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind-merge must be taught the project's named font sizes
// (tailwind.config.cjs fontSize). Without this it classifies text-body,
// text-caption, … as text COLORS, sees them as conflicting with real color
// classes like text-primary-foreground, and silently drops whichever comes
// first — which is how primary buttons ended up with inherited black text.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "meta",
            "caption",
            "body",
            "body-lg",
            "title-sm",
            "title",
            "title-lg",
            "display",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
