import { twMerge } from "tailwind-merge";
import clsx from "clsx";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return twMerge(clsx(inputs));
}
