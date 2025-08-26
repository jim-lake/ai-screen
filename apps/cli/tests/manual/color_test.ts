#!/usr/bin/env tsx
/* eslint-disable no-console */

console.log(`
🎨 ANSI Color Test Suite
========================

📝 Basic Foreground Colors (30-37):
-----------------------------------
[30mBlack (30)[0m
[31mRed (31)[0m
[32mGreen (32)[0m
[33mYellow (33)[0m
[34mBlue (34)[0m
[35mMagenta (35)[0m
[36mCyan (36)[0m
[37mWhite (37)[0m

✨ Bright Foreground Colors (90-97):
------------------------------------
[90mBright Black (90)[0m
[91mBright Red (91)[0m
[92mBright Green (92)[0m
[93mBright Yellow (93)[0m
[94mBright Blue (94)[0m
[95mBright Magenta (95)[0m
[96mBright Cyan (96)[0m
[97mBright White (97)[0m

🎯 Basic Background Colors (40-47):
-----------------------------------
[37m[40mBlack BG (40)[0m
[30m[41mRed BG (41)[0m
[30m[42mGreen BG (42)[0m
[30m[43mYellow BG (43)[0m
[37m[44mBlue BG (44)[0m
[30m[45mMagenta BG (45)[0m
[30m[46mCyan BG (46)[0m
[30m[47mWhite BG (47)[0m

🌟 Bright Background Colors (100-107):
--------------------------------------
[30m[100mBright Black BG (100)[0m
[30m[101mBright Red BG (101)[0m
[30m[102mBright Green BG (102)[0m
[30m[103mBright Yellow BG (103)[0m
[30m[104mBright Blue BG (104)[0m
[30m[105mBright Magenta BG (105)[0m
[30m[106mBright Cyan BG (106)[0m
[30m[107mBright White BG (107)[0m

🌈 256-Color Palette Sample (Foreground):
-----------------------------------------
Standard colors (0-15):
[38;5;0mColor   0[0m  [38;5;1mColor   1[0m  [38;5;2mColor   2[0m  [38;5;3mColor   3[0m  [38;5;4mColor   4[0m  [38;5;5mColor   5[0m  [38;5;6mColor   6[0m  [38;5;7mColor   7[0m
[38;5;8mColor   8[0m  [38;5;9mColor   9[0m  [38;5;10mColor  10[0m  [38;5;11mColor  11[0m  [38;5;12mColor  12[0m  [38;5;13mColor  13[0m  [38;5;14mColor  14[0m  [38;5;15mColor  15[0m

216 RGB colors (16-231) - Sample every 6th color:
[38;5;16m 16[0m [38;5;22m 22[0m [38;5;28m 28[0m [38;5;34m 34[0m [38;5;40m 40[0m [38;5;46m 46[0m
[38;5;52m 52[0m [38;5;58m 58[0m [38;5;64m 64[0m [38;5;70m 70[0m [38;5;76m 76[0m [38;5;82m 82[0m
[38;5;88m 88[0m [38;5;94m 94[0m [38;5;100m100[0m [38;5;106m106[0m [38;5;112m112[0m [38;5;118m118[0m
[38;5;124m124[0m [38;5;130m130[0m [38;5;136m136[0m [38;5;142m142[0m [38;5;148m148[0m [38;5;154m154[0m
[38;5;160m160[0m [38;5;166m166[0m [38;5;172m172[0m [38;5;178m178[0m [38;5;184m184[0m [38;5;190m190[0m
[38;5;196m196[0m [38;5;202m202[0m [38;5;208m208[0m [38;5;214m214[0m [38;5;220m220[0m [38;5;226m226[0m

Grayscale colors (232-255):
[38;5;232m232[0m [38;5;233m233[0m [38;5;234m234[0m [38;5;235m235[0m [38;5;236m236[0m [38;5;237m237[0m [38;5;238m238[0m [38;5;239m239[0m [38;5;240m240[0m [38;5;241m241[0m [38;5;242m242[0m [38;5;243m243[0m
[38;5;244m244[0m [38;5;245m245[0m [38;5;246m246[0m [38;5;247m247[0m [38;5;248m248[0m [38;5;249m249[0m [38;5;250m250[0m [38;5;251m251[0m [38;5;252m252[0m [38;5;253m253[0m [38;5;254m254[0m [38;5;255m255[0m

🎨 256-Color Palette Sample (Background):
-----------------------------------------
Standard colors (0-15) backgrounds:
[37m[48;5;0mBG 0[0m [37m[48;5;1mBG 1[0m [37m[48;5;2mBG 2[0m [30m[48;5;3mBG 3[0m [37m[48;5;4mBG 4[0m [37m[48;5;5mBG 5[0m [30m[48;5;6mBG 6[0m [37m[48;5;7mBG 7[0m
[30m[48;5;8mBG 8[0m [30m[48;5;9mBG 9[0m [30m[48;5;10mBG10[0m [30m[48;5;11mBG11[0m [30m[48;5;12mBG12[0m [30m[48;5;13mBG13[0m [30m[48;5;14mBG14[0m [30m[48;5;15mBG15[0m

RGB colors backgrounds - Sample every 12th color:
[30m[48;5;16m 16[0m [30m[48;5;28m 28[0m [30m[48;5;40m 40[0m [30m[48;5;52m 52[0m [30m[48;5;64m 64[0m [30m[48;5;76m 76[0m [30m[48;5;88m 88[0m [30m[48;5;100m100[0m [30m[48;5;112m112[0m [30m[48;5;124m124[0m [30m[48;5;136m136[0m [30m[48;5;148m148[0m [30m[48;5;160m160[0m [30m[48;5;172m172[0m [30m[48;5;184m184[0m [30m[48;5;196m196[0m [30m[48;5;208m208[0m [30m[48;5;220m220[0m
🌈 RGB (24-bit) Color Sample:
-----------------------------
[38;2;255;0;0mPure Red RGB(255,0,0)[0m
[38;2;0;255;0mPure Green RGB(0,255,0)[0m
[38;2;0;0;255mPure Blue RGB(0,0,255)[0m
[38;2;255;255;0mYellow RGB(255,255,0)[0m
[38;2;255;0;255mMagenta RGB(255,0,255)[0m
[38;2;0;255;255mCyan RGB(0,255,255)[0m
[38;2;255;165;0mOrange RGB(255,165,0)[0m
[38;2;128;0;128mPurple RGB(128,0,128)[0m
[38;2;255;192;203mPink RGB(255,192,203)[0m
[38;2;50;205;50mLime RGB(50,205,50)[0m

🎯 RGB (24-bit) Background Sample:
----------------------------------
[37m[48;2;255;0;0mPure Red BG[0m
[30m[48;2;0;255;0mPure Green BG[0m
[37m[48;2;0;0;255mPure Blue BG[0m
[30m[48;2;255;255;0mYellow BG[0m
[37m[48;2;255;0;255mMagenta BG[0m
[30m[48;2;0;255;255mCyan BG[0m
[30m[48;2;255;165;0mOrange BG[0m
[37m[48;2;128;0;128mPurple BG[0m
[30m[48;2;255;192;203mPink BG[0m
[30m[48;2;50;205;50mLime BG[0m

🎭 Text Attributes with Colors:
-------------------------------
[1m[31mBold Red[0m
[3m[32mItalic Green[0m
[4m[34mUnderline Blue[0m
[2m[33mDim Yellow[0m
[9m[35mStrikethrough Magenta[0m
[5m[36mBlink Cyan[0m
[7m[37mInverse White[0m
[53m[31mOverline Red[0m

🎪 Mixed Formatting Demonstration:
----------------------------------
Normal [1m[31mBold Red [0m[3m[34mItalic Blue [0m[30m[43mYellow BG [0m[38;2;128;0;128mRGB Purple [0mBack to Normal

🎪 All Attributes Combined:
---------------------------
[1m[3m[4m[31mBold + Italic + Underline Red[0m
[2m[9m[34mDim + Strikethrough Blue[0m
[1m[38;2;128;0;128m[43mBold + RGB Purple + Yellow BG[0m

🌈 Color Transition Test:
-------------------------
[31mR[0m[33mA[0m[32mI[0m[36mN[0m[34mB[0m[35mO[0m[37mW[0m

🎨 Background Rainbow:
---------------------
[37m[41mR[0m[37m[43mA[0m[37m[42mI[0m[37m[46mN[0m[37m[44mB[0m[37m[45mO[0m[30m[47mW[0m

✅ Color test complete! All colors should be visible above.
💡 If colors don't appear, your terminal may not support them.
🔧 Try running in a modern terminal with full color support.

📋 Test Summary:
- Basic 8 foreground colors (30-37)
- Bright 8 foreground colors (90-97)
- Basic 8 background colors (40-47)
- Bright 8 background colors (100-107)
- 256-color palette samples
- 24-bit RGB true colors
- Text attributes (bold, italic, underline, etc.)
- Mixed formatting combinations
- Color transitions and effects
`);
