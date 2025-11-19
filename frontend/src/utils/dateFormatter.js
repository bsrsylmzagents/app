import { format, parse } from 'date-fns';

/**
 * YYYY-MM-DD formatındaki tarih string'ini DD.MM.YYYY formatına çevirir
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
