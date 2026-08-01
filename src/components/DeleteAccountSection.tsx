'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog'
import { Alert, AlertDescription } from './ui/alert'
import { deleteAccountAction } from '../lib/auth/actions'
import { useUserProfile } from '../contexts/AuthContext'

const ACCOUNT_DELETED_MESSAGE = 'Konto zostało trwale usunięte.';

export function DeleteAccountSection() {
  const router = useRouter()
  const { logout } = useUserProfile()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  const handleOpenChange = (nextOpen: boolean): void => {
    if (isLoading && !nextOpen) {
      return
    }
    setOpen(nextOpen)
    if (!nextOpen) {
      setError('')
    }
  }

  const handleDeleteAccount = async (): Promise<void> => {
    setError('')
    setIsLoading(true)

    try {
      const result = await deleteAccountAction()

      if ('error' in result) {
        setError(result.error)
        setIsLoading(false)
        setOpen(true)
        return
      }

      await logout()
      setOpen(false)
      setIsLoading(false)

      const params = new URLSearchParams({
        refresh_browser_auth: '1',
        message: ACCOUNT_DELETED_MESSAGE,
      })
      router.replace(`/logowanie?${params.toString()}`)
      router.refresh()
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || 'Wystąpił błąd podczas usuwania konta')
      setIsLoading(false)
      setOpen(true)
    }
  }

  return (
    <div className="space-y-4">
      <Separator />

      <div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-1 gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
            <div className="min-w-0 flex-1 space-y-2">
              <h4 className="font-medium text-destructive">Niebezpieczna strefa</h4>
              <p className="text-sm text-muted-foreground">
                Usunięcie konta jest działaniem nieodwracalnym. Wszystkie Twoje dane,
                w tym profile, zgłoszenia, aplikacje i wiadomości, zostaną trwale usunięte
                i nie będą mogły zostać przywrócone.
              </p>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <div className="shrink-0 sm:pt-0.5">
            <AlertDialog open={open} onOpenChange={handleOpenChange}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Usuń konto
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Potwierdź usunięcie konta
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2 pt-2">
                      <p>
                        Czy na pewno chcesz trwale usunąć swoje konto? Ta operacja jest
                        nieodwracalna i spowoduje:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                        <li>Trwałe usunięcie Twojego profilu użytkownika</li>
                        <li>Usunięcie wszystkich Twoich ofert pracy i przetargów</li>
                        <li>Usunięcie wszystkich zgłoszeń i aplikacji</li>
                        <li>Usunięcie wszystkich wiadomości i konwersacji</li>
                        <li>Usunięcie wszystkich innych powiązanych danych</li>
                      </ul>
                      <p className="font-medium text-destructive pt-2">
                        Tej akcji nie można cofnąć.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {error && (
                  <Alert variant="destructive" className="my-2">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isLoading}>
                    Anuluj
                  </AlertDialogCancel>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isLoading}
                    onClick={() => {
                      void handleDeleteAccount()
                    }}
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Usuwanie...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Tak, usuń konto
                      </>
                    )}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  )
}
