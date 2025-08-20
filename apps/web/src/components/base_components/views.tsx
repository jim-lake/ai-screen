import React from 'react';
import { resolveStyle, StyleSheet } from './styles';
import type { StyleInput } from './styles';

interface ViewProps {
  style?: StyleInput;
  children?: React.ReactNode;
  className?: string;
  pointerEvents?: string;
  getDiv?: (ref: HTMLDivElement | null) => void;
  [key: string]: unknown;
}

interface ScrollViewProps extends ViewProps {
  contentContainerStyle?: StyleInput;
  horizontal?: boolean;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  ref?: ScrollViewHandle;
}

interface ScrollViewHandle {
  addScrollTop: (delta: number | string) => void;
  setScrollTop: (value: number | string) => number | undefined;
}

const styles = StyleSheet.create({
  scrollerStyle: {
    overflowX: 'hidden',
    overflowY: 'scroll',
    overflowScroll: 'contain',
  },
  scrollerStyleHorizontal: {
    overflowX: 'scroll',
    overflowY: 'hidden',
    overflowScroll: 'contain',
  },
  contentContainerStyle: { overflowX: 'auto', overflowY: 'auto' },
  pointerBoxNone: { pointerEvents: 'none' },
});

export function View({
  style,
  children,
  className: extraClass,
  pointerEvents,
  getDiv,
  ...other_props
}: ViewProps) {
  const computedStyle =
    pointerEvents === 'box-none' || pointerEvents === 'none'
      ? [style, styles.pointerBoxNone]
      : style;

  const { inlineStyle, className } = resolveStyle(computedStyle, extraClass);

  const extra_props = { ref: getDiv };
  if (!getDiv) {
    delete extra_props.ref;
  }

  return (
    <div
      className={className}
      style={inlineStyle}
      {...other_props}
      {...extra_props}
    >
      {children}
    </div>
  );
}
export function ScrollView({
  style,
  contentContainerStyle,
  horizontal,
  children,
  onScroll,
  ref,
  ...other_props
}: ScrollViewProps) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // Set up ref for exposed methods
  React.useEffect(() => {
    if (ref) {
      ref.addScrollTop = (delta: number | string) => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop += Number(delta);
        }
      };

      ref.setScrollTop = (value: number | string) => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = Number(value);
        }
        return scrollRef.current?.scrollTop;
      };
    }
  }, [ref]);

  const onScrollRef = React.useCallback((new_ref: HTMLDivElement | null) => {
    scrollRef.current = new_ref;
  }, []);

  const base_style = horizontal
    ? styles.scrollerStyleHorizontal
    : styles.scrollerStyle;

  return (
    <View getDiv={onScrollRef} style={[base_style, style]} {...other_props}>
      <div
        style={{
          ...resolveStyle([styles.contentContainerStyle, contentContainerStyle])
            .inlineStyle,
        }}
        className={
          resolveStyle([styles.contentContainerStyle, contentContainerStyle])
            .className
        }
        onScroll={onScroll}
      >
        {children}
      </div>
    </View>
  );
}
