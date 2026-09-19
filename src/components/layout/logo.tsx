import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-sm"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path
            d="M4 16.5c2.2-3.4 5.1-5.1 8-5.1s5.8 1.7 8 5.1"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M7 14.2c1.5-1.8 3.2-2.7 5-2.7s3.5.9 5 2.7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="8.2" r="1.6" fill="currentColor" />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-tight text-foreground">
        {SITE_NAME}
      </span>
    </span>
  );
}
