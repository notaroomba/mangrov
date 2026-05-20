import { INTERESTS } from './constants';
/**
 * Generates a consistent earth-tone color based on a seed string
 * @param seed - The string to generate a color for
 * @returns A Tailwind CSS class for the color
 */
export const getEarthToneColor = (seed: string): string => {
  const earthyHexColors = [
    "bg-[#4B3B2A]",
    "bg-[#6F4E37]",
    "bg-[#A68A64]",
    "bg-[#8C6E54]",
    "bg-[#7C5C45]",
    "bg-[#D1BFA3]",
    "bg-[#A89F91]",
    "bg-[#C2B280]",
    "bg-[#5E503F]",
    "bg-[#3B3228]",
    "bg-[#556B2F]",
    "bg-[#4B5320]",
    "bg-[#2E4E3F]",
    "bg-[#3C5A4C]",
    "bg-[#6A6051]",
    "bg-[#746C57]",
    "bg-[#91876E]",
    "bg-[#5C544E]",
  ];

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % earthyHexColors.length;
  return earthyHexColors[index];
};

/**
 * Converts a country code to its corresponding flag emoji
 * @param countryCode - The ISO country code (e.g., "US", "GB")
 * @returns The flag emoji string
 */
export const getFlagEmoji = (countryCode: string): string => {
  if (!countryCode) return "";
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
};

/**
 * Validates if a username follows the required format
 * @param username - The username to validate
 * @returns True if the username is valid
 */
export const isValidUsername = (username: string): boolean => {
  return /^[a-zA-Z0-9_]+$/.test(username);
};

/**
 * Convert a timestamp value into a Date.
 * Tolerates: ISO strings (Postgres), epoch numbers, native Dates, and the
 * legacy Firestore Timestamp { toDate(): Date } shape that's still embedded
 * in some component code paths. Returns null when the input can't be parsed.
 */
export const toDate = (value: any): Date | null => {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && typeof value.toDate === "function") {
    try {
      const d = value.toDate();
      return d instanceof Date ? d : null;
    } catch {
      return null;
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

/**
 * Formats a date to a readable string
 * @param date - The date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string | number): string => {
  const dateObj = new Date(date);
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return dateObj.toLocaleDateString();
};

/**
 * Truncates text to a specified length
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

/**
 * Generates initials from a name
 * @param name - The full name
 * @returns The initials (first letter of each word)
 */
export const getInitials = (name: string): string => {
  if (!name) return "U";
  return name
    .split(" ")
    .map(word => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Gets the display label for an interest ID
 * @param interestId - The interest ID to get the label for
 * @returns The display label or the original ID if not found
 */
export const getInterestLabel = (interestId: string): string => {
  const interest = INTERESTS.find((i: any) => i.id === interestId);
  return interest ? interest.label : interestId;
}; 