import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import { formatAddress, normalizeAddress } from "./address";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return twMerge(clsx(inputs));
}

export { formatAddress, normalizeAddress };
