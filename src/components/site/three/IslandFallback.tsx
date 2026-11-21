import { dots, PINS, project } from './lanka';

// Built once at module load: the island as a flat dot grid in SVG, for reduced motion or no WebGL.
const GRID = dots(0.06);
const PIN_XY = PINS.map((p) => ({ ...p, xy: project(p.lon, p.lat) }));

export default function IslandFallback() {
  return (
    <svg viewBox="-1.6 -2.1 3.2 4.2" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <g fill="#3aa876" fillOpacity={0.5}>
        {GRID.filter((d) => !d[2]).map(([x, y]) => (
          <circle key={`${x},${y}`} cx={x} cy={-y} r={0.016} />
        ))}
      </g>
      <g fill="#b5e8cd">
        {GRID.filter((d) => d[2]).map(([x, y]) => (
          <circle key={`${x},${y}`} cx={x} cy={-y} r={0.02} />
        ))}
      </g>
      {PIN_XY.map(({ name, xy: [x, y], label }) => (
        <g key={name}>
          <circle cx={x} cy={-y} r={0.05} fill="none" stroke="#b5e8cd" strokeOpacity={0.5} strokeWidth={0.006} />
          <circle cx={x} cy={-y} r={0.022} fill="#fff" />
          {label && (
            <text x={name === 'Gampaha' ? x + 0.08 : x - 0.08} y={-y + 0.024} textAnchor={name === 'Gampaha' ? 'start' : 'end'} fill="#b5e8cd" fontSize={0.07} fontWeight={600} letterSpacing={0.012}>
              {name.toUpperCase()}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
