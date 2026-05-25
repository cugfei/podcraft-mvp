/**
 * Common utility functions for the frontend application.
 */

/**
 * Combine class names, filtering out falsy values.
 *
 * @param classes - List of class name strings (can include undefined/null/false)
 * @returns A single space-separated class string
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format a date string for display.
 *
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Truncate a string to a maximum length, appending ellipsis if needed.
 *
 * @param str - The input string
 * @param maxLength - Maximum character length
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}
