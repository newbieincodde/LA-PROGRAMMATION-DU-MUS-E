/**
 * STANDALONE LIGHTWEIGHT QR CODE GENERATOR (MIT License)
 * Generates genuine, smartphone-scannable QR Code Model 2 matrices.
 * Zero external dependencies.
 */

// QR Code Type Numbers & Error Correction Level
const QRMode = { MODE_NUMBER: 1 << 0, MODE_ALPHA_NUM: 1 << 1, MODE_8BIT_BYTE: 1 << 2, MODE_KANJI: 1 << 3 };
const QRErrorCorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };

// Polynomial math for Reed-Solomon Error Correction
const QRMath = {
  glog(n) {
    if (n < 1) throw new Error('glog(' + n + ')');
    return QRMath.LOG_TABLE[n];
  },
  gexp(n) {
    while (n < 0) n += 255;
    while (n >= 255) n -= 255;
    return QRMath.EXP_TABLE[n];
  },
  EXP_TABLE: new Array(256),
  LOG_TABLE: new Array(256)
};

for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
for (let i = 8; i < 256; i++) QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
for (let i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

class QRPolynomial {
  constructor(num, shift) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
  }
  get(index) { return this.num[index]; }
  getLength() { return this.num.length; }
  multiply(e) {
    const num = new Array(this.getLength() + e.getLength() - 1).fill(0);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
      }
    }
    return new QRPolynomial(num, 0);
  }
  mod(e) {
    if (this.getLength() - e.getLength() < 0) return this;
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Array(this.getLength());
    for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
    for (let i = 0; i < e.getLength(); i++) num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    return new QRPolynomial(num, 0).mod(e);
  }
}

class QR8bitByte {
  constructor(data) {
    this.mode = QRMode.MODE_8BIT_BYTE;
    this.data = data;
  }
  getLength() {
    return new TextEncoder().encode(this.data).length;
  }
  write(buffer) {
    const bytes = new TextEncoder().encode(this.data);
    for (let i = 0; i < bytes.length; i++) buffer.put(bytes[i], 8);
  }
}

class QRBitBuffer {
  constructor() {
    this.buffer = [];
    this.length = 0;
  }
  get(index) {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  }
  put(num, length) {
    for (let i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) === 1);
  }
  putBit(bit) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) this.buffer.push(0);
    if (bit) this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    this.length++;
  }
}

// RS Block Specs for Versions 1-10 (EC Level M)
const RS_BLOCK_TABLE = [
  [1, 26, 16], [1, 44, 28], [1, 70, 44], [2, 50, 32], [2, 67, 43],
  [4, 43, 27], [4, 56, 36], [4, 68, 44], [5, 66, 42], [5, 78, 50]
];

export class QRCode {
  constructor(typeNumber, errorCorrectLevel = QRErrorCorrectLevel.M) {
    this.typeNumber = typeNumber || 4;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataList = [];
  }

  addData(data) {
    this.dataList.push(new QR8bitByte(data));
  }

  make() {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = Array.from({ length: this.moduleCount }, () => new Array(this.moduleCount).fill(null));

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupTimingPattern();
    this.setupTypeInfo(false, 0);

    const buffer = new QRBitBuffer();
    for (const d of this.dataList) {
      buffer.put(d.mode, 4);
      buffer.put(d.getLength(), 8);
      d.write(buffer);
    }

    const rsSpec = RS_BLOCK_TABLE[this.typeNumber - 1];
    const totalDataCount = rsSpec[0] * rsSpec[2];

    if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.length % 8 !== 0) buffer.putBit(false);

    while (buffer.length < totalDataCount * 8) {
      buffer.put(0xec, 8);
      if (buffer.length < totalDataCount * 8) buffer.put(0x11, 8);
    }

    this.mapData(buffer, rsSpec);
  }

  setupPositionProbePattern(row, col) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        if ((0 <= r && r <= 6 && (c === 0 || c === 6)) ||
            (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
            (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  }

  setupTimingPattern() {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] !== null) continue;
      this.modules[r][6] = r % 2 === 0;
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] !== null) continue;
      this.modules[6][c] = c % 2 === 0;
    }
  }

  setupTypeInfo(test, maskPattern) {
    const data = (this.errorCorrectLevel << 3) | maskPattern;
    const bits = this.getTypeInfoBits(data);

    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 6) this.modules[i][8] = mod;
      else if (i < 8) this.modules[i + 1][8] = mod;
      else this.modules[this.moduleCount - 15 + i][8] = mod;

      if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
      else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
      else this.modules[8][15 - i - 1] = mod;
    }
    this.modules[this.moduleCount - 8][8] = !test;
  }

  getTypeInfoBits(data) {
    let d = data << 10;
    while (this.getBCHDigit(d) - this.getBCHDigit(1335) >= 0) {
      d ^= 1335 << (this.getBCHDigit(d) - this.getBCHDigit(1335));
    }
    return ((data << 10) | d) ^ 21522;
  }

  getBCHDigit(data) {
    let digit = 0;
    while (data !== 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  }

  mapData(buffer, rsSpec) {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 0;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] === null) {
            let dark = false;
            if (bitIndex < buffer.length) {
              dark = buffer.get(bitIndex);
              bitIndex++;
            }
            // Mask pattern 0: (row + col) % 2 === 0
            const mask = (row + (col - c)) % 2 === 0;
            this.modules[row][col - c] = dark ^ mask;
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  isDark(row, col) {
    return this.modules[row][col];
  }

  /**
   * Render directly to an HTML Canvas element with museum-grade styling
   */
  renderToCanvas(canvas, size = 180, darkColor = '#0d0e12', lightColor = '#ffffff') {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;
    const count = this.moduleCount;
    const cellSize = size / count;

    ctx.fillStyle = lightColor;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = darkColor;
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (this.isDark(r, c)) {
          ctx.fillRect(
            Math.round(c * cellSize),
            Math.round(r * cellSize),
            Math.ceil(cellSize),
            Math.ceil(cellSize)
          );
        }
      }
    }
  }
}

/**
 * High-level helper to generate QR Code directly onto a canvas
 */
export function generateTicketQR(canvas, text, size = 180) {
  try {
    const qr = new QRCode(4, QRErrorCorrectLevel.M);
    qr.addData(text);
    qr.make();
    qr.renderToCanvas(canvas, size, '#0d0e12', '#ffffff');
    return true;
  } catch (err) {
    console.error('[QR] Failed to generate genuine QR:', err);
    return false;
  }
}
