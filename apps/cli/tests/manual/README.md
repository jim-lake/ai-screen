# Manual Tests

This directory contains manual test scripts for visual inspection and verification of functionality.

## Color Test Script

### `color_test.ts`

A comprehensive visual test of ANSI color support that demonstrates all color modes and text attributes using hardcoded escape sequences. This script has **zero dependencies** and directly outputs ANSI escape sequences to test terminal color support.

#### Features Tested

**Basic Colors (8-color palette)**
- Foreground colors (30-37): Black, Red, Green, Yellow, Blue, Magenta, Cyan, White
- Background colors (40-47): Same colors as backgrounds
- Bright variants (90-97, 100-107): Bright versions of the basic colors

**256-Color Palette**
- Standard colors (0-15): Same as basic + bright colors
- RGB cube colors (16-231): 6×6×6 color cube
- Grayscale colors (232-255): 24 shades of gray

**24-bit RGB Colors**
- True color support with full RGB values
- Both foreground and background RGB colors
- Automatic contrast adjustment for readability

**Text Attributes**
- Bold, Italic, Dim, Underline, Strikethrough, Blink, Inverse, Overline
- Combined with colors to show proper formatting

**Mixed Formatting**
- Demonstrates transitions between different color modes
- Shows complex formatting combinations
- Tests color transitions and effects

#### Usage

Run the color test script:

```bash
# Using npm script (recommended)
npm run test:colors

# Or directly with tsx
tsx tests/manual/color_test.ts

# Or make executable and run directly
chmod +x tests/manual/color_test.ts
./tests/manual/color_test.ts
```

#### Expected Output

The script will output a comprehensive color test showing:

1. **📝 Basic Foreground Colors** - Standard 8 colors with labels
2. **✨ Bright Foreground Colors** - Bright variants of the 8 colors
3. **🎯 Basic Background Colors** - Standard 8 background colors
4. **🌟 Bright Background Colors** - Bright background variants
5. **🌈 256-Color Palette Sample** - Sampling of the full 256-color palette
6. **🎨 256-Color Background Sample** - Background colors from the palette
7. **🌈 RGB (24-bit) Color Sample** - True color examples
8. **🎯 RGB Background Sample** - True color backgrounds
9. **🎭 Text Attributes** - Bold, italic, underline, etc. with colors
10. **🎪 Mixed Formatting** - Complex combinations of formatting
11. **🎪 All Attributes Combined** - Multiple attributes together
12. **🌈 Color Transition Test** - Rainbow text effect
13. **🎨 Background Rainbow** - Rainbow background effect

#### Terminal Compatibility

- **Full Support**: Modern terminals (iTerm2, Terminal.app, Windows Terminal, etc.)
- **Partial Support**: Older terminals may only show basic 8/16 colors
- **No Support**: Very old terminals may show escape sequences as text

#### Troubleshooting

If colors don't appear correctly:

1. **Check terminal support**: Ensure your terminal supports ANSI colors
2. **Try different terminal**: Use a modern terminal emulator
3. **Check environment**: Some environments may strip color codes
4. **Verify output**: The script should show colored text, not escape sequences

#### Technical Details

The script uses hardcoded ANSI escape sequences to test terminal color support:

- **Basic colors**: `\x1b[30-37m` (foreground), `\x1b[40-47m` (background)
- **Bright colors**: `\x1b[90-97m` (foreground), `\x1b[100-107m` (background)
- **256-color palette**: `\x1b[38;5;Nm` (foreground), `\x1b[48;5;Nm` (background)
- **RGB colors**: `\x1b[38;2;R;G;Bm` (foreground), `\x1b[48;2;R;G;Bm` (background)
- **Text attributes**: `\x1b[1m` (bold), `\x1b[3m` (italic), `\x1b[4m` (underline), etc.
- **Reset**: `\x1b[0m` (reset all formatting)

This provides a comprehensive visual verification of terminal color support and can be used to:

- Test terminal compatibility
- Verify ANSI escape sequence generation
- Debug color rendering issues
- Demonstrate the full range of terminal colors
- Validate the `lineToString()` function output by comparison

#### Zero Dependencies

This script is completely self-contained with no external dependencies. It only uses:
- TypeScript/JavaScript built-in functions
- Node.js `process.stdout.write()` and `console.log()`
- Hardcoded ANSI escape sequences

This makes it perfect for testing in any environment without worrying about dependency conflicts or installation issues.
