import type { HTMLAttributes } from "react";

export function Panel({
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-desk border-[1.5px] border-tile-edge bg-paper p-6 shadow-paper ${className}`}
      {...rest}
    />
  );
}
