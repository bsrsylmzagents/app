/**
 * Get table density classes based on user preference
 * @returns {Object} Object with padding classes for different table elements
 */
export const getTableDensityClasses = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const density = user?.preferences?.tableDensity || 'comfortable';
      
      if (density === 'compact') {
        return {
          cell: 'px-2 py-2',  // Compact padding
          header: 'px-2 py-2',
          row: 'py-1'
        };
      } else {
        // comfortable (default)
        return {
          cell: 'px-6 py-4',  // Comfortable padding
          header: 'px-6 py-4',
          row: 'py-2'
        };
      }
    }
  } catch (error) {
    console.error('Error reading table density preference:', error);
  }
  
  // Default to comfortable
  return {
    cell: 'px-6 py-4',
    header: 'px-6 py-4',
    row: 'py-2'
  };
};

/**
 * Get table density preference value
 * @returns {string} 'comfortable' or 'compact'
 */
export const getTableDensity = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?.preferences?.tableDensity || 'comfortable';
    }
  } catch (error) {
    console.error('Error reading table density preference:', error);
  }
  return 'comfortable';
};




