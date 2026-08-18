export const exportTheme = {
  background: '#FAF8F5',
  surface: '#FFFFFF',
  container: '#FEF7EB',
  primary: '#9C4D22',
  primaryHover: '#833E1A',
  primaryLight: '#FEE2B8',
  borderSubtle: '#F3E9DA',
  borderInput: '#E6D8C5',
  text: '#3A2312',
  textSecondary: '#7A6657',
  textMuted: '#A39587',
  contrastText: '#FFFFFF'
} as const;

export const toExcelArgb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;
