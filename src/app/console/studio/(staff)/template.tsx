/** Remounts on each Studio section change, so every page enters with the same short stagger (globals.css .page-enter). */
export default function StudioTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
