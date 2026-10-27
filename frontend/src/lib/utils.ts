import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn-style class merger (replaces the unrelated `cn` npm package). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
