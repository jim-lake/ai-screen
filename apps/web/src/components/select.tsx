import React from 'react';
import { resolveStyle } from './base_components/styles';
import type { StyleInput } from './base_components';

interface SelectOption {
  value: string | number;
  text: string;
}

export interface Props {
  style?: StyleInput;
  value: string;
  options: (string | SelectOption)[];
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
  children?: React.ReactNode;
}
export default function Select(props: Props) {
  const {
    style,
    value,
    options,
    placeholder,
    className: extraClass,
    onChange,
    children,
    ...other_props
  } = props;
  function _onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange(e.target.value);
  }

  const opts = options.map(_mapOpt);
  if (placeholder && !value) {
    const def = (
      <option key='default' disabled hidden value=''>
        {placeholder}
      </option>
    );
    opts.unshift(def);
  }

  const { className, inlineStyle } = resolveStyle(style, extraClass);
  return (
    <select
      className={'base-component-text-input ' + className}
      style={inlineStyle}
      {...other_props}
      value={value}
      onChange={_onChange}
    >
      {opts}
      {children}
    </select>
  );
}
function _mapOpt(opt: string | SelectOption, i: number) {
  let ret;
  if (typeof opt === 'string') {
    ret = (
      <option key={i} value={opt}>
        {opt}
      </option>
    );
  } else {
    ret = (
      <option key={i} value={String(opt.value)}>
        {opt.text}
      </option>
    );
  }
  return ret;
}
