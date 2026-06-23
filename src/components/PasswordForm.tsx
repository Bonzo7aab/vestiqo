'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Edit2, X, Check, Lock, Mail } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { createClient } from '../lib/supabase/client'
import { requestPasswordResetEmailAction } from '../lib/auth/actions'
import { validatePasswordStrength } from '../lib/auth/password-policy'

interface PasswordFormProps {
  /** Logged-in user email (e.g. from account page) — required for „Zmień hasło” and reset email. */
  accountEmail?: string
}

export function PasswordForm({ accountEmail }: PasswordFormProps) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [resetSending, setResetSending] = useState(false)
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handlePasswordSubmit = async () => {
    setError('')
    setSuccess('')
    setIsLoading(true)

    const email = accountEmail?.trim()
    if (!email) {
      setError('Brak adresu email konta. Odśwież stronę lub skontaktuj się z pomocą.')
      setIsLoading(false)
      return
    }

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError('Wszystkie pola hasła są wymagane')
      setIsLoading(false)
      return
    }

    const strength = validatePasswordStrength(passwordData.newPassword)
    if (!strength.valid) {
      setError(strength.message ?? 'Nieprawidłowe hasło')
      setIsLoading(false)
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Nowe hasła nie są identyczne')
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error: signError } = await supabase.auth.signInWithPassword({
        email,
        password: passwordData.currentPassword,
      })

      if (signError) {
        setError('Nieprawidłowe obecne hasło')
        setIsLoading(false)
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      })

      if (updateError) {
        setError(updateError.message)
        setIsLoading(false)
        return
      }

      setSuccess('Hasło zostało zmienione pomyślnie')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setIsEditingPassword(false)
      setTimeout(() => setSuccess(''), 4000)
      router.refresh()
    } catch {
      setError('Wystąpił błąd podczas zmiany hasła')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendResetEmail = async () => {
    setError('')
    setSuccess('')
    const email = accountEmail?.trim()
    if (!email) {
      setError('Brak adresu email konta.')
      return
    }
    setResetSending(true)
    try {
      const result = await requestPasswordResetEmailAction(email)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSuccess('Wysłano nowe hasło. Sprawdź skrzynkę (również folder spam).')
      setTimeout(() => setSuccess(''), 8000)
    } catch {
      setError('Nie udało się wysłać wiadomości resetującej')
    } finally {
      setResetSending(false)
    }
  }

  const handleCancelPassword = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    setIsEditingPassword(false)
    setError('')
  }

  return (
    <div className="space-y-4">
      {(error || success) && (
        <Alert variant={error ? 'destructive' : 'default'}>
          <AlertDescription>{error || success}</AlertDescription>
        </Alert>
      )}

      <div className="border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">Reset hasła emailem</h4>
          </div>
          <Button variant="outline" size="sm" onClick={handleSendResetEmail} disabled={resetSending || !accountEmail}>
            {resetSending ? 'Wysyłanie…' : 'Wyślij nowe hasło'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Otrzymasz wiadomość z nowym, tymczasowym hasłem do logowania.
        </p>
      </div>

      <div className="border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">Zmiana hasła (zalogowany)</h4>
          </div>
          {!isEditingPassword ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditingPassword(true)} disabled={!accountEmail}>
              <Edit2 className="h-4 w-4 mr-2" />
              Zmień hasło
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelPassword} disabled={isLoading}>
                <X className="h-4 w-4 mr-2" />
                Anuluj
              </Button>
              <Button variant="default" size="sm" onClick={handlePasswordSubmit} disabled={isLoading}>
                <Check className="h-4 w-4 mr-2" />
                {isLoading ? 'Zapisywanie...' : 'Zapisz'}
              </Button>
            </div>
          )}
        </div>

        {!isEditingPassword ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Znasz obecne hasło? Użyj „Zmień hasło”. W przeciwnym razie wyślij nowe hasło emailem powyżej.
            </p>
            <div className="flex items-center py-2 px-3 bg-muted rounded-md">
              <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
              <p className="text-sm">••••••••</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Obecne hasło</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="pr-10"
                  required
                  placeholder="Wpisz obecne hasło"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nowe hasło</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="pr-10"
                  required
                  placeholder="Minimum 6 znaków"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="pr-10"
                  required
                  placeholder="Powtórz nowe hasło"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
