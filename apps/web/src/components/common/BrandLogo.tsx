import { cn } from '@oxneer/ui';

interface BrandLogoProps {
  /** Sets the logo height; width follows the artwork. Defaults to `h-8`. */
  className?: string;
}

/** The Oxneer wordmark, swapped for the matching artwork in light and dark
 *  themes. Use this everywhere the brand appears so every surface shows the
 *  same mark. Only one image is displayed at a time, so both carry the alt text. */
export function BrandLogo({ className }: BrandLogoProps) {
  const sizing = cn('h-8 w-auto shrink-0', className);
  return (
    <>
      <img src="/oxneer_logo_light.svg" alt="Oxneer" className={cn(sizing, 'dark:hidden')} />
      <img src="/oxneer_logo_dark.svg" alt="Oxneer" className={cn(sizing, 'hidden dark:block')} />
    </>
  );
}
