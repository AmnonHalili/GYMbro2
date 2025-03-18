import React from 'react';

interface AnonymousAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AnonymousAvatar: React.FC<AnonymousAvatarProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  // Size mapping
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 80
  };

  const avatarSize = sizeMap[size];
  
  return (
    <div
      className={`anonymous-avatar ${size} ${className}`}
      style={{
        width: `${avatarSize}px`,
        height: `${avatarSize}px`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--primary-light), var(--primary))',
        color: 'white',
        fontSize: `${avatarSize * 0.4}px`,
        fontWeight: 'bold',
      }}
      aria-label="תמונת פרופיל ברירת מחדל"
    >
      <svg width={avatarSize * 0.6} height={avatarSize * 0.6} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
};

export default AnonymousAvatar; 