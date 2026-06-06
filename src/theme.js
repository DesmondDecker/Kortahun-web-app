import { extendTheme } from '@chakra-ui/react';

export const theme = extendTheme({
  fonts: {
    heading: "'Inter', sans-serif",
    body:    "'Inter', sans-serif",
  },
  colors: {
    brand: {
      50:  '#EBF4FF', 100: '#C3DAFE', 200: '#A3BFFA', 300: '#7F9CF5',
      400: '#667EEA', 500: '#4C51BF', 600: '#3730A3', 700: '#2D3561',
      800: '#1A1E3C', 900: '#0F1225',
    },
    water: {
      50:  '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD',
      400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8',
      800: '#1E40AF', 900: '#1E3A8A',
    },
  },
  styles: { global: { body: { bg: '#F0F4FF', color: '#1A202C' } } },
  components: {
    Button: {
      defaultProps: { colorScheme: 'water' },
      variants: {
        solid:   { borderRadius: '8px', fontWeight: '600', _hover: { transform: 'translateY(-1px)', shadow: 'md' }, transition: 'all 0.15s' },
        outline: { borderRadius: '8px', fontWeight: '600' },
        ghost:   { borderRadius: '8px' },
      },
    },
    Card: { baseStyle: { container: { borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)', bg: 'white' } } },
    Input:    { defaultProps: { focusBorderColor: 'water.500' }, variants: { outline: { field: { borderRadius: '8px', bg: 'white' } } } },
    Select:   { defaultProps: { focusBorderColor: 'water.500' }, variants: { outline: { field: { borderRadius: '8px', bg: 'white' } } } },
    Textarea: { defaultProps: { focusBorderColor: 'water.500' }, variants: { outline: { borderRadius: '8px', bg: 'white' } } },
    Table: { variants: { simple: { th: { bg: 'gray.50', color: 'gray.600', fontWeight: '600', fontSize: 'xs', textTransform: 'uppercase', letterSpacing: 'wide' }, td: { fontSize: 'sm' } } } },
    Badge: { baseStyle: { borderRadius: '6px', fontWeight: '600', textTransform: 'none', fontSize: '0.7rem' } },
  },
});
