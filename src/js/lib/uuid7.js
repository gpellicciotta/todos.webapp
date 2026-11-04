/**
 * UUID version 7 identifiers (RFC 9562), generated in the client.
 *
 * The first 48 bits hold the Unix time in milliseconds, so identifiers sort by creation time.
 * Within one millisecond, a 12-bit counter keeps them increasing (RFC 9562, method 1).
 */

let lastTime = -1;
let lastSequence = 0;

/**
 * Return a new lowercase UUIDv7 string.
 * @param {() => number} [clock] returns the current time in milliseconds
 * @returns {string} the identifier
 */
export function uuid7(clock = Date.now) {
  const random = crypto.getRandomValues(new Uint8Array(10));
  let time = clock();
  let sequence;
  if (time <= lastTime) {
    time = lastTime;
    sequence = lastSequence + 1;
    if (sequence > 0xfff) {
      time += 1;
      sequence = random[0] & 0x7ff;
    }
  }
  else {
    sequence = ((random[0] << 8) | random[1]) & 0x7ff;
  }
  lastTime = time;
  lastSequence = sequence;

  const bytes = new Uint8Array(16);
  let rest = time;
  for (let i = 5; i >= 0; i--) {
    bytes[i] = rest % 256;
    rest = Math.floor(rest / 256);
  }
  bytes[6] = 0x70 | (sequence >> 8);
  bytes[7] = sequence & 0xff;
  bytes[8] = 0x80 | (random[2] & 0x3f);
  bytes.set(random.subarray(3, 10), 9);

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Return the creation time encoded in a UUIDv7.
 * @param {string} id a UUIDv7 string
 * @returns {number} the Unix time in milliseconds
 */
export function uuid7Time(id) {
  return parseInt(id.replaceAll('-', '').slice(0, 12), 16);
}
