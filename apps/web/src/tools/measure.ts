export default { measureCharSize };

export interface Size {
  width: number;
  height: number;
}

const g_charSizeMap = new Map<string, Size>();

export interface MeasureCharSizeParams {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight?: string;
}
export function measureCharSize(params: MeasureCharSizeParams): Size {
  const { fontFamily, fontSize, lineHeight, fontWeight = 'normal' } = params;
  const key = `${fontFamily}-${fontSize}-${lineHeight}-${fontWeight}`;
  let ret = g_charSizeMap.get(key);
  if (!ret) {
    try {
      const canvas = new OffscreenCanvas(100, 100);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = `${fontSize}px ${fontFamily}`;
        const metrics = ctx.measureText('W');
        if (
          'fontBoundingBoxAscent' in metrics &&
          'fontBoundingBoxDescent' in metrics
        ) {
          const { width } = metrics;
          const height = Math.ceil(
            (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent) *
              lineHeight
          );
          ret = { width, height };
        }
      }
    } catch {
      // ignore
    }

    if (!ret) {
      const REPEAT = 100;
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-1000px';
      container.style.left = '-1000px';
      container.style.visibility = 'hidden';
      container.style.whiteSpace = 'nowrap';

      const span = document.createElement('span');
      span.textContent = 'W'.repeat(REPEAT);
      span.style.fontFamily = fontFamily;
      span.style.fontSize = `${fontSize}px`;
      container.appendChild(span);

      document.body.appendChild(container);
      const width = span.offsetWidth / REPEAT;
      const height = Math.ceil(span.offsetHeight * lineHeight);
      document.body.removeChild(container);

      ret = { width, height };
    }
    g_charSizeMap.set(key, ret);
  }
  return ret;
}
