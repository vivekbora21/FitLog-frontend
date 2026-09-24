import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'emerald' | 'cyan' | 'violet' | 'amber' | 'rose' | 'slate';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'emerald',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const sizeClass = size === 'sm' ? 'badge-sm' : '';
  return (
    <span className={`badge badge-${variant} ${sizeClass} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
};
