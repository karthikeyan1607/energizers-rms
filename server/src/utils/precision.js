export const EPSILON = 0.000001;

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function round4(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10000) / 10000;
}

export function percent(value) {
  return round2(Number(value || 0) * 100);
}
