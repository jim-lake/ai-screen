import { fromBER } from 'asn1js';

import { errorLog } from './log';

export type SSHWireItem = string | Uint8Array;
export type SSHKeyType =
  | 'ssh-ed25519'
  | 'ssh-rsa'
  | 'rsa-sha2-256'
  | 'rsa-sha2-512'
  | 'ecdsa-sha2-nistp256'
  | 'ecdsa-sha2-nistp384'
  | 'ecdsa-sha2-nistp521';

enum KeyCurve {
  'ecdsa-sha2-nistp256' = 'nistp256',
  'ecdsa-sha2-nistp384' = 'nistp384',
  'ecdsa-sha2-nistp521' = 'nistp521',
}
enum KeyToPublic {
  'ssh-ed25519' = 'ssh-ed25519',
  'ssh-rsa' = 'ssh-rsa',
  'rsa-sha2-256' = 'ssh-rsa',
  'rsa-sha2-512' = 'ssh-rsa',
  'ecdsa-sha2-nistp256' = 'ecdsa-sha2-nistp256',
  'ecdsa-sha2-nistp384' = 'ecdsa-sha2-nistp284',
  'ecdsa-sha2-nistp521' = 'ecdsa-sha2-nistp521',
}

export default { makeSSHPublicKey, makeSSHWire, toBase64, fromBase64 };
export function makeSSHPublicKey(
  type: SSHKeyType,
  public_key: Uint8Array,
  comment?: string
): string {
  const public_type = KeyToPublic[type];
  const curve = KeyCurve[type];
  const parts = [public_type];
  if (curve) {
    parts.push(curve);
  }
  parts.push(..._maybeConvertPublic(public_key));
  const wire = makeSSHWire(parts);
  const b64 = toBase64(wire);
  return `${public_type} ${b64}${comment ? ' ' + comment : ''}`;
}
export function makeSSHWireKey(
  type: SSHKeyType,
  public_key: Uint8Array
): string {
  const curve = KeyCurve[type];
  const parts = [type];
  if (curve) {
    parts.push(curve);
  }
  parts.push(..._maybeConvertPublic(public_key));
  const wire = makeSSHWire(parts);
  return toBase64(wire);
}
export function makeSSHWire(items: SSHWireItem[]): Uint8Array {
  const encodedParts: Uint8Array[] = [];

  for (const item of items) {
    let bytes: Uint8Array;

    if (typeof item === 'string') {
      bytes = new TextEncoder().encode(item);
      encodedParts.push(_encodeLength(bytes.length), bytes);
    } else if (item instanceof Uint8Array) {
      encodedParts.push(_encodeLength(item.length), item);
    }
  }

  const totalLen = encodedParts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLen);

  let offset = 0;
  for (const part of encodedParts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
export function toBase64(data: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < data.length; i += chunkSize) {
    binary += String.fromCharCode(...data.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  return new Uint8Array([...bin].map((ch) => ch.charCodeAt(0)));
}
function _encodeLength(len: number): Uint8Array {
  const buf = new Uint8Array(4);
  const view = new DataView(buf.buffer);
  view.setUint32(0, len, false);
  return buf;
}
function _maybeConvertPublic(public_key: Uint8Array): Uint8Array[] {
  let ret = [public_key];
  if (public_key.length > 250 && public_key[0] === 0x30) {
    try {
      const { e, n } = _parseRsaPublicKey(public_key);
      const e_int = _mpint(e);
      const n_int = _mpint(n);
      ret = [e_int, n_int];
    } catch (e) {
      errorLog('_maybeConvertPublic: threw:', e, public_key);
    }
  }
  return ret;
}
function _mpint(bytes: Uint8Array): Uint8Array {
  let i = 0;
  while (i < bytes.length - 1 && bytes[i] === 0) {
    i++;
  }
  let b = bytes.slice(i);
  if (b[0] & 0x80) {
    b = _concatUint8Arrays(new Uint8Array([0]), b);
  }
  return b;
}
function _concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((acc, a) => acc + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
export function _parseRsaPublicKey(public_key: Uint8Array): {
  n: Uint8Array;
  e: Uint8Array;
} {
  const asn1 = fromBER(public_key.buffer);
  if (asn1.offset === -1) {
    throw new Error('Invalid ASN.1');
  }
  const seq = asn1.result;
  const n_hex = seq.valueBlock.value[0].valueBlock.valueHex;
  const e_hex = seq.valueBlock.value[1].valueBlock.valueHex;
  const n = new Uint8Array(n_hex);
  const e = new Uint8Array(e_hex);
  return { n, e };
}
