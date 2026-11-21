// shortcut: free Unsplash photos (Unsplash License, hotlinked from their CDN) stand in for Vikkaa's own shoots; swap each for a real shoot as it happens.
export type StockPhoto = { id: string; src: string; srcSet: string; alt: string; credit: string };

const WIDTHS = [640, 1080, 1600, 2400];
const url = (id: string, w: number) => `https://images.unsplash.com/${id}?w=${w}&q=75&auto=format&fit=crop`;

function photo(id: string, alt: string, credit: string): StockPhoto {
  return { id, src: url(id, 1600), srcSet: WIDTHS.map((w) => `${url(id, w)} ${w}w`).join(', '), alt, credit };
}

/** Same URL builder at one fixed width, for WebGL textures (Unsplash's CDN allows cross-origin loads). */
export const stockUrl = (p: StockPhoto, w = 1600) => url(p.id, w);

export const STOCK = {
  // Property (Sri Lanka where possible)
  villaAhangama: photo('photo-1582610116397-edb318620f90', 'A villa beside a pool among palms in Ahangama, Sri Lanka', 'Dinuka Lankaloka'),
  villaAerial: photo('photo-1728049006296-0f637414d9d7', 'Drone view straight down onto a villa courtyard and pool', 'Antonio Araujo'),
  villaAerialWide: photo('photo-1728049006339-1cc328a28ab0', 'Drone view of tiled roofs, palms and a pool', 'Antonio Araujo'),
  tropicalHouse: photo('photo-1766937754720-4d30de201fd1', 'A white house in a garden of palms at golden hour', 'Sergei Bezzubov'),
  livingRoom: photo('photo-1751945965597-71171ec7a458', 'A bright, airy living room with modern furniture', 'Nha Chill'),
  openAirLiving: photo('photo-1661069543196-9712dc126a91', 'An open-air living room under a timber roof with tropical plants', 'Alexander Davies'),
  // Places
  coastUnawatuna: photo('photo-1649856092355-eee498b1d0f2', 'Drone view of jungle meeting a turquoise bay at Unawatuna', 'Siarhei Palishchuk'),
  coastMirissa: photo('photo-1734279135115-6d8984e08206', 'Aerial view of the coastline at Mirissa at sunset', 'Sarmat Batagov'),
  coastTangalle: photo('photo-1711450470988-fb3bfc707c9c', 'Aerial view of waves breaking on a palm-lined beach in Tangalle', 'Sander Traa'),
  boatsArugam: photo('photo-1552055568-f8c4fb8c6320', 'Fishing boats on the sand at Arugam Bay, seen from above', 'Tomáš Malík'),
  colomboNight: photo('photo-1689588506927-43cb4b416870', 'The Colombo skyline at night', 'Senindu Mendis'),
  lotusTower: photo('photo-1742277295017-2d8ae9d88395', 'Lotus Tower in Colombo against a cloudy sky', 'Zoshua Colah'),
  // Craft
  droneFlying: photo('photo-1603903918940-566325cb1cba', 'A camera drone hovering just above the ground', 'Nathan Dumlao'),
  droneBlack: photo('photo-1743357017900-452e072b378b', 'A camera drone facing the lens against black', 'insung yoon'),
  // Vehicles
  carBlack: photo('photo-1722385640799-4ee84eb90038', 'A black SUV lit in a dark studio', 'Hyundai Motor Group'),
  carRed: photo('photo-1712214910040-1f7f5925b16a', 'A red saloon car under a single studio light', 'Hyundai Motor Group'),
  carShowroom: photo('photo-1755288348835-dc6c29852299', 'Close-up of a dark luxury car’s headlight and wheel', 'Portafolio fotográfico automotriz'),
} as const;
