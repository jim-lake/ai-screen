function displayStateToAnsi(state) {
    const codes = [];
    if (state.altScreen !== undefined) {
        codes.push(state.altScreen ? '\x1b[?1049h' : '\x1b[?1049l');
    }
    if (state.cursor) {
        const { x, y, visible, blinking } = state.cursor;
        if (x !== undefined && y !== undefined) {
            codes.push(`\x1b[${y};${x}H`);
        }
        if (visible !== undefined) {
            codes.push(visible ? '\x1b[?25h' : '\x1b[?25l');
        }
        if (blinking !== undefined) {
            codes.push(blinking ? '\x1b[?12h' : '\x1b[?12l');
        }
    }
    return codes.join('');
}

var ansi = /*#__PURE__*/Object.freeze({
    __proto__: null,
    displayStateToAnsi: displayStateToAnsi
});

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function jsonParse(json_obj) {
    try {
        return JSON.parse(json_obj);
    }
    catch {
        return undefined;
    }
}

var json = /*#__PURE__*/Object.freeze({
    __proto__: null,
    jsonParse: jsonParse
});

var index = { ...ansi, ...json };

export { index as default, displayStateToAnsi, jsonParse };
//# sourceMappingURL=index.js.map
