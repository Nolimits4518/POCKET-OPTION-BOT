/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Default Theme Colors
        primary: {
          DEFAULT: '#3F51B5',
          light: '#757DE8',
          dark: '#002984',
        },
        secondary: {
          DEFAULT: '#6200EA',
          light: '#9D46FF',
          dark: '#0A00B6',
        },
        
        // Green Goblin Theme
        goblin: {
          primary: '#2D9D3F',
          secondary: '#7D268A',
          accent: '#F4B400',
          text: {
            light: '#E0FDE7',
            dark: '#101A0F',
          },
          bg: '#0C1F0F',
          card: '#162617',
          success: '#4CBB17',
          danger: '#9A031E',
        },
        
        // Futuristic AI Theme
        futuristic: {
          primary: '#0098FF',
          secondary: '#F2F2F7',
          accent: '#00E5FF',
          text: {
            light: '#FFFFFF',
            dark: '#212B36',
          },
          bg: '#0A1929',
          card: '#132F4C',
          success: '#00C853',
          danger: '#FF3D71',
        },
        
        // Cyberpunk Theme
        cyberpunk: {
          primary: '#FF2A6D',
          secondary: '#05D9E8',
          accent: '#F9F871',
          text: {
            light: '#FDFFFC',
            dark: '#010101',
          },
          bg: '#1A1A2E',
          card: '#16213E',
          success: '#00FF9F',
          danger: '#FF2A6D',
        },
        
        // Jarvis Theme
        jarvis: {
          primary: '#1E88E5',
          secondary: '#2C3E50',
          accent: '#E67E22',
          text: {
            light: '#ECEFF1',
            dark: '#263238',
          },
          bg: '#0F2231',
          card: '#1C3A52',
          success: '#43A047',
          danger: '#E53935',
        },
      },
      fontFamily: {
        // Green Goblin Theme
        'goblin-heading': ['Oswald', 'sans-serif'],
        'goblin-body': ['Roboto Condensed', 'sans-serif'],
        
        // Futuristic AI Theme
        'futuristic-heading': ['Exo\\ 2', 'sans-serif'],
        'futuristic-body': ['Inter', 'sans-serif'],
        
        // Cyberpunk Theme
        'cyberpunk-heading': ['Chakra Petch', 'sans-serif'],
        'cyberpunk-body': ['Share Tech Mono', 'monospace'],
        
        // Jarvis Theme
        'jarvis-heading': ['Rajdhani', 'sans-serif'],
        'jarvis-body': ['Titillium Web', 'sans-serif'],
      },
      boxShadow: {
        'goblin': '0 4px 14px 0 rgba(45, 157, 63, 0.39)',
        'futuristic': '0 4px 14px 0 rgba(0, 152, 255, 0.3)',
        'cyberpunk': '0 4px 14px 0 rgba(255, 42, 109, 0.5)',
        'jarvis': '0 4px 14px 0 rgba(30, 136, 229, 0.4)',
      },
      animation: {
        'goblin-pulse': 'goblin-pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'futuristic-scan': 'futuristic-scan 2s ease-in-out infinite',
        'cyberpunk-glitch': 'cyberpunk-glitch 0.8s ease-in-out infinite',
        'jarvis-pulse': 'jarvis-pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'goblin-pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
        'futuristic-scan': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 100%' },
        },
        'cyberpunk-glitch': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
        },
        'jarvis-pulse': {
          '0%, 100%': { boxShadow: '0 0 15px 0 rgba(30, 136, 229, 0.7)' },
          '50%': { boxShadow: '0 0 30px 5px rgba(30, 136, 229, 0.9)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}