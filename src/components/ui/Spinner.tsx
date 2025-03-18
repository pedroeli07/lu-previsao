import React from 'react';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'medium',
  color = '#5056E5',
  className = ''
}) => {
  // Mapear tamanhos para valores em pixels
  const sizeMap = {
    small: '24px',
    medium: '32px',
    large: '48px'
  };

  const spinnerSize = sizeMap[size];

  return (
    <div 
      className={`inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent ${className}`}
      style={{ 
        width: spinnerSize, 
        height: spinnerSize,
        borderColor: `${color} transparent ${color} transparent`
      }}
      role="status"
    >
      <span className="sr-only">Carregando...</span>
    </div>
  );
};

export default Spinner; 