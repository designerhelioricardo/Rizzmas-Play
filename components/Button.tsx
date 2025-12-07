
import React from 'react';
import { audioService } from '../services/audioService';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  onClick,
  ...props 
}) => {
  const baseStyles = "font-arcade text-xs sm:text-sm px-6 py-3 uppercase transition-transform active:scale-95 border-b-4 border-r-4 relative";
  
  const variants = {
    primary: "bg-rizz-green border-green-800 text-black hover:bg-green-400",
    secondary: "bg-rizz-gold border-yellow-700 text-black hover:bg-yellow-300",
    danger: "bg-rizz-red border-red-900 text-white hover:bg-red-500"
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isLoading) {
      audioService.playSFX('click');
      if (onClick) onClick(e);
    }
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
      disabled={isLoading}
      onClick={handleClick}
      {...props}
    >
      {isLoading ? "Loading..." : children}
    </button>
  );
};
