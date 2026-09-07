import { createTheme, type Theme } from '@mui/material/styles'

/**
 * A system font stack keeps the served bundle free of any third-party webfont
 * request at runtime.
 */
const fontFamily = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
].join(',')

export const theme: Theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data' },
  colorSchemes: { light: true, dark: true },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily,
    h1: { fontSize: '1.5rem', fontWeight: 600 },
    h2: { fontSize: '1.0625rem', fontWeight: 600 },
  },
  components: {
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiAppBar: { defaultProps: { color: 'default', elevation: 0 } },
  },
})
