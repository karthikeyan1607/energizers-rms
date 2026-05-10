export function pct(value) {
  return `${((Number(value) || 0) * 100).toFixed(2)}%`;
}

export function num(value) {
  return (Number(value) || 0).toFixed(2);
}
