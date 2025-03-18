// Use the correct import pattern for date-fns
import { format as formatDate } from 'date-fns';
// @ts-ignore - Fix TypeScript error with date-fns import
import { formatDistanceToNow } from 'date-fns';
// @ts-ignore - Fix TypeScript error with date-fns locale
import { he } from 'date-fns/locale';

// Format date as relative time (e.g., "2 days ago")
export const formatRelativeTime = (date: string | Date | undefined | null): string => {
  if (!date) {
    return '';
  }
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: he });
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return formatFullDate(date); // Fallback to full date format
  }
};

// Format full date (e.g., "15 ינואר 2023")
export const formatFullDate = (date: string | Date | undefined | null): string => {
  if (!date) {
    return '';
  }
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    // @ts-ignore - TypeScript doesn't recognize the locale parameter correctly
    return formatDate(dateObj, 'dd MMMM yyyy', { locale: he });
  } catch (error) {
    console.error('Error formatting full date:', error);
    
    // Last resort fallback
    if (typeof date === 'string') {
      return date;
    }
    
    try {
      // Ensure it's a valid Date object before calling toLocaleDateString
      if (date instanceof Date) {
        return date.toLocaleDateString('he-IL');
      }
      return '';
    } catch {
      return '';
    }
  }
};

// Format short date (e.g., "15/01/2023")
export const formatShortDate = (date: string | Date | undefined | null): string => {
  if (!date) {
    return '';
  }
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDate(dateObj, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting short date:', error);
    
    // Last resort fallback
    if (typeof date === 'string') {
      return date;
    }
    
    try {
      // Ensure it's a valid Date object before calling toLocaleDateString
      if (date instanceof Date) {
        return date.toLocaleDateString('he-IL');
      }
      return '';
    } catch {
      return '';
    }
  }
}; 