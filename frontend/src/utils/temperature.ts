export const toCelsius = (kelvin: number | null) => {
  if (kelvin === null) return null;
  return Math.round(kelvin - 273.15);
};

export const formatTemp = (kelvin: number | null, unit: 'K' | 'C') => {
  if (kelvin === null) return '—';
  return unit === 'C' ? `${toCelsius(kelvin)}°C` : `${kelvin} K`;
};