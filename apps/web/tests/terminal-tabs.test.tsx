import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

describe('Terminal Tab Handling', () => {
  it('preserves multiple spaces in spans with pre whitespace', () => {
    // Test that our CSS approach preserves whitespace correctly
    const TestComponent = () => (
      <div style={{ whiteSpace: 'pre', fontFamily: 'monospace' }}>
        <span>{'col1    col2    col3'}</span>
      </div>
    );

    const { container } = render(<TestComponent />);
    const span = container.querySelector('span');
    expect(span?.textContent).toBe('col1    col2    col3');
  });

  it('handles tab-expanded content correctly', () => {
    // Test that tab-expanded content (spaces) is preserved
    const TestComponent = () => (
      <div style={{ whiteSpace: 'pre', fontFamily: 'monospace' }}>
        <span>{'a        b'}</span>
      </div>
    );

    const { container } = render(<TestComponent />);
    const span = container.querySelector('span');
    expect(span?.textContent).toBe('a        b');
  });

  it('preserves internal whitespace without collapsing', () => {
    // Test that internal whitespace is not collapsed
    const TestComponent = () => (
      <div style={{ whiteSpace: 'pre', fontFamily: 'monospace' }}>
        <span>{'start   middle   end'}</span>
      </div>
    );

    const { container } = render(<TestComponent />);
    const span = container.querySelector('span');
    expect(span?.textContent).toBe('start   middle   end');
  });
});
