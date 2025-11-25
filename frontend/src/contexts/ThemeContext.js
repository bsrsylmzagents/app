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
  // Theme can be 'dynamic' or null (default - uses contrast system)
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or user preferences
    const saved = localStorage.getItem('app-theme');
    if (saved === 'dynamic') {
      return 'dynamic';
    }
    // Try to get from user preferences
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const userTheme = user?.preferences?.theme;
        if (userTheme === 'dynamic') {
          return 'dynamic';
        }
      }
    } catch (error) {
      console.error('Error reading user preferences:', error);
    }
    return null; // Default - use contrast system
  });

  // Always dark mode - no theme toggle
  const [contrast, setContrast] = useState(() => {
    // Only use contrast if theme is not 'dynamic'
    if (theme === 'dynamic') return null;
    
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
    
    if (theme === 'dynamic') {
      // Dynamic theme - set data-theme to 'dynamic'
      document.documentElement.setAttribute('data-theme', 'dynamic');
      document.documentElement.removeAttribute('data-contrast');
    } else {
      // Default theme - use contrast system
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.setAttribute('data-contrast', contrast || 'classic');
    }
    
    localStorage.setItem('app-theme', theme || '');
    if (contrast) {
      localStorage.setItem('app-contrast', contrast);
    }
  }, [theme, contrast]);
  
  // Initialize on mount
  useEffect(() => {
    // Ensure dark mode is set immediately
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    
    if (theme === 'dynamic') {
      document.documentElement.setAttribute('data-theme', 'dynamic');
      document.documentElement.removeAttribute('data-contrast');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.setAttribute('data-contrast', contrast || 'classic');
    }
  }, []);

  const setContrastLevel = (level) => {
    if (['classic', 'soft', 'medium', 'high'].includes(level)) {
      setContrast(level);
      setTheme(null); // Clear dynamic theme when setting contrast
      // Also update user preferences if available
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const updatedUser = {
            ...user,
            preferences: {
              ...user.preferences,
              darkContrast: level,
              theme: null
            }
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } catch (error) {
        console.error('Error updating user preferences:', error);
      }
    }
  };

  const setThemeMode = (newTheme) => {
    if (newTheme === 'dynamic') {
      setTheme('dynamic');
      // Also update user preferences if available
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const updatedUser = {
            ...user,
            preferences: {
              ...user.preferences,
              theme: 'dynamic'
            }
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } catch (error) {
        console.error('Error updating user preferences:', error);
      }
    } else {
      setTheme(null);
    }
  };

  return (
    <ThemeContext.Provider value={{ contrast, setContrastLevel, theme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
