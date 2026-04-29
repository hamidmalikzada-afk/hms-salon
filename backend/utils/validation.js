function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanString(value, maxLength = 255) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanEmail(value) {
  return cleanString(value, 160).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function toPositiveInt(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function toMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function isValidTime(value) {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(String(value || ""));
}

function fail(res, message, status = 400) {
  return res.status(status).json({ error: message });
}

module.exports = {
  isNonEmptyString,
  cleanString,
  cleanEmail,
  isValidEmail,
  toPositiveInt,
  toMoney,
  isValidDate,
  isValidTime,
  fail,
};
