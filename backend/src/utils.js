function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseNumber(value) {
  if (value === null || value === undefined) return 0;
  const normalized = String(value)
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowNonEmptyCount(row) {
  if (!Array.isArray(row)) return 0;
  return row.filter((cell) => String(cell || "").trim() !== "").length;
}

function isRowEmpty(row) {
  return rowNonEmptyCount(row) === 0;
}

module.exports = {
  slugify,
  parseNumber,
  rowNonEmptyCount,
  isRowEmpty,
};
