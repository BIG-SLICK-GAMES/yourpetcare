// Web-only layout rules. The same screens, actions and data power phone and desktop.
export const desktopStyles=`
@media (min-width: 980px) {
  :root [data-testid="home-columns"] { display: grid !important; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 40px !important; align-items: start; margin-top: 20px; }
  :root [data-testid="home-today"] { padding: 26px; border: 1px solid #dfe4d8; border-radius: 30px; background: #f1f3e9; }
  :root [data-testid="planning-groups"] { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px !important; align-items: stretch; }
  :root [data-testid="planning-group"] { padding: 24px; border-radius: 26px; border: 1px solid #dfe4d8; background: white; }
  :root [data-testid="plan-map-layout"] { display: grid !important; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 30px !important; align-items: start; }
  :root [data-testid="planning-map"] iframe, :root [data-testid="directory-map"] iframe { height: 510px !important; }
  :root [data-testid="directory-results"], :root [data-testid="pet-grid"], :root [data-testid="calendar-grid"] { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px !important; align-items: start; }
  :root [data-testid="help-grid"] { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  :root [data-testid="help-grid"] > * { width: auto !important; min-width: 0 !important; }
}
`;
