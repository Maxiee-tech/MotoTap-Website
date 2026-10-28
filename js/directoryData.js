/** Kenyan towns used for directory URLs and filters. */
export const DIRECTORY_TOWNS = [
  { slug: "nairobi", name: "Nairobi" },
  { slug: "mombasa", name: "Mombasa" },
  { slug: "kisumu", name: "Kisumu" },
  { slug: "nakuru", name: "Nakuru" },
  { slug: "eldoret", name: "Eldoret" },
  { slug: "thika", name: "Thika" },
  { slug: "kiambu", name: "Kiambu" },
  { slug: "ruiru", name: "Ruiru" },
  { slug: "kitale", name: "Kitale" },
  { slug: "kakamega", name: "Kakamega" },
  { slug: "nyeri", name: "Nyeri" },
  { slug: "meru", name: "Meru" },
  { slug: "malindi", name: "Malindi" },
  { slug: "naivasha", name: "Naivasha" },
  { slug: "kericho", name: "Kericho" },
  { slug: "kisii", name: "Kisii" },
  { slug: "machakos", name: "Machakos" },
  { slug: "nanyuki", name: "Nanyuki" },
];

export function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function listingSlug(name, userId) {
  const base = slugify(name) || "listing";
  const suffix = String(userId || "").slice(-6).toLowerCase();
  return suffix ? `${base}-${suffix}` : base;
}

export function toWhatsAppHref(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  let e164 = digits;
  if (e164.startsWith("0") && e164.length >= 9) {
    e164 = `254${e164.slice(1)}`;
  } else if (e164.length === 9) {
    e164 = `254${e164}`;
  }
  if (!e164.startsWith("254") || e164.length < 12) return "";
  return `https://wa.me/${e164}`;
}
