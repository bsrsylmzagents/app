import { format, parse } from 'date-fns';

/**
 * Format mapping for user preferences to date-fns format strings
 */
const FORMAT_MAP = {
  'DD/MM/YYYY': 'dd/MM/yyyy',
  'DD.MM.YYYY': 'dd.MM.yyyy',
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'YYYY-MM-DD': 'yyyy-MM-dd'
};

/**
 * Get user's preferred date format from localStorage
 * @returns {string} - User's preferred date format (default: 'DD/MM/YYYY')
 */
const getUserDateFormat = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return 'DD/MM/YYYY';
    
    const user = JSON.parse(userStr);
    return user?.preferences?.dateFormat || 'DD/MM/YYYY';
  } catch (error) {
    console.error('Error reading user preferences:', error);
    return 'DD/MM/YYYY';
  }
};

/**
 * Format a date string according to user's preferred format
 * @param {string} dateString - Date string (ISO format or YYYY-MM-DD)
 * @param {string} userFormat - Optional: Override user format (default: from localStorage)
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateString, userFormat = null) => {
  if (!dateString) return '-';
  
  try {
    // Get format from parameter or user preferences
    const formatPreference = userFormat || getUserDateFormat();
    const dateFnsFormat = FORMAT_MAP[formatPreference] || FORMAT_MAP['DD/MM/YYYY'];
    
    // Try to parse the date string
    let date;
    
    // Try ISO format first
    if (dateString.includes('T') || dateString.includes('Z')) {
      date = new Date(dateString);
    } else {
      // Try YYYY-MM-DD format
      date = parse(dateString, 'yyyy-MM-dd', new Date());
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid
    }
    
    // Format according to user preference
    return format(date, dateFnsFormat);
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString; // Return original on error
  }
};

/**
 * YYYY-MM-DD formatındaki tarih string'ini DD.MM.YYYY formatına çevirir
 * @deprecated Use formatDate() instead for user preference support
 * @param {string} dateString - YYYY-MM-DD formatında tarih string'i
 * @returns {string} - DD.MM.YYYY formatında tarih string'i
 */
export const formatDateStringDDMMYYYY = (dateString) => {
  if (!dateString) return '-';
  
  try {
    // YYYY-MM-DD formatını parse et
    const date = parse(dateString, 'yyyy-MM-dd', new Date());
    
    // Geçerli bir tarih mi kontrol et
    if (isNaN(date.getTime())) {
      return dateString; // Geçersizse orijinal string'i döndür
    }
    
    // DD.MM.YYYY formatına çevir
    return format(date, 'dd.MM.yyyy');
  } catch (error) {
    console.error('Tarih formatlama hatası:', error);
    return dateString; // Hata durumunda orijinal string'i döndür
  }
};
