import React, { useState } from 'react';
import { Gender } from '../models/genealogy';
import { getInitials } from '../utils/dateUtils';
import { embeddedMediaSource } from '../utils/embeddedMedia';

interface HeritageAvatarProps {
  fullName: string;
  portraitUrl?: string;
  gender?: Gender;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isLiving?: boolean;
}

const sizeClasses = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-24 h-24 text-xl',
};

export const HeritageAvatar: React.FC<HeritageAvatarProps> = ({
  fullName,
  portraitUrl,
  gender = 'unknown',
  size = 'md',
  className = '',
  isLiving,
}) => {
  const [failedSource, setFailedSource] = useState<string>();
  const initials = getInitials(fullName);

  // Vietnamese heritage palette:
  // Male: Jade/Forest green hues
  // Female: Warm terracotta / lotus amber
  // Unknown: Antique bronze
  const genderColors = {
    male: 'bg-[#EBF2EE] text-[#1B3B2B] border-[#2D5A43]/40',
    female: 'bg-[#FDF4EB] text-[#8C3A27] border-[#B75338]/40',
    unknown: 'bg-[#F4EFE6] text-[#655A4E] border-[#A89F91]/40',
  };

  const source = embeddedMediaSource(portraitUrl, 'image');

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full border-2 overflow-hidden shadow-xs select-none ${
        sizeClasses[size]
      } ${genderColors[gender]} ${className}`}
      title={fullName}
    >
      {source && source !== failedSource ? (
        <img
          src={source}
          alt={fullName}
          onError={() => setFailedSource(source)}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="font-serif font-semibold tracking-wider">{initials}</span>
      )}

      {/* Living indicator pip */}
      {isLiving !== undefined && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-[#FAF7F2] ${
            size === 'xl'
              ? 'w-4 h-4'
              : size === 'lg'
              ? 'w-3 h-3'
              : size === 'md'
              ? 'w-2.5 h-2.5'
              : 'w-2 h-2'
          } ${isLiving ? 'bg-emerald-600' : 'bg-stone-400'}`}
          title={isLiving ? 'Hiện tiền (còn sống)' : 'Đã tạ thế'}
        />
      )}
    </div>
  );
};
