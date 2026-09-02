// Logo der Marktgemeinde Gumpoldskirchen (Vektor aus dem CD-Manual, Farbe über currentColor:
// lt. CD nur in Dunkelblau oder Weiß einsetzen – niemals grün oder zweifarbig).
export default function Logo({ className = 'h-10' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <span className={`inline-block ${className}`} aria-label="Marktgemeinde Gumpoldskirchen" role="img"
      style={{ aspectRatio: '149.36 / 76.22', WebkitMaskImage: 'url(/logos/gumpoldskirchen.svg)', maskImage: 'url(/logos/gumpoldskirchen.svg)',
               WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskSize: 'contain', maskSize: 'contain', backgroundColor: 'currentColor' }} />
  )
}
