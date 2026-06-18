import React, { useState } from 'react';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
// import logoUrbi from 'figma:asset/03399e74201459d6cda917d74a1b9daa8e442e99.png';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { useUserProfile } from '../contexts/AuthContext';
import { requestPasswordResetEmailAction } from '../lib/auth/actions';
import { BrandLogo } from './BrandLogo';

interface ForgotPasswordPageProps {
  onBack: () => void;
  onLoginClick: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ 
  onBack, 
  onLoginClick 
}) => {
  const { isLoading } = useUserProfile();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Proszę wprowadzić adres email');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Proszę wprowadzić prawidłowy adres email');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestPasswordResetEmailAction(email);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas resetowania hasła');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Header with back button */}
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="hidden md:flex text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót
            </Button>
          </div>

          {/* Logo and title */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <BrandLogo variant="full" className="h-16 w-auto" />
            </div>
          </div>

          {/* Success message */}
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <CardTitle className="text-2xl">Email wysłany!</CardTitle>
              <CardDescription>
                Jeśli konto o podanym adresie email istnieje, wyślemy na nie nowe hasło.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <strong>Sprawdź swoją skrzynkę email</strong>
                  <br />
                  Nowe hasło zostało wysłane na adres: <strong>{email}</strong>
                </AlertDescription>
              </Alert>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>Jeśli nie widzisz wiadomości:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Sprawdź folder spam/junk</li>
                  <li>Upewnij się, że adres email jest prawidłowy</li>
                  <li>Zaloguj się nowym hasłem i zmień je w ustawieniach konta</li>
                  <li>Spróbuj ponownie za kilka minut</li>
                </ul>
              </div>

              <Button 
                onClick={onLoginClick}
                className="w-full bg-primary hover:bg-primary/90"
              >
                Powrót do logowania
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header with back button */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
        </div>

        {/* Logo and title */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BrandLogo variant="full" className="h-16 w-auto" />
          </div>
          <p className="text-muted-foreground">
            Resetowanie hasła
          </p>
        </div>

        {/* Reset password form */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Zapomniałeś hasła?</CardTitle>
            <CardDescription>
              Wprowadź swój adres email, a wyślemy Ci nowe hasło
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Adres email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="twoj@email.pl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading || isSubmitting}
              >
                {isLoading || isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Wysyłanie...</span>
                  </div>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Wyślij nowe hasło
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Login link */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Pamiętasz hasło?{' '}
            <Button
              variant="link"
              size="sm"
              onClick={onLoginClick}
              className="px-0 text-primary hover:text-primary/80"
            >
              Zaloguj
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};