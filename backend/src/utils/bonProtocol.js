/**
 * BON (Binary Object Notation) 协议实现
 * Node.js 版本
 */

import lz4 from 'lz4';

// 数据类型常量
const BON_NULL = 0;
const BON_INT = 1;
const BON_LONG = 2;
const BON_FLOAT = 3;
const BON_DOUBLE = 4;
const BON_STRING = 5;
const BON_BOOLEAN = 6;
const BON_BINARY = 7;
const BON_MAP = 8;
const BON_ARRAY = 9;
const BON_DATETIME = 10;
const BON_STRING_REF = 99;

/**
 * 数据读取器
 */
export class DataReader {
  constructor(bytes) {
    this._data = bytes || Buffer.alloc(0);
    this.position = 0;
  }

  get data() {
    return this._data;
  }

  reset(bytes) {
    this._data = bytes;
    this.position = 0;
  }

  validate(n) {
    if (this.position + n > this._data.length) {
      return false;
    }
    return true;
  }

  readUInt8() {
    if (!this.validate(1)) return undefined;
    return this._data[this.position++];
  }

  readInt16() {
    if (!this.validate(2)) return undefined;
    const v = this._data[this.position++] | (this._data[this.position++] << 8);
    return (v << 16) >> 16;
  }

  readInt32() {
    if (!this.validate(4)) return undefined;
    const v =
      this._data[this.position++] |
      (this._data[this.position++] << 8) |
      (this._data[this.position++] << 16) |
      (this._data[this.position++] << 24);
    return v | 0;
  }

  readInt64() {
    const lo = this.readInt32();
    if (lo === undefined) return undefined;
    let _lo = lo;
    if (_lo < 0) _lo += 0x100000000;
    const hi = this.readInt32();
    if (hi === undefined) return undefined;
    return _lo + 0x100000000 * hi;
  }

  readFloat32() {
    if (!this.validate(4)) return undefined;
    const v = this._data.readFloatLE(this.position);
    this.position += 4;
    return v;
  }

  readFloat64() {
    if (!this.validate(8)) return undefined;
    const v = this._data.readDoubleLE(this.position);
    this.position += 8;
    return v;
  }

  read7BitInt() {
    let value = 0;
    let shift = 0;
    let b = 0;
    let count = 0;
    do {
      if (count++ === 35) throw new Error('Format_Bad7BitInt32');
      b = this.readUInt8();
      value |= (b & 0x7f) << shift;
      shift += 7;
    } while ((b & 0x80) !== 0);
    return value >>> 0;
  }

  readUTF() {
    const len = this.read7BitInt();
    return this.readUTFBytes(len);
  }

  readUint8Array(length) {
    const start = this.position;
    const end = start + length;
    const out = this._data.slice(start, end);
    this.position = end;
    return out;
  }

  readUTFBytes(length) {
    if (length === 0) return '';
    if (!this.validate(length)) return undefined;
    const str = this._data.toString('utf8', this.position, this.position + length);
    this.position += length;
    return str;
  }
}

/**
 * 数据写入器
 */
export class DataWriter {
  constructor(initialSize = 524288) {
    this.position = 0;
    this.data = Buffer.alloc(initialSize);
  }

  ensureBuffer(n) {
    const required = this.position + n;
    if (required > this.data.length) {
      const newSize = Math.max(required, this.data.length * 2);
      const newData = Buffer.alloc(newSize);
      this.data.copy(newData, 0, 0, this.position);
      this.data = newData;
    }
  }

  writeInt8(v) {
    this.ensureBuffer(1);
    this.data[this.position++] = v & 0xff;
  }

  writeInt16(v) {
    this.ensureBuffer(2);
    this.data[this.position++] = v & 0xff;
    this.data[this.position++] = (v >> 8) & 0xff;
  }

  writeInt32(v) {
    this.ensureBuffer(4);
    this.data[this.position++] = v & 0xff;
    this.data[this.position++] = (v >> 8) & 0xff;
    this.data[this.position++] = (v >> 16) & 0xff;
    this.data[this.position++] = (v >> 24) & 0xff;
  }

  writeInt64(v) {
    const lo = v & 0xffffffff;
    const hi = Math.floor(v / 0x100000000);
    this.writeInt32(lo);
    this.writeInt32(hi);
  }

  writeFloat32(v) {
    this.ensureBuffer(4);
    this.data.writeFloatLE(v, this.position);
    this.position += 4;
  }

  writeFloat64(v) {
    this.ensureBuffer(8);
    this.data.writeDoubleLE(v, this.position);
    this.position += 8;
  }

  _write7BitInt(v) {
    let n = v >>> 0;
    while (n >= 0x80) {
      this.data[this.position++] = (n & 0xff) | 0x80;
      n >>>= 7;
    }
    this.data[this.position++] = n & 0x7f;
  }

  write7BitInt(v) {
    this.ensureBuffer(5);
    this._write7BitInt(v);
  }

  writeUTF(str) {
    const buf = Buffer.from(str, 'utf8');
    this.write7BitInt(buf.length);
    this.ensureBuffer(buf.length);
    buf.copy(this.data, this.position);
    this.position += buf.length;
  }

  writeUint8Array(src) {
    this.ensureBuffer(src.length);
    src.copy(this.data, this.position);
    this.position += src.length;
  }

  getBytes() {
    return this.data.slice(0, this.position);
  }

  reset() {
    this.position = 0;
  }
}

/**
 * BON 编码器
 */
export class BonEncoder {
  constructor() {
    this.dw = new DataWriter();
    this.strMap = new Map();
  }

  reset() {
    this.dw.reset();
    this.strMap.clear();
  }

  encodeInt(v) {
    this.dw.writeInt8(BON_INT);
    this.dw.writeInt32(v | 0);
  }

  encodeLong(v) {
    this.dw.writeInt8(BON_LONG);
    this.dw.writeInt64(v);
  }

  encodeFloat(v) {
    this.dw.writeInt8(BON_FLOAT);
    this.dw.writeFloat32(v);
  }

  encodeDouble(v) {
    this.dw.writeInt8(BON_DOUBLE);
    this.dw.writeFloat64(v);
  }

  encodeNumber(v) {
    if ((v | 0) === v) this.encodeInt(v);
    else if (Math.floor(v) === v) this.encodeLong(v);
    else this.encodeDouble(v);
  }

  encodeString(s) {
    const hit = this.strMap.get(s);
    if (hit !== undefined) {
      this.dw.writeInt8(BON_STRING_REF);
      this.dw.write7BitInt(hit);
      return;
    }
    this.dw.writeInt8(BON_STRING);
    this.dw.writeUTF(s);
    this.strMap.set(s, this.strMap.size);
  }

  encodeBoolean(b) {
    this.dw.writeInt8(BON_BOOLEAN);
    this.dw.writeInt8(b ? 1 : 0);
  }

  encodeNull() {
    this.dw.writeInt8(BON_NULL);
  }

  encodeDateTime(d) {
    this.dw.writeInt8(BON_DATETIME);
    this.dw.writeInt64(d.getTime());
  }

  encodeBinary(u8) {
    this.dw.writeInt8(BON_BINARY);
    this.dw.write7BitInt(u8.length);
    this.dw.writeUint8Array(u8);
  }

  encodeArray(arr) {
    this.dw.writeInt8(BON_ARRAY);
    this.dw.write7BitInt(arr.length);
    for (let i = 0; i < arr.length; i++) this.encode(arr[i]);
  }

  encodeObject(obj) {
    this.dw.writeInt8(BON_MAP);
    const keys = [];
    for (const k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      if (k.startsWith('_')) continue;
      const type = typeof obj[k];
      if (type === 'function' || type === 'undefined') continue;
      keys.push(k);
    }
    this.dw.write7BitInt(keys.length);
    for (const k of keys) {
      this.encode(k);
      this.encode(obj[k]);
    }
  }

  encode(v) {
    if (v === null) {
      this.encodeNull();
    } else if (v === undefined) {
      this.encodeNull();
    } else if (typeof v === 'boolean') {
      this.encodeBoolean(v);
    } else if (typeof v === 'number') {
      this.encodeNumber(v);
    } else if (typeof v === 'string') {
      this.encodeString(v);
    } else if (Buffer.isBuffer(v)) {
      this.encodeBinary(v);
    } else if (v instanceof Date) {
      this.encodeDateTime(v);
    } else if (Array.isArray(v)) {
      this.encodeArray(v);
    } else if (v instanceof Map) {
      this.dw.writeInt8(BON_MAP);
      this.dw.write7BitInt(v.size);
      v.forEach((val, key) => {
        this.encode(key);
        this.encode(val);
      });
    } else if (typeof v === 'object') {
      this.encodeObject(v);
    } else {
      throw new Error(`Unsupported type: ${typeof v}`);
    }
  }

  getBytes() {
    return this.dw.getBytes();
  }
}

/**
 * BON 解码器
 */
export class BonDecoder {
  constructor() {
    this.dr = new DataReader();
    this.strArr = [];
  }

  reset(bytes) {
    this.dr.reset(bytes);
    this.strArr = [];
  }

  decode() {
    const type = this.dr.readUInt8();
    if (type === undefined) return undefined;

    switch (type) {
      case BON_NULL:
        return null;
      case BON_INT:
        return this.dr.readInt32();
      case BON_LONG:
        return this.dr.readInt64();
      case BON_FLOAT:
        return this.dr.readFloat32();
      case BON_DOUBLE:
        return this.dr.readFloat64();
      case BON_STRING: {
        const s = this.dr.readUTF();
        this.strArr.push(s);
        return s;
      }
      case BON_STRING_REF: {
        const idx = this.dr.read7BitInt();
        return this.strArr[idx];
      }
      case BON_BOOLEAN:
        return this.dr.readUInt8() !== 0;
      case BON_BINARY: {
        const len = this.dr.read7BitInt();
        return this.dr.readUint8Array(len);
      }
      case BON_MAP: {
        const size = this.dr.read7BitInt();
        const obj = {};
        for (let i = 0; i < size; i++) {
          const key = this.decode();
          const value = this.decode();
          obj[key] = value;
        }
        return obj;
      }
      case BON_ARRAY: {
        const size = this.dr.read7BitInt();
        const arr = [];
        for (let i = 0; i < size; i++) {
          arr.push(this.decode());
        }
        return arr;
      }
      case BON_DATETIME: {
        const ts = this.dr.readInt64();
        return new Date(ts);
      }
      default:
        throw new Error(`Unknown BON type: ${type}`);
    }
  }
}

/**
 * 编码对象为 BON 格式
 */
export function encodeBon(obj, compress = false) {
  const encoder = new BonEncoder();
  encoder.encode(obj);
  const bytes = encoder.getBytes();
  
  if (compress) {
    const compressed = lz4.compress(bytes);
    const result = Buffer.alloc(compressed.length + 4);
    result.writeUInt32LE(bytes.length, 0);
    compressed.copy(result, 4);
    return result;
  }
  
  return bytes;
}

/**
 * 解码 BON 格式数据
 */
export function decodeBon(bytes, compressed = false) {
  let data = bytes;
  
  if (compressed) {
    const originalSize = bytes.readUInt32LE(0);
    data = lz4.decompress(bytes.slice(4), originalSize);
  }
  
  const decoder = new BonDecoder();
  decoder.reset(data);
  return decoder.decode();
}

export default {
  BonEncoder,
  BonDecoder,
  DataReader,
  DataWriter,
  encodeBon,
  decodeBon
};
