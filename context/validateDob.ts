export function validateDobParts(day: string, month: string, year: string) {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);

  if (!day || !month || !year) {
    return { valid: false, error: "Please complete day, month, and year." };
  }

  if (m < 1 || m > 12) {
    return { valid: false, error: "Month must be between 1 and 12." };
  }

  const currentYear = new Date().getFullYear();

  if (y < 1900 || y > currentYear) {
    return { valid: false, error: "Year must be between 1900 and current year." };
  }

  const maxDays = new Date(y, m, 0).getDate(); // last day of month

  if (d < 1 || d > maxDays) {
    return {
      valid: false,
      error: `Invalid day for this month. Max is ${maxDays}.`,
    };
  }

  return {
    valid: true,
    value: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
  };
}