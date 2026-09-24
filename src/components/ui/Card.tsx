import React from 'react';
import styles from './ui.module.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  hoverable?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  elevated = false,
  hoverable = false,
  className = '',
  children,
  ...props
}) => {
  const classNames = [
    styles.card,
    elevated ? styles.elevated : '',
    hoverable ? styles.hoverable : '',
    props.onClick ? styles.interactive : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
};
