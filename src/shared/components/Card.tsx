import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'warning' | 'danger';
}

/**
 * Glassmorphism-styled card component
 * Supports different variants for status indication
 */
export function Card({ 
  children, 
  className = '', 
  variant = 'default' 
}: CardProps): React.JSX.Element {
  const baseStyles = 'backdrop-blur-sm border rounded-xl p-5 transition-all duration-300';
  
  const variantStyles = {
    default: 'bg-white/5 border-white/10',
    warning: 'bg-yellow-400/10 border-yellow-400/30',
    danger: 'bg-red-500/15 border-red-500/40 animate-pulse-danger',
  };
  
  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  );
}
