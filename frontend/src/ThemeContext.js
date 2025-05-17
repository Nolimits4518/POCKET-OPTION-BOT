import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the theme options
export const THEMES = {
  DEFAULT: 'default',
  GREEN_GOBLIN: 'green-goblin',
  FUTURISTIC: 'futuristic',
  CYBERPUNK: 'cyberpunk',
  JARVIS: 'jarvis'
};

// Create the theme context
const ThemeContext = createContext();

// Theme provider component
export const ThemeProvider = ({ children }) => {
  // Get theme from localStorage or use default
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || THEMES.DEFAULT;
  });

  // Update the theme in localStorage when it changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
    
    // Add theme classes to document body
    document.body.className = '';
    document.body.classList.add(`theme-${theme}`);
    
    // Load the appropriate Google Fonts based on theme
    let fontLink = document.getElementById('theme-fonts');
    if (!fontLink) {
      fontLink = document.createElement('link');
      fontLink.id = 'theme-fonts';
      fontLink.rel = 'stylesheet';
      document.head.appendChild(fontLink);
    }
    
    // Set the appropriate Google Fonts URL based on the theme
    switch (theme) {
      case THEMES.GREEN_GOBLIN:
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Roboto+Condensed:wght@300;400;700&display=swap';
        break;
      case THEMES.FUTURISTIC:
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700&family=Inter:wght@300;400;500;600&display=swap';
        break;
      case THEMES.CYBERPUNK:
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;400;600;700&family=Share+Tech+Mono&display=swap';
        break;
      case THEMES.JARVIS:
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Titillium+Web:wght@300;400;600&display=swap';
        break;
      default:
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
    }
    
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
