// LEGACY: /businesses permanently redirects to /bizally.
// The directory was renamed to reflect the live-presence framing.
import { permanentRedirect } from 'next/navigation'

export default function LegacyBusinessesRedirect() {
  permanentRedirect('/bizally')
}
