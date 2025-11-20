
'use client';

import { icons } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { useMemo } from 'react';

interface DynamicIconProps extends Omit<LucideProps, 'name'> {
  name: string;
}

export const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const LucideIcon = useMemo(() => {
    const iconKey = name as keyof typeof icons;
    if (icons[iconKey]) {
      return icons[iconKey];
    }
    // Return a default icon if the name is not found
    return icons['Smile']; 
  }, [name]);


  return <LucideIcon {...