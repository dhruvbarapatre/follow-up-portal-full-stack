export const normalizePhone = (phone: string) => {
  if (!phone) return "";

  let number = String(phone).replace(/\D/g, "");

  if (number.length === 12 && number.startsWith("91")) {
    number = number.slice(2);
  }
  return number.length === 10 ? number : "";
};
