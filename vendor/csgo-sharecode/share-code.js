export const DICTIONARY = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789';
const DICTIONARY_LENGTH = BigInt(DICTIONARY.length);
const SHARECODE_BYTE_LENGTH = 18;
const SHARECODE_CHAR_COUNT = 25;
export class InvalidShareCode extends Error {
    constructor() {
        super('Invalid share code');
        Object.setPrototypeOf(this, InvalidShareCode.prototype);
    }
}
export class InvalidCrosshairShareCode extends Error {
    constructor() {
        super('Invalid crosshair share code');
        Object.setPrototypeOf(this, InvalidCrosshairShareCode.prototype);
    }
}
function bytesToHex(bytes) {
    return Array.from(bytes, (byte) => {
        return ('0' + (byte & 0xff).toString(16)).slice(-2);
    }).join('');
}
export function bytesToBigInt(bytes) {
    const hex = bytesToHex(bytes);
    return BigInt(`0x${hex}`);
}
export function stringToBytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i += 2) {
        bytes.push(parseInt(str.slice(i, i + 2), 16));
    }
    return bytes;
}
export function int16ToBytes(number) {
    return [(number & 0x0000ff00) >> 8, number & 0x000000ff];
}
export function uint8ToInt8(number) {
    return (number << 24) >> 24;
}
export function sumArray(array) {
    return array.reduce((previousValue, value) => {
        return previousValue + value;
    }, 0);
}
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
export function charsToBytes(chars, byteLength) {
    const reversedChars = Array.from(chars).reverse();
    let big = BigInt(0);
    for (let i = 0; i < reversedChars.length; i++) {
        big = big * DICTIONARY_LENGTH + BigInt(DICTIONARY.indexOf(reversedChars[i]));
    }
    const str = big.toString(16).padStart(byteLength * 2, '0');
    const bytes = stringToBytes(str);
    return bytes;
}
export function bytesToChars(bytes, charCount) {
    const hex = bytesToHex(bytes);
    let total = BigInt(`0x${hex}`);
    let chars = '';
    let rem = BigInt(0);
    for (let i = 0; i < charCount; i++) {
        rem = total % DICTIONARY_LENGTH;
        chars += DICTIONARY[Number(rem)];
        total = total / DICTIONARY_LENGTH;
    }
    return chars;
}
export function shareCodeToBytes(shareCode) {
    const regex = new RegExp(`^CSGO(-?[${DICTIONARY}]{5}){5}$`);
    if (!shareCode.match(regex)) {
        throw new InvalidShareCode();
    }
    return charsToBytes(shareCode.replace(/CSGO|-/g, ''), SHARECODE_BYTE_LENGTH);
}
export function bytesToShareCode(bytes) {
    const chars = bytesToChars(bytes, SHARECODE_CHAR_COUNT);
    return `CSGO-${chars.slice(0, 5)}-${chars.slice(5, 10)}-${chars.slice(10, 15)}-${chars.slice(15, 20)}-${chars.slice(20, 25)}`;
}
export function assertCrosshairChecksum(bytes) {
    const checksum = sumArray(bytes.slice(1)) % 256;
    if (bytes[0] !== checksum) {
        throw new InvalidCrosshairShareCode();
    }
}
//# sourceMappingURL=share-code.js.map