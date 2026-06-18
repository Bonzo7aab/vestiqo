import { redirect } from 'next/navigation'

export default function UpdatePasswordPage() {
  const message = encodeURIComponent(
    'Reset hasła odbywa się przez wysłanie nowego hasła na email. Użyj strony „Zapomniałeś hasła?”.',
  )
  redirect(`/zapomniane-haslo?message=${message}`)
}
