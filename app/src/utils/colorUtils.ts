// Color utility functions for shopping list colors

export const predefinedColors = [
  { name: "Red", value: "#d32f2f" },
  { name: "Pink", value: "#c2185b" },
  { name: "Purple", value: "#7b1fa2" },
  { name: "Indigo", value: "#303f9f" },
  { name: "Blue", value: "#1976d2" },
  { name: "Teal", value: "#00796b" },
  { name: "Green", value: "#388e3c" },
  { name: "Yellow", value: "#f9a825" },
  { name: "Orange", value: "#f57c00" },
  { name: "Brown", value: "#5d4037" },
  { name: "Grey", value: "#616161" },
];

/**
 * Get a random color from the predefined colors
 */
export function getRandomColor(): string {
  const randomIndex = Math.floor(Math.random() * predefinedColors.length);
  return predefinedColors[randomIndex].value;
}

/**
 * Convert hex color to HSL
 */
export function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

/**
 * Convert HSL to hex color
 */
export function hslToHex(h: number, s: number, l: number): string {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate a lighter or darker variant of the color based on theme
 */
export function getThemeAwareCardColor(
  color: string,
  isDarkTheme: boolean,
  amount: number = 0.9
): string {
  try {
    const [h, s, l] = hexToHsl(color);

    if (isDarkTheme) {
      // For dark theme, make it darker but maintain some visibility
      const newLightness = Math.max(15, l - amount * (l - 15));
      return hslToHex(h, s * 0.8, newLightness); // Reduce saturation slightly
    } else {
      // For light theme, make it lighter
      const newLightness = Math.min(95, l + amount * (100 - l));
      return hslToHex(h, s * 0.3, newLightness); // Reduce saturation for subtlety
    }
  } catch {
    return isDarkTheme ? "#2a2a2a" : "#f5f5f5"; // Fallback colors
  }
}

/**
 * Generate a lighter variant of the color for the card background (legacy function)
 */
export function getLighterColor(color: string, amount: number = 0.9): string {
  return getThemeAwareCardColor(color, false, amount);
}

/**
 * Generate a darker variant of the color for hover states
 */
export function getDarkerColor(color: string, amount: number = 0.1): string {
  try {
    const [h, s, l] = hexToHsl(color);
    const newLightness = Math.max(5, l - amount * l);
    return hslToHex(h, s, newLightness);
  } catch {
    return "#333333"; // Fallback to dark grey
  }
}

/**
 * Check if a color is light or dark (for text contrast)
 */
export function isLightColor(color: string): boolean {
  try {
    const [, , l] = hexToHsl(color);
    return l > 50;
  } catch {
    return true; // Default to light
  }
}

/**
 * Get appropriate text color (black or white) based on background color
 */
export function getContrastTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? "#000000" : "#ffffff";
}
