export const GoldTheme = {
  // Background colors
  background: {
    primary: '#0A0A0A',        // Deep black
    secondary: '#1A1A1A',      // Charcoal
    card: '#2A2A2A',          // Dark gray for cards
    overlay: 'rgba(0, 0, 0, 0.85)', // Dark overlay
  },
  
  // Gold colors
  gold: {
    primary: '#FFD700',        // Pure gold
    light: '#FFF8DC',          // Light gold/cream
    dark: '#B8860B',           // Dark goldenrod
    metallic: '#D4AF37',       // Metallic gold
    accent: '#F4E4BC',         // Soft gold accent
  },
  
  // Text colors
  text: {
    primary: '#FFFFFF',        // White text
    secondary: '#E0E0E0',      // Light gray
    gold: '#FFD700',           // Gold text
    muted: '#888888',          // Muted gray
    inverse: '#000000',        // Black text for gold backgrounds
  },
  
  // Gradients - Fixed as proper tuples
  gradients: {
    gold: ['#FFD700', '#FFA500', '#FF8C00'] as const,
    goldVertical: ['#FFD700', '#B8860B'] as const,
    darkGold: ['#2A2A2A', '#1A1A1A'] as const,
    goldButton: ['#FFD700', '#DAA520'] as const,
    goldShimmer: ['#FFD700', '#FFED4E', '#FFD700'] as const,
  },
  
  // Border and shadow
  border: {
    gold: '#FFD700',
    dark: '#333333',
    light: '#555555',
  },
  
  shadow: {
    gold: {
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    dark: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
      elevation: 4,
    },
  },
  
  // Status and feedback
  status: {
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    info: '#2196F3',
  },
}; 