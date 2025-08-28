import { StyleSheet, View, Text } from './base_components';
import { useXTermReactRenderer } from './xterm_renderer_callbacks';

interface XTermReactRendererProps {
  sessionName: string;
  dimensions: {
    cellWidth: number;
    cellHeight: number;
    cols: number;
    rows: number;
  };
}

const styles = StyleSheet.create({
  overlay: {
    position: 'relative',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    pointerEvents: 'none',
    zIndex: 10,
  },
  rows: {
    position: 'relative',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    whiteSpace: 'pre',
    overflow: 'hidden',
  },
  row: { whiteSpace: 'pre', overflow: 'hidden', position: 'relative' },
  cursor: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    color: '#000000',
    zIndex: 1,
    pointerEvents: 'none',
    animation: 'xterm-cursor-blink 1s infinite',
  },
  selection: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    pointerEvents: 'none',
    zIndex: 5,
  },
  columnSelection: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 0, 0.3)',
    pointerEvents: 'none',
    zIndex: 5,
  },
});

export default function XTermReactRenderer({
  sessionName,
  dimensions,
}: XTermReactRendererProps) {
  const { lines, cursor, selection, focused } =
    useXTermReactRenderer(sessionName);

  const containerWidth = dimensions.cols * dimensions.cellWidth;
  const containerHeight = dimensions.rows * dimensions.cellHeight;

  // Render terminal lines
  const renderLines = () => {
    const elements = [];
    for (let i = 0; i < dimensions.rows; i++) {
      const line = lines.find((l) => l.y === i);
      const content = line?.content ?? '';
      elements.push(
        <Text
          key={i}
          className='xterm-custom-row'
          style={[styles.row, { height: dimensions.cellHeight }]}
        >
          {content}
        </Text>
      );
    }
    return elements;
  };

  // Render cursor
  const renderCursor = () => {
    if (!cursor.visible) {
      return null;
    }

    return (
      <View
        key='cursor'
        className='xterm-custom-cursor'
        style={[
          styles.cursor,
          {
            left: cursor.x * dimensions.cellWidth,
            top: cursor.y * dimensions.cellHeight,
            width: dimensions.cellWidth,
            height: dimensions.cellHeight,
            opacity: focused ? 1 : 0.5,
          },
        ]}
      />
    );
  };

  // Render selection
  const renderSelection = () => {
    if (!selection.start || !selection.end) {
      return null;
    }

    const [startCol, startRow] = selection.start;
    const [endCol, endRow] = selection.end;
    const elements = [];

    for (let row = startRow; row <= endRow; row++) {
      elements.push(
        <View
          key={`selection-${row}`}
          className={
            selection.columnMode
              ? 'xterm-custom-column-selection'
              : 'xterm-custom-selection'
          }
          style={[
            selection.columnMode ? styles.columnSelection : styles.selection,
            {
              top: row * dimensions.cellHeight,
              left: startCol * dimensions.cellWidth,
              width: (endCol - startCol + 1) * dimensions.cellWidth,
              height: dimensions.cellHeight,
            },
          ]}
        />
      );
    }

    return elements;
  };

  return (
    <View
      className='xterm-custom-overlay'
      style={[
        styles.overlay,
        { width: containerWidth, height: containerHeight },
      ]}
    >
      <View className='xterm-custom-rows' style={styles.rows}>
        {renderLines()}
      </View>
      {renderSelection()}
      {renderCursor()}
    </View>
  );
}
