/** Every app.vikkaa.lk page (Studio, portal, signing, check-in) shares the studio theme from globals.css. */
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <div className="app flex min-h-screen flex-1 flex-col">{children}</div>;
}
