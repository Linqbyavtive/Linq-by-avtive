export function parseColorLuminance(color: string): number | null {
  if (!color || typeof color !== "string") return null;
  const s = color.trim().toLowerCase();

  // Handle Hex
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) {
    let hex = s.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map((c) => c + c).join("");
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  // Handle RGB / RGBA
  const rgbMatch = s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    if (r <= 255 && g <= 255 && b <= 255) {
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }
  }

  // Handle HSL / HSLA
  const hslMatch = s.match(/^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%/);
  if (hslMatch) {
    const l = parseInt(hslMatch[3], 10);
    if (l <= 100) {
      return l / 100;
    }
  }

  // Named Colors
  const NAMED_LUMINANCE: Record<string, number> = {
    black: 0,
    navy: 0.1,
    darkblue: 0.1,
    mediumblue: 0.15,
    blue: 0.2,
    darkgreen: 0.15,
    green: 0.25,
    teal: 0.3,
    darkcyan: 0.35,
    deepskyblue: 0.5,
    darkturquoise: 0.55,
    mediumspringgreen: 0.65,
    lime: 0.7,
    springgreen: 0.75,
    aqua: 0.8,
    cyan: 0.8,
    midnightblue: 0.1,
    dodgerblue: 0.45,
    lightseagreen: 0.5,
    forestgreen: 0.3,
    seagreen: 0.35,
    darkslategray: 0.2,
    darkslategrey: 0.2,
    limegreen: 0.55,
    mediumseagreen: 0.5,
    turquoise: 0.65,
    royalblue: 0.35,
    steelblue: 0.4,
    darkslateblue: 0.2,
    mediumturquoise: 0.6,
    indigo: 0.1,
    darkolivegreen: 0.25,
    cadetblue: 0.5,
    cornflowerblue: 0.55,
    rebeccapurple: 0.25,
    mediumaquamarine: 0.65,
    dimgray: 0.35,
    dimgrey: 0.35,
    slateblue: 0.35,
    olivedrab: 0.4,
    slategray: 0.45,
    slategrey: 0.45,
    lightslategray: 0.55,
    lightslategrey: 0.55,
    mediumslateblue: 0.5,
    lawngreen: 0.7,
    chartreuse: 0.75,
    aquamarine: 0.8,
    maroon: 0.15,
    purple: 0.2,
    olive: 0.35,
    gray: 0.5,
    grey: 0.5,
    skyblue: 0.7,
    lightskyblue: 0.75,
    blueviolet: 0.35,
    darkred: 0.2,
    darkmagenta: 0.25,
    saddlebrown: 0.25,
    darkseagreen: 0.6,
    lightgreen: 0.75,
    mediumpurple: 0.5,
    darkviolet: 0.3,
    palegreen: 0.75,
    darkorchid: 0.35,
    yellowgreen: 0.6,
    sienna: 0.35,
    brown: 0.3,
    darkgray: 0.65,
    darkgrey: 0.65,
    lightblue: 0.8,
    greenyellow: 0.8,
    paleturquoise: 0.85,
    lightsteelblue: 0.75,
    powderblue: 0.8,
    firebrick: 0.3,
    darkgoldenrod: 0.45,
    mediumorchid: 0.5,
    rosybrown: 0.6,
    darkkhaki: 0.65,
    silver: 0.75,
    mediumvioletred: 0.35,
    indianred: 0.45,
    peru: 0.5,
    chocolate: 0.45,
    tan: 0.7,
    lightgray: 0.8,
    lightgrey: 0.8,
    thistle: 0.8,
    orchid: 0.65,
    goldenrod: 0.6,
    palevioletred: 0.6,
    crimson: 0.35,
    gainsboro: 0.85,
    plum: 0.75,
    burlywood: 0.7,
    lightcyan: 0.95,
    lavender: 0.9,
    darksalmon: 0.65,
    violet: 0.65,
    palegoldenrod: 0.85,
    lightcoral: 0.65,
    khaki: 0.8,
    aliceblue: 0.95,
    honeydew: 0.95,
    azure: 0.95,
    sandybrown: 0.65,
    wheat: 0.85,
    beige: 0.95,
    whitesmoke: 0.95,
    mintcream: 0.95,
    ghostwhite: 0.95,
    salmon: 0.65,
    antiquewhite: 0.9,
    linen: 0.95,
    lightgoldenrodyellow: 0.95,
    oldlace: 0.95,
    red: 0.3,
    fuchsia: 0.4,
    magenta: 0.4,
    deeppink: 0.45,
    orangered: 0.45,
    tomato: 0.5,
    hotpink: 0.6,
    coral: 0.55,
    darkorange: 0.55,
    lightsalmon: 0.75,
    orange: 0.6,
    lightpink: 0.8,
    pink: 0.8,
    gold: 0.7,
    peachpuff: 0.85,
    navajowhite: 0.85,
    moccasin: 0.9,
    bisque: 0.9,
    mistyrose: 0.9,
    blanchedalmond: 0.9,
    papayawhip: 0.95,
    lavenderblush: 0.95,
    seashell: 0.95,
    cornsilk: 0.95,
    lemonchiffon: 0.95,
    floralwhite: 0.95,
    snow: 0.98,
    yellow: 0.85,
    lightyellow: 0.95,
    ivory: 0.98,
    white: 1,
  };

  if (NAMED_LUMINANCE[s] !== undefined) {
    return NAMED_LUMINANCE[s];
  }

  // Browser-level CSS validation
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = s;
        ctx.fillRect(0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        if (data[3] > 0) {
          return (0.299 * data[0] + 0.587 * data[1] + 0.114 * data[2]) / 255;
        }
      }
    } catch {
      // Fallback
    }
  }

  return null;
}

export function isValidCssColor(color?: string): boolean {
  if (!color || typeof color !== "string") return false;
  const s = color.trim();
  if (!s) return false;
  return parseColorLuminance(s) !== null;
}
