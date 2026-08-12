export interface GeoLocation {
  city: string;
  state: string;
}

// Catalog of standardized Mexican Postal Code prefixes & exact CPs focusing on Guanajuato and major regions
const exactPostalCodes: Record<string, GeoLocation> = {
  // Guanajuato - León
  '37000': { city: 'León', state: 'Guanajuato' },
  '37100': { city: 'León', state: 'Guanajuato' },
  '37150': { city: 'León', state: 'Guanajuato' },
  '37200': { city: 'León', state: 'Guanajuato' },
  '37250': { city: 'León', state: 'Guanajuato' },
  '37300': { city: 'León', state: 'Guanajuato' },
  '37400': { city: 'León', state: 'Guanajuato' },
  '37500': { city: 'León', state: 'Guanajuato' },
  '37600': { city: 'León', state: 'Guanajuato' },
  // Guanajuato - Irapuato
  '36500': { city: 'Irapuato', state: 'Guanajuato' },
  '36600': { city: 'Irapuato', state: 'Guanajuato' },
  '36670': { city: 'Irapuato', state: 'Guanajuato' },
  // Guanajuato - Celaya
  '38000': { city: 'Celaya', state: 'Guanajuato' },
  '38010': { city: 'Celaya', state: 'Guanajuato' },
  '38080': { city: 'Celaya', state: 'Guanajuato' },
  // Guanajuato - Capital
  '36000': { city: 'Guanajuato', state: 'Guanajuato' },
  '36250': { city: 'Silao', state: 'Guanajuato' },
  '36700': { city: 'Salamanca', state: 'Guanajuato' },
  '37700': { city: 'San Miguel de Allende', state: 'Guanajuato' },
  '36300': { city: 'San Francisco del Rincón', state: 'Guanajuato' },
  '37800': { city: 'Dolores Hidalgo', state: 'Guanajuato' },
  '38400': { city: 'Cortazar', state: 'Guanajuato' },
  '38900': { city: 'Uriangato', state: 'Guanajuato' },
  '38470': { city: 'Valle de Santiago', state: 'Guanajuato' },
  '36900': { city: 'Pénjamo', state: 'Guanajuato' },
  '36970': { city: 'Abasolo', state: 'Guanajuato' },
  '38100': { city: 'Apaseo el Grande', state: 'Guanajuato' },
  '38240': { city: 'Apaseo el Alto', state: 'Guanajuato' },
  '38600': { city: 'Acámbaro', state: 'Guanajuato' },
  '38980': { city: 'Yuriria', state: 'Guanajuato' },
  '38300': { city: 'Salvatierra', state: 'Guanajuato' },
  '36400': { city: 'Purísima del Rincón', state: 'Guanajuato' },
  '36200': { city: 'Romita', state: 'Guanajuato' },
  // Queretaro
  '76000': { city: 'Santiago de Querétaro', state: 'Querétaro' },
  '76100': { city: 'Santiago de Querétaro', state: 'Querétaro' },
  '76230': { city: 'Juriquilla', state: 'Querétaro' },
  '76800': { city: 'San Juan del Río', state: 'Querétaro' },
  // Aguascalientes
  '20000': { city: 'Aguascalientes', state: 'Aguascalientes' },
  // Michoacan
  '58000': { city: 'Morelia', state: 'Michoacán' },
  '59600': { city: 'Zamora', state: 'Michoacán' },
  // San Luis Potosi
  '78000': { city: 'San Luis Potosí', state: 'San Luis Potosí' },
  // Jalisco
  '44100': { city: 'Guadalajara', state: 'Jalisco' },
  '45000': { city: 'Zapopan', state: 'Jalisco' },
  // CDMX
  '01000': { city: 'Álvaro Obregón', state: 'Ciudad de México' },
  '06000': { city: 'Cuauhtémoc', state: 'Ciudad de México' },
  '11000': { city: 'Miguel Hidalgo', state: 'Ciudad de México' },
  // Nuevo Leon
  '64000': { city: 'Monterrey', state: 'Nuevo León' },
  '66220': { city: 'San Pedro Garza García', state: 'Nuevo León' },
};

export const lookupPostalCode = async (cp: string): Promise<GeoLocation | null> => {
  const cleanCp = cp.trim().replace(/\D/g, '');
  if (cleanCp.length !== 5) return null;

  // 1. Direct match in local catalog
  if (exactPostalCodes[cleanCp]) {
    return exactPostalCodes[cleanCp];
  }

  // 2. Range match based on 2-digit Mexican state ranges
  const prefix2 = cleanCp.slice(0, 2);
  const prefix3 = cleanCp.slice(0, 3);
  const prefixNum = parseInt(prefix2, 10);

  if (prefixNum >= 36 && prefixNum <= 38) {
    // Default fallback for Guanajuato state
    if (prefix3 === '370' || prefix3 === '371' || prefix3 === '372' || prefix3 === '373' || prefix3 === '374' || prefix3 === '375') {
      return { city: 'León', state: 'Guanajuato' };
    }
    if (prefix3 === '365' || prefix3 === '366') {
      return { city: 'Irapuato', state: 'Guanajuato' };
    }
    if (prefix3 === '380') {
      return { city: 'Celaya', state: 'Guanajuato' };
    }
    if (prefix3 === '360') {
      return { city: 'Guanajuato', state: 'Guanajuato' };
    }
    return { city: 'Guanajuato', state: 'Guanajuato' };
  }

  if (prefixNum >= 76 && prefixNum <= 77) return { city: 'Querétaro', state: 'Querétaro' };
  if (prefixNum >= 20 && prefixNum <= 22) return { city: 'Aguascalientes', state: 'Aguascalientes' };
  if (prefixNum >= 58 && prefixNum <= 61) return { city: 'Morelia', state: 'Michoacán' };
  if (prefixNum >= 78 && prefixNum <= 79) return { city: 'San Luis Potosí', state: 'San Luis Potosí' };
  if (prefixNum >= 44 && prefixNum <= 49) return { city: 'Guadalajara', state: 'Jalisco' };
  if (prefixNum >= 1 && prefixNum <= 16) return { city: 'Ciudad de México', state: 'Ciudad de México' };
  if (prefixNum >= 64 && prefixNum <= 67) return { city: 'Monterrey', state: 'Nuevo León' };

  // 3. Fallback online lookup via zippopotam.us (free public ZIP service)
  try {
    const response = await fetch(`https://api.zippopotam.us/mx/${cleanCp}`);
    if (response.ok) {
      const data = await response.json() as { places?: Array<{ 'place name': string; state: string }> };
      if (data.places && data.places.length > 0) {
        return {
          city: data.places[0]['place name'],
          state: data.places[0].state
        };
      }
    }
  } catch {
    // Ignore network lookup error and fallback to state default
  }

  return null;
};
