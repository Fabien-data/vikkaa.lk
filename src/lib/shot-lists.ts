import type { AssetKind } from '@/lib/enums';

const HOUSE = [
  'Front elevation, straight on, at golden hour',
  'Front at a 45° angle showing the garden and gate',
  'Drone: the house in its neighbourhood, main road and landmarks',
  'Drone: top-down of the full plot',
  'Entrance and foyer',
  'Living room from two corners',
  'Dining area',
  'Kitchen: wide, then counters and storage',
  'Master bedroom from the doorway, then from the window side',
  'Every other bedroom: one wide shot each',
  'Bathrooms: one clean wide shot each',
  'Garden, yard and outdoor living spaces',
  'Parking and garage',
  'Views from windows and balconies',
  'Walkthrough video: gate to back garden, one take',
  'Details: finishes, fittings, solar, water tank',
];

const APARTMENT = [
  'Building exterior and entrance',
  'Lobby, lifts and security desk',
  'Shared amenities: pool, gym, rooftop',
  'Living and dining from two corners',
  'Kitchen: wide, then counters and storage',
  'Master bedroom from the doorway, then from the window side',
  'Every other bedroom: one wide shot each',
  'Bathrooms: one clean wide shot each',
  'Balcony and the view from it, day and dusk',
  'Allocated parking slot',
  'Drone: the building in its neighbourhood and nearby landmarks',
  'Walkthrough video: front door through every room, one take',
];

const LAND = [
  'Drone: top-down of the whole plot with the boundaries visible',
  'Drone: the plot in its neighbourhood, access road and landmarks',
  'Drone: low orbit around the plot',
  'Road frontage from the road, both directions',
  'Access road surface and width',
  'Boundary markers and walls at each corner',
  'Ground level: standing at each corner, looking across the plot',
  'Trees, slope and any water on the land',
  'Electricity and water connection points',
  'Nearest neighbours and the view from the plot',
];

const COMMERCIAL = [
  'Street frontage and signage position',
  'Drone: the building in its neighbourhood, main road and footfall',
  'Entrance and reception',
  'Each floor or open space: wide from two corners',
  'Offices, meeting rooms and storage',
  'Washrooms and pantry',
  'Parking and loading access',
  'Services: generator, lifts, air conditioning',
  'Walkthrough video: entrance through every space, one take',
];

const VEHICLE = [
  'Front three-quarter view (the hero shot)',
  'Rear three-quarter view',
  'Side profile, both sides',
  'Straight front and straight rear',
  'Wheels and tyres, close up',
  'Dashboard and odometer reading with the engine on',
  'Front seats from the open driver door',
  'Rear seats',
  'Boot, empty',
  'Engine bay',
  'Any scratches or dents, honestly',
  'Service book and documents (number plate blurred later)',
  'Rolling shot or a short drive-by video',
];

const OTHER = [
  'Wide hero shot in the best light',
  'Every side or angle that matters to a buyer',
  'Close-ups of condition and details',
  'Any flaws, honestly',
  'Short walkaround video, one take',
];

/** The checklist each shoot works through, by asset kind. */
export const SHOT_LISTS: Record<AssetKind, readonly string[]> = {
  house: HOUSE,
  apartment: APARTMENT,
  land: LAND,
  commercial: COMMERCIAL,
  car: VEHICLE,
  suv: VEHICLE,
  van: VEHICLE,
  other: OTHER,
};
