import { SectionId, SectionStatusRecord, TakeoverStatusBlob } from '../types';

export function initialStatus(): TakeoverStatusBlob {
  return { schemaVersion: '1.0', sections: {} };
}

export function parseStatusBlob(raw: string | null | undefined): TakeoverStatusBlob {
  if (typeof raw !== 'string' || raw.trim() === '') return initialStatus();
  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      parsed.schemaVersion !== '1.0' ||
      typeof parsed.sections !== 'object' ||
      parsed.sections === null ||
      Array.isArray(parsed.sections)
    ) {
      return initialStatus();
    }
    return parsed as TakeoverStatusBlob;
  } catch {
    return initialStatus();
  }
}

export function serialiseStatusBlob(blob: TakeoverStatusBlob): string {
  return JSON.stringify(blob);
}

export function setSectionState(
  blob: TakeoverStatusBlob,
  id: SectionId,
  record: SectionStatusRecord
): TakeoverStatusBlob {
  return {
    ...blob,
    sections: { ...blob.sections, [id]: record },
  };
}

// Stable JSON-stringify with sorted keys, then sha-1 hex. Used to detect
// "agent payload changed since last takeover" without storing the payload.
export function hashSlice(slice: unknown): string {
  return sha1Hex(stableStringify(slice));
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify((v as Record<string, unknown>)[k])).join(',') + '}';
}

// Minimal pure-JS sha-1 implementation; avoids a node:crypto dependency that
// would tree-shake out of the browser build but trip jest's module resolution.
export function sha1Hex(s: string): string {
  function rotl(x: number, n: number): number { return (x << n) | (x >>> (32 - n)); }
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  const len = bytes.length;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const bitLen = len * 8;
  // SHA-1 message length is 64 bits, big-endian. Split into hi/lo 32-bit words to
  // avoid JS bit-shift wrapping (`>>>` only uses the low 5 bits of the shift amount).
  const hi = Math.floor(bitLen / 0x100000000);
  const lo = bitLen >>> 0;
  for (let i = 3; i >= 0; i--) bytes.push((hi >>> (i * 8)) & 0xff);
  for (let i = 3; i >= 0; i--) bytes.push((lo >>> (i * 8)) & 0xff);

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Array<number>(80);

  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = (bytes[chunk + i * 4] << 24) | (bytes[chunk + i * 4 + 1] << 16) |
             (bytes[chunk + i * 4 + 2] << 8) | bytes[chunk + i * 4 + 3];
    }
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);

    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20)      { f = (b & c) | (~b & d);          k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d;                   k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else             { f = b ^ c ^ d;                   k = 0xca62c1d6; }
      const t = (rotl(a, 5) + f + e + k + w[i]) | 0;
      e = d; d = c; c = rotl(b, 30); b = a; a = t;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
}
