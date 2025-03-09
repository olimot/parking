export function normrnd() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const u64arr = new BigUint64Array(1);

export function murmurHash3(value: bigint) {
  u64arr[0] ^= value >> 33n;
  u64arr[0] *= 0xff51afd7ed558ccdn;
  u64arr[0] ^= u64arr[0] >> 33n;
  u64arr[0] *= 0xc4ceb9fe1a85ec53n;
  u64arr[0] ^= u64arr[0] >> 33n;
  return u64arr[0];
}

export function seedXorShift128(state: BigUint64Array, seed: bigint) {
  state[0] = murmurHash3(seed);
  state[1] = murmurHash3(~state[0]);
  return state;
}

export function xorShift128(state: BigUint64Array) {
  const s1 = state[0];
  state[0] = state[1];
  state[1] = s1 ^ (s1 << 23n);
  state[1] ^= state[1] >> 17n;
  state[1] ^= state[0];
  state[1] ^= state[0] >> 26n;
  return state;
}

export function mapXorShift128ToFloat64(state: BigUint64Array) {
  return Number(state[0] >> 11n) / 2 ** 53;
}

export function mean(data: number[]) {
  return data.reduce((prev, it) => prev + it, 0) / data.length;
}

export function variance(data: number[]) {
  const mu = mean(data);
  return data.reduce((prev, it) => prev + (it - mu) ** 2, 0) / data.length;
}

export const stddev = (data: number[]) => Math.sqrt(variance(data));

export function diff(data: number[]) {
  if (data.length < 1) return [];
  const out = [data[0]];
  for (let i = 1; i < data.length; i++) out.push(data[i] - data[i - 1]);
  return out;
}

export function accum(data: number[]) {
  if (data.length < 1) return [];
  const out = [data[0]];
  for (let i = 1; i < data.length; i++) out.push(data[i] + out[i - 1]);
  return out;
}

let y = 0.0;
for (let i = 0; i <= 11; i++) {
  y +=
    (1 / 16 ** i) *
    (4 / (8 * i + 1) - 2 / (8 * i + 4) - 1 / (8 * i + 5) - 1 / (8 * i + 6));
}
console.log(y);

const ntp = 25;
const tp = [1];
for (let i = 1; i < ntp; i++) tp[i] = 2 * tp[i - 1];

/**
 * hexpm = 16^p mod ak. This routine uses the left-to-right binary
 * exponentiation scheme. It is valid for ak <= 2^24.
 */
export function hexpm(p: number, ak: number): number {
  if (ak === 1) return 0;

  /*  Find the greatest power of two less than or equal to p. */
  let i: number;
  for (i = 0; i < ntp; i++) if (tp[i] > p) break;

  let r = 1;

  /*  Perform binary exponentiation algorithm modulo ak. */
  for (let j = 1, pt = tp[i - 1]; j <= i; j++) {
    if (p >= pt) {
      r *= 16;
      r -= Math.trunc(r / ak) * ak;
      p -= pt;
    }
    pt *= 0.5;
    if (pt >= 1) {
      r *= r;
      r -= Math.trunc(r / ak) * ak;
    }
  }

  return r;
}
