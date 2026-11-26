/** Normalise an Indian mobile number to +91XXXXXXXXXX, or null if invalid. */
export function normalizeIndianMobile(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}

export const maskPhone = (p: string) => (p.length >= 13 ? `${p.slice(0, 5)}••••${p.slice(-4)}` : p);
export const waLink = (number: string, text: string) =>
  `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
