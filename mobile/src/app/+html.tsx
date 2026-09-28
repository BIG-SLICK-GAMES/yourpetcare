import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import { desktopStyles } from '../desktop-styles';

export default function Root({ children }: PropsWithChildren) {
  return <html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Your Pet Care</title><meta name="description" content="Your Pet Care remembers the things you shouldn't have to. Pet profiles, routines, plans and local care with Pip, your companion."/><ScrollViewStyleReset/><style>{`[data-testid="header-signin"]:focus-visible { outline: 2px solid #244e46; outline-offset: 2px; border-radius: 18px; } [data-testid="pip-talk"]:focus { outline: none; } [data-testid="pip-talk"]:focus-visible > :last-child { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 4px; }${desktopStyles}`}</style></head><body>{children}</body></html>;
}
