import React from 'react';
import { useTheme, THEMES } from '../ThemeContext';

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col items-center p-4 border rounded-lg">
      <h3 className="text-lg font-medium mb-3">Select Theme</h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setTheme(THEMES.DEFAULT)}
          className={`px-4 py-2 rounded-md text-white text-sm ${
            theme === THEMES.DEFAULT 
              ? 'ring-2 ring-offset-2 ring-blue-500' 
              : ''
          }`}
          style={{ backgroundColor: '#3F51B5' }}
        >
          Default
        </button>
        
        <button
          onClick={() => setTheme(THEMES.GREEN_GOBLIN)}
          className={`px-4 py-2 rounded-md text-white text-sm ${
            theme === THEMES.GREEN_GOBLIN 
              ? 'ring-2 ring-offset-2 ring-green-500' 
              : ''
          }`}
          style={{ backgroundColor: '#2D9D3F' }}
        >
          Green Goblin
        </button>
        
        <button
          onClick={() => setTheme(THEMES.FUTURISTIC)}
          className={`px-4 py-2 rounded-md text-white text-sm ${
            theme === THEMES.FUTURISTIC 
              ? 'ring-2 ring-offset-2 ring-blue-300' 
              : ''
          }`}
          style={{ backgroundColor: '#0098FF' }}
        >
          Futuristic AI
        </button>
        
        <button
          onClick={() => setTheme(THEMES.CYBERPUNK)}
          className={`px-4 py-2 rounded-md text-white text-sm ${
            theme === THEMES.CYBERPUNK 
              ? 'ring-2 ring-offset-2 ring-pink-500' 
              : ''
          }`}
          style={{ backgroundColor: '#FF2A6D' }}
        >
          Cyberpunk
        </button>
        
        <button
          onClick={() => setTheme(THEMES.JARVIS)}
          className={`px-4 py-2 rounded-md text-white text-sm ${
            theme === THEMES.JARVIS 
              ? 'ring-2 ring-offset-2 ring-blue-500' 
              : ''
          }`}
          style={{ backgroundColor: '#1E88E5' }}
        >
          Jarvis
        </button>
      </div>
    </div>
  );
};

export default ThemeSwitcher;
