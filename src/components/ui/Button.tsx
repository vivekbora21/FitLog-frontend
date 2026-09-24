import React from 'react';
import styles from './ui.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  const classNames = [
    styles.btn,
    styles[variant],
    size !== 'md' ? styles[size] : '',
    iconOnly ? styles.iconOnly : '',
    fullWidth ? styles.fullWidth : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classNames} {...props}>
      {children}
    </button>
  );
};
