import { redirect } from 'next/navigation'

// Government-ID verification was removed from the product; selfie is the
// only manual verification step now. Any old links just bounce to Overview.
export default function IdVerificationsRedirect() {
  redirect('/admin')
}
