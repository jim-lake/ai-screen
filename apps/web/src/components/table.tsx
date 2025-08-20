import React from 'react';
import { resolveStyle } from './base_components/styles';
import type { StyleInput } from './base_components';

export interface TableProps {
  style?: StyleInput;
  className?: string;
  children?: React.ReactNode;
}
export function Table(props: TableProps) {
  const { style, className: extraClass, children, ...other_props } = props;
  const { className, inlineStyle } = resolveStyle(style, extraClass);
  return (
    <table
      className={'base-component-table ' + className}
      style={inlineStyle}
      {...other_props}
    >
      {children}
    </table>
  );
}
export function TableBody(props: TableProps) {
  const { style, className: extraClass, children, ...other_props } = props;
  const { className, inlineStyle } = resolveStyle(style, extraClass);
  return (
    <tbody
      className={'base-component-tbody ' + className}
      style={inlineStyle}
      {...other_props}
    >
      {children}
    </tbody>
  );
}
export function TableRow(props: TableProps) {
  const { style, className: extraClass, children, ...other_props } = props;
  const { className, inlineStyle } = resolveStyle(style, extraClass);
  return (
    <tr
      className={'base-component-table-row ' + className}
      style={inlineStyle}
      {...other_props}
    >
      {children}
    </tr>
  );
}
export function TableCell(props: TableProps) {
  const { style, className: extraClass, children, ...other_props } = props;
  const { className, inlineStyle } = resolveStyle(style, extraClass);
  return (
    <td
      className={'base-component-table-cell ' + className}
      style={inlineStyle}
      {...other_props}
    >
      {children}
    </td>
  );
}
