import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Always dark mode - no theme toggle
  const [contrast, setContrast] = useState(() => {
    // Get contrast from localStorage or user preferences
    const saved = localStorage.getItem('app-contrast');
    if (saved && ['classic', 'soft', 'medium', 'high'].includes(saved)) {
      return saved;
    }
    // Try to get from user preferences
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const userContrast = user?.preferences?.darkContrast;
        if (userContrast && ['classic', 'soft', 'medium', 'high'].includes(userContrast)) {
          return userContrast;
        }
      }
    } catch (error) {
      console.error('Error reading user preferences:', error);
    }
    return 'classic'; // Default to classic (original Slate theme)
  });

  useEffect(() => {
    // Force dark mode always - remove any light mode classes
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    
    // Set contrast level - this controls the shade of dark
    document.documentElement.setAttribute('data-contrast', contrast);
    localStorage.setItem('app-contrast', contrast);
  }, [contrast]);
  
  // Initialize on mount
  useEffect(() => {
    // Ensure dark mode is set immediately
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.setAttribute('data-contrast', contrast);
  }, []);

  const setContrastLevel = (level) => {
    if (['classic', 'soft', 'medium', 'high'].includes(level)) {
      setContrast(level);
      // Also update user preferences if available
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const updatedUser = {
            ...user,
            preferences: {
              ...user.preferences,
              darkContrast: level
            }
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } catch (error) {
        console.error('Error updating user preferences:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ contrast, setContrastLevel }}>
      {children}
    </ThemeContext.Provider>
  );
};
