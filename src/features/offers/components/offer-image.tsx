import Image from "next/image";
import { cn } from "@/lib/utils";

/** Hosts in next.config `images.remotePatterns`; other URLs staff paste in are shown as-is. */
const OPTIMIZED_HOSTS = new Set(["theisla.org"]);

function optimizable(src: string) {
  try {
    return OPTIMIZED_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

/** Partner flyer, letterboxed so text on the artwork is never cropped. */
export function OfferImage({
  src,
  alt,
  className,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/5",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={!optimizable(src)}
        className="object-contain"
      />
    </div>
  );
}
