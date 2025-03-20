import React from 'react';

interface AnonymousAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const AnonymousAvatar: React.FC<AnonymousAvatarProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  // מיפוי גדלים
  const sizeMap = {
    'xs': 24,
    'sm': 36,
    'md': 48,
    'lg': 64
  };
  
  const avatarSize = sizeMap[size];
  
  // צבעים קבועים ירוקים - לא תלויים במשתני CSS
  const lightGreen = '#e8f5e9';  // צבע ירוק בהיר
  const darkGreen = '#2e7d32';   // צבע ירוק כהה
  
  return (
    <div
      className={`anonymous-avatar ${className}`}
      style={{
        width: `${avatarSize}px`,
        height: `${avatarSize}px`,
        background: `linear-gradient(135deg, ${lightGreen}, ${darkGreen})`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <svg
        width={avatarSize * 0.6}
        height={avatarSize * 0.6}
        viewBox="0 0 24 24"
        fill="white"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
};

export default AnonymousAvatar; 