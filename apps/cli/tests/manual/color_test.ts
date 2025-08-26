#!/usr/bin/env tsx
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */

// Zero-dependency manual color test script
// Hardcoded ANSI escape sequences for testing terminal color support

// ANSI escape sequence constants
const ESC = '\x1b[';
const RESET = `${ESC}0m`;

// Foreground colors (30-37)
const FG_BLACK = `${ESC}30m`;
const FG_RED = `${ESC}31m`;
const FG_GREEN = `${ESC}32m`;
const FG_YELLOW = `${ESC}33m`;
const FG_BLUE = `${ESC}34m`;
const FG_MAGENTA = `${ESC}35m`;
const FG_CYAN = `${ESC}36m`;
const FG_WHITE = `${ESC}37m`;

// Bright foreground colors (90-97)
const FG_BRIGHT_BLACK = `${ESC}90m`;
const FG_BRIGHT_RED = `${ESC}91m`;
const FG_BRIGHT_GREEN = `${ESC}92m`;
const FG_BRIGHT_YELLOW = `${ESC}93m`;
const FG_BRIGHT_BLUE = `${ESC}94m`;
const FG_BRIGHT_MAGENTA = `${ESC}95m`;
const FG_BRIGHT_CYAN = `${ESC}96m`;
const FG_BRIGHT_WHITE = `${ESC}97m`;

// Background colors (40-47)
const BG_BLACK = `${ESC}40m`;
const BG_RED = `${ESC}41m`;
const BG_GREEN = `${ESC}42m`;
const BG_YELLOW = `${ESC}43m`;
const BG_BLUE = `${ESC}44m`;
const BG_MAGENTA = `${ESC}45m`;
const BG_CYAN = `${ESC}46m`;
const BG_WHITE = `${ESC}47m`;

// Bright background colors (100-107)
const BG_BRIGHT_BLACK = `${ESC}100m`;
const BG_BRIGHT_RED = `${ESC}101m`;
const BG_BRIGHT_GREEN = `${ESC}102m`;
const BG_BRIGHT_YELLOW = `${ESC}103m`;
const BG_BRIGHT_BLUE = `${ESC}104m`;
const BG_BRIGHT_MAGENTA = `${ESC}105m`;
const BG_BRIGHT_CYAN = `${ESC}106m`;
const BG_BRIGHT_WHITE = `${ESC}107m`;

// Text attributes
const BOLD = `${ESC}1m`;
const ITALIC = `${ESC}3m`;
const DIM = `${ESC}2m`;
const UNDERLINE = `${ESC}4m`;
const BLINK = `${ESC}5m`;
const INVERSE = `${ESC}7m`;
const INVISIBLE = `${ESC}8m`;
const STRIKETHROUGH = `${ESC}9m`;
const OVERLINE = `${ESC}53m`;

// Helper functions
function fg256(color: number): string {
  return `${ESC}38;5;${color}m`;
}

function bg256(color: number): string {
  return `${ESC}48;5;${color}m`;
}

function fgRGB(r: number, g: number, b: number): string {
  return `${ESC}38;2;${r};${g};${b}m`;
}

function bgRGB(r: number, g: number, b: number): string {
  return `${ESC}48;2;${r};${g};${b}m`;
}

function colorText(text: string, ...codes: string[]): string {
  return codes.join('') + text + RESET;
}

// Color names for reference
const basicColorNames = [
  'Black', 'Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan', 'White'
];

const brightColorNames = [
  'Bright Black', 'Bright Red', 'Bright Green', 'Bright Yellow', 
  'Bright Blue', 'Bright Magenta', 'Bright Cyan', 'Bright White'
];

const basicFgColors = [
  FG_BLACK, FG_RED, FG_GREEN, FG_YELLOW, FG_BLUE, FG_MAGENTA, FG_CYAN, FG_WHITE
];

const brightFgColors = [
  FG_BRIGHT_BLACK, FG_BRIGHT_RED, FG_BRIGHT_GREEN, FG_BRIGHT_YELLOW,
  FG_BRIGHT_BLUE, FG_BRIGHT_MAGENTA, FG_BRIGHT_CYAN, FG_BRIGHT_WHITE
];

const basicBgColors = [
  BG_BLACK, BG_RED, BG_GREEN, BG_YELLOW, BG_BLUE, BG_MAGENTA, BG_CYAN, BG_WHITE
];

const brightBgColors = [
  BG_BRIGHT_BLACK, BG_BRIGHT_RED, BG_BRIGHT_GREEN, BG_BRIGHT_YELLOW,
  BG_BRIGHT_BLUE, BG_BRIGHT_MAGENTA, BG_BRIGHT_CYAN, BG_BRIGHT_WHITE
];

console.log('🎨 ANSI Color Test Suite');
console.log('========================\n');

// Test 1: Basic 8 colors (30-37) foreground
console.log('📝 Basic Foreground Colors (30-37):');
console.log('-----------------------------------');
for (let i = 0; i < 8; i++) {
  const colorName = basicColorNames[i];
  const colorCode = basicFgColors[i];
  console.log(colorText(`${colorName} (${30 + i})`, colorCode));
}
console.log();

// Test 2: Bright 8 colors (90-97) foreground  
console.log('✨ Bright Foreground Colors (90-97):');
console.log('------------------------------------');
for (let i = 0; i < 8; i++) {
  const colorName = brightColorNames[i];
  const colorCode = brightFgColors[i];
  console.log(colorText(`${colorName} (${90 + i})`, colorCode));
}
console.log();

// Test 3: Basic 8 colors (40-47) background
console.log('🎯 Basic Background Colors (40-47):');
console.log('-----------------------------------');
for (let i = 0; i < 8; i++) {
  const colorName = basicColorNames[i];
  const bgColor = basicBgColors[i];
  // Use white text on dark backgrounds, black text on light backgrounds
  const fgColor = (i === 0 || i === 4) ? FG_WHITE : FG_BLACK;
  console.log(colorText(`${colorName} BG (${40 + i})`, fgColor, bgColor));
}
console.log();

// Test 4: Bright 8 colors (100-107) background
console.log('🌟 Bright Background Colors (100-107):');
console.log('--------------------------------------');
for (let i = 0; i < 8; i++) {
  const colorName = brightColorNames[i];
  const bgColor = brightBgColors[i];
  // Use black text on bright backgrounds (they're all light)
  console.log(colorText(`${colorName} BG (${100 + i})`, FG_BLACK, bgColor));
}
console.log();

// Test 5: 256-color palette sample (foreground)
console.log('🌈 256-Color Palette Sample (Foreground):');
console.log('-----------------------------------------');
console.log('Standard colors (0-15):');
for (let i = 0; i < 16; i++) {
  const colorCode = fg256(i);
  process.stdout.write(colorText(`Color ${i.toString().padStart(3)}`, colorCode) + '  ');
  if ((i + 1) % 8 === 0) {console.log();}
}
console.log();

console.log('216 RGB colors (16-231) - Sample every 6th color:');
for (let i = 16; i < 232; i += 6) {
  const colorCode = fg256(i);
  process.stdout.write(colorText(i.toString().padStart(3), colorCode) + ' ');
  if ((i - 16) % 36 === 30) {console.log();}
}
console.log();

console.log('Grayscale colors (232-255):');
for (let i = 232; i < 256; i++) {
  const colorCode = fg256(i);
  process.stdout.write(colorText(i.toString().padStart(3), colorCode) + ' ');
  if ((i - 232 + 1) % 12 === 0) {console.log();}
}
console.log();

// Test 6: 256-color palette sample (background)
console.log('🎨 256-Color Palette Sample (Background):');
console.log('-----------------------------------------');
console.log('Standard colors (0-15) backgrounds:');
for (let i = 0; i < 16; i++) {
  // Use contrasting foreground colors
  const fgColor = (i < 8 && i !== 3 && i !== 6) ? FG_WHITE : FG_BLACK;
  const bgColor = bg256(i);
  process.stdout.write(colorText(`BG${i.toString().padStart(2)}`, fgColor, bgColor) + ' ');
  if ((i + 1) % 8 === 0) {console.log();}
}
console.log();

console.log('RGB colors backgrounds - Sample every 12th color:');
for (let i = 16; i < 232; i += 12) {
  const bgColor = bg256(i);
  process.stdout.write(colorText(i.toString().padStart(3), FG_BLACK, bgColor) + ' ');
  if ((i - 16) % 72 === 64) {console.log();}
}
console.log();

// Test 7: RGB colors (24-bit)
console.log('🌈 RGB (24-bit) Color Sample:');
console.log('-----------------------------');
const rgbColors = [
  { name: 'Pure Red', r: 255, g: 0, b: 0 },
  { name: 'Pure Green', r: 0, g: 255, b: 0 },
  { name: 'Pure Blue', r: 0, g: 0, b: 255 },
  { name: 'Yellow', r: 255, g: 255, b: 0 },
  { name: 'Magenta', r: 255, g: 0, b: 255 },
  { name: 'Cyan', r: 0, g: 255, b: 255 },
  { name: 'Orange', r: 255, g: 165, b: 0 },
  { name: 'Purple', r: 128, g: 0, b: 128 },
  { name: 'Pink', r: 255, g: 192, b: 203 },
  { name: 'Lime', r: 50, g: 205, b: 50 },
];

for (const color of rgbColors) {
  const fgColor = fgRGB(color.r, color.g, color.b);
  console.log(colorText(`${color.name} RGB(${color.r},${color.g},${color.b})`, fgColor));
}
console.log();

// Test 8: RGB backgrounds
console.log('🎯 RGB (24-bit) Background Sample:');
console.log('----------------------------------');
for (const color of rgbColors) {
  const bgColor = bgRGB(color.r, color.g, color.b);
  // Use black or white text based on brightness
  const brightness = (color.r * 299 + color.g * 587 + color.b * 114) / 1000;
  const fgColor = brightness > 128 ? FG_BLACK : FG_WHITE;
  console.log(colorText(`${color.name} BG`, fgColor, bgColor));
}
console.log();

// Test 9: Text attributes with colors
console.log('🎭 Text Attributes with Colors:');
console.log('-------------------------------');
console.log(colorText('Bold Red', BOLD, FG_RED));
console.log(colorText('Italic Green', ITALIC, FG_GREEN));
console.log(colorText('Underline Blue', UNDERLINE, FG_BLUE));
console.log(colorText('Dim Yellow', DIM, FG_YELLOW));
console.log(colorText('Strikethrough Magenta', STRIKETHROUGH, FG_MAGENTA));
console.log(colorText('Blink Cyan', BLINK, FG_CYAN));
console.log(colorText('Inverse White', INVERSE, FG_WHITE));
console.log(colorText('Overline Red', OVERLINE, FG_RED));
console.log();

// Test 10: Mixed formatting demonstration
console.log('🎪 Mixed Formatting Demonstration:');
console.log('----------------------------------');
process.stdout.write('Normal ');
process.stdout.write(colorText('Bold Red ', BOLD, FG_RED));
process.stdout.write(colorText('Italic Blue ', ITALIC, FG_BLUE));
process.stdout.write(colorText('Yellow BG ', FG_BLACK, BG_YELLOW));
process.stdout.write(colorText('RGB Purple ', fgRGB(128, 0, 128)));
process.stdout.write('Back to Normal');
console.log();
console.log();

// Test 11: All attributes combined
console.log('🎪 All Attributes Combined:');
console.log('---------------------------');
console.log(colorText('Bold + Italic + Underline Red', BOLD, ITALIC, UNDERLINE, FG_RED));
console.log(colorText('Dim + Strikethrough Blue', DIM, STRIKETHROUGH, FG_BLUE));
console.log(colorText('Bold + RGB Purple + Yellow BG', BOLD, fgRGB(128, 0, 128), BG_YELLOW));
console.log();

// Test 12: Color transition test
console.log('🌈 Color Transition Test:');
console.log('-------------------------');
const transitionText = 'RAINBOW';
const rainbowColors = [FG_RED, FG_YELLOW, FG_GREEN, FG_CYAN, FG_BLUE, FG_MAGENTA, FG_WHITE];
for (let i = 0; i < transitionText.length; i++) {
  const char = transitionText[i];
  const color = rainbowColors[i % rainbowColors.length];
  process.stdout.write(colorText(char, color));
}
console.log();
console.log();

// Test 13: Background rainbow
console.log('🎨 Background Rainbow:');
console.log('---------------------');
const bgRainbowColors = [BG_RED, BG_YELLOW, BG_GREEN, BG_CYAN, BG_BLUE, BG_MAGENTA, BG_WHITE];
for (let i = 0; i < transitionText.length; i++) {
  const char = transitionText[i];
  const bgColor = bgRainbowColors[i % bgRainbowColors.length];
  const fgColor = (i === 6) ? FG_BLACK : FG_WHITE; // Black text on white background
  process.stdout.write(colorText(char, fgColor, bgColor));
}
console.log();
console.log();

console.log('✅ Color test complete! All colors should be visible above.');
console.log('💡 If colors don\'t appear, your terminal may not support them.');
console.log('🔧 Try running in a modern terminal with full color support.');
console.log();
console.log('📋 Test Summary:');
console.log('- Basic 8 foreground colors (30-37)');
console.log('- Bright 8 foreground colors (90-97)');
console.log('- Basic 8 background colors (40-47)');
console.log('- Bright 8 background colors (100-107)');
console.log('- 256-color palette samples');
console.log('- 24-bit RGB true colors');
console.log('- Text attributes (bold, italic, underline, etc.)');
console.log('- Mixed formatting combinations');
console.log('- Color transitions and effects');
