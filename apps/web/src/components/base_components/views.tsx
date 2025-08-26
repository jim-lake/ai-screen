import React from 'react';
import { resolveStyle, StyleSheet } from './styles';
import type { StyleInput } from './styles';

interface ViewProps {
  style?: StyleInput;
  children?: React.ReactNode;
  className?: string;
  pointerEvents?: string;
  getDiv?: React.RefObject<HTMLDivElement | null>;
  [key: string]: unknown;
}

interface ScrollViewProps extends ViewProps {
  contentContainerStyle?: StyleInput;
  horizontal?: boolean;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
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
  const extra_props = getDiv ? { ref: getDiv } : {};
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
  ...other_props
}: ScrollViewProps) {
  const base_style = horizontal
    ? styles.scrollerStyleHorizontal
    : styles.scrollerStyle;

  return (
    <View style={[base_style, style]} {...other_props}>
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
