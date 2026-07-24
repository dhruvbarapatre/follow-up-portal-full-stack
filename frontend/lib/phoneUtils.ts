export const normalizePhone = (phone: string | number): string => {
  if (!phone) return "";

  // Keep only digits
  let digits = String(phone).replace(/\D/g, "");

  // Take the last 10 digits if more than 10 digits exist
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }

  // Must be exactly 10 digits
  return digits.length === 10 ? digits : "";
};