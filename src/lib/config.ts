// Event-specific settings. Update these for each Devcon.

export const EVENT = {
  name: "Devcon 8",
  city: "Mumbai, India",
  dates: "3–6 November 2026",
  timeZone: "Asia/Kolkata",
  mainSite: "https://devcon.org/en/",
} as const;

export const INFO_DESK = {
  location: "Info Desk, near Registration",
  // Shift leads for special cases. Telegram usernames without the @.
  contacts: [
    { shift: "AM lead", name: "TBD", telegram: "" },
    { shift: "PM lead", name: "TBD", telegram: "" },
  ],
} as const;

export const CATEGORIES = [
  { value: "electronics", label: "Electronics", emoji: "💻" },
  { value: "phone", label: "Phones & cases", emoji: "📱" },
  { value: "audio", label: "Headphones & earbuds", emoji: "🎧" },
  { value: "bag", label: "Bags & backpacks", emoji: "🎒" },
  { value: "wallet", label: "Wallets & cards", emoji: "👛" },
  { value: "keys", label: "Keys", emoji: "🔑" },
  { value: "clothing", label: "Clothing", emoji: "🧥" },
  { value: "eyewear", label: "Glasses & sunglasses", emoji: "🕶️" },
  { value: "bottle", label: "Bottles & mugs", emoji: "🥤" },
  { value: "jewellery", label: "Jewellery & watches", emoji: "⌚" },
  { value: "documents", label: "Documents & IDs", emoji: "🪪" },
  { value: "other", label: "Other", emoji: "📦" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];

export function categoryMeta(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** What the public sees for an item: the team's generic label, else the category. */
export function publicLabel(item: { public_label: string | null; category: string }) {
  return item.public_label?.trim() || categoryMeta(item.category).label;
}
