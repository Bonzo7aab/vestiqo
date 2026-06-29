import React, { useState } from 'react';
import { ArrowLeft, Send, Phone, Mail, MessageCircle, Clock, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface ExpertConsultationPageProps {
  onBack: () => void;
}

const ExpertConsultationPage: React.FC<ExpertConsultationPageProps> = ({ onBack }) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    userType: '',
    businessSize: '',
    mainChallenge: '',
    consultationType: 'call',
    preferredTime: '',
    message: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.userType) {
      toast.error('Proszę wypełnić wszystkie wymagane pola');
      return;
    }

    // Simulate form submission
    setTimeout(() => {
      setIsSubmitted(true);
      toast.success('Formularz został wysłany! Skontaktujemy się w ciągu 24 godzin.');
    }, 1000);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-primary">Konsultacja z ekspertem</h1>
                <p className="text-muted-foreground">Dziękujemy za zgłoszenie</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="text-center max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-success/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
              </div>
              <CardTitle className="text-2xl text-success">Formularz został wysłany!</CardTitle>
              <CardDescription className="text-base">
                Dziękujemy za zainteresowanie konsultacją z naszym ekspertem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Co dalej?</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Skontaktujemy się w ciągu 24 godzin</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {formData.consultationType === 'call' ? (
                        <Phone className="h-4 w-4" />
                      ) : (
                        <MessageCircle className="h-4 w-4" />
                      )}
                      <span>
                        {formData.consultationType === 'call' 
                          ? 'Umówimy się na rozmowę telefoniczną' 
                          : 'Odpowiemy na Twoje pytania przez email'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>Otrzymasz potwierdzenie na adres {formData.email}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" onClick={onBack}>
                  Wróć na stronę główną
                </Button>
                <Button onClick={onBack} className="bg-primary">
                  Przeglądaj zgłoszenia
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-primary">Konsultacja z ekspertem</h1>
              <p className="text-muted-foreground">Porozmawiaj z naszym ekspertem o swoich potrzebach</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Intro Section */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Otrzymaj spersonalizowaną pomoc</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-6">
            Nasz ekspert pomoże Ci wybrać najlepszy plan i odpowie na wszystkie pytania dotyczące 
            platformy Urbi.eu. Konsultacja jest całkowicie bezpłatna i bez zobowiązań.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-center space-x-2 text-sm">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Bezpłatna konsultacja</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Brak zobowiązań</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Odpowiedź w 24h</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Formularz konsultacji</CardTitle>
                <CardDescription>
                  Wypełnij formularz, a nasz ekspert skontaktuje się z Tobą w ciągu 24 godzin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Imię *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="Twoje imię"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nazwisko *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Twoje nazwisko"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="twoj@email.pl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+48 123 456 789"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Nazwa firmy/wspólnoty</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      placeholder="Nazwa Twojej firmy lub wspólnoty"
                    />
                  </div>

                  {/* User Type */}
                  <div className="space-y-2">
                    <Label>Jestem *</Label>
                    <RadioGroup 
                      value={formData.userType} 
                      onValueChange={(value) => handleInputChange('userType', value)}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="contractor" id="contractor" />
                        <Label htmlFor="contractor">Wykonawcą/Firmą budowlaną</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="manager" id="manager" />
                        <Label htmlFor="manager">Zarządcą nieruchomości</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Business Size */}
                  <div className="space-y-2">
                    <Label htmlFor="businessSize">Rozmiar działalności</Label>
                    <Select value={formData.businessSize} onValueChange={(value) => handleInputChange('businessSize', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz rozmiar działalności" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Mała (1-5 osób)</SelectItem>
                        <SelectItem value="medium">Średnia (6-20 osób)</SelectItem>
                        <SelectItem value="large">Duża (21+ osób)</SelectItem>
                        <SelectItem value="individual">Działalność jednoosobowa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Main Challenge */}
                  <div className="space-y-2">
                    <Label htmlFor="mainChallenge">Główne wyzwanie w Twojej branży</Label>
                    <Select value={formData.mainChallenge} onValueChange={(value) => handleInputChange('mainChallenge', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz główne wyzwanie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="finding-clients">Znalezienie nowych klientów</SelectItem>
                        <SelectItem value="finding-contractors">Znalezienie rzetelnych wykonawców</SelectItem>
                        <SelectItem value="competition">Konkurencja cenowa</SelectItem>
                        <SelectItem value="trust">Budowanie zaufania</SelectItem>
                        <SelectItem value="efficiency">Efektywność procesów</SelectItem>
                        <SelectItem value="transparency">Przejrzystość współpracy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Consultation Type */}
                  <div className="space-y-2">
                    <Label>Preferowany sposób kontaktu</Label>
                    <RadioGroup 
                      value={formData.consultationType} 
                      onValueChange={(value) => handleInputChange('consultationType', value)}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="call" id="call" />
                        <Label htmlFor="call">Rozmowa telefoniczna</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="email" id="email" />
                        <Label htmlFor="email">Odpowiedź przez email</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Preferred Time */}
                  <div className="space-y-2">
                    <Label htmlFor="preferredTime">Preferowana pora kontaktu</Label>
                    <Select value={formData.preferredTime} onValueChange={(value) => handleInputChange('preferredTime', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz preferowaną porę" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Rano (8:00-12:00)</SelectItem>
                        <SelectItem value="afternoon">Popołudnie (12:00-16:00)</SelectItem>
                        <SelectItem value="evening">Wieczorem (16:00-18:00)</SelectItem>
                        <SelectItem value="flexible">Elastycznie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <Label htmlFor="message">Dodatkowe pytania lub uwagi</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      placeholder="Opisz swoje pytania lub potrzeby..."
                      rows={4}
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    <Send className="h-4 w-4 mr-2" />
                    Wyślij formularz konsultacji
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar with Benefits */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Co zyskasz?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Spersonalizowaną strategię</div>
                      <div className="text-xs text-muted-foreground">Dobierzemy najlepszy plan do Twoich potrzeb</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Odpowiedzi na pytania</div>
                      <div className="text-xs text-muted-foreground">Wyjaśnimy wszystkie wątpliwości dotyczące platformy</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Wskazówki ekspertów</div>
                      <div className="text-xs text-muted-foreground">Praktyczne rady z branży nieruchomości</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Bez zobowiązań</div>
                      <div className="text-xs text-muted-foreground">Konsultacja jest całkowicie bezpłatna</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nasz ekspert</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="font-semibold">Marcin Kowalski</div>
                  <div className="text-sm text-muted-foreground">
                    Ekspert ds. zarządzania nieruchomościami z 10-letnim doświadczeniem w branży. 
                    Specjalizuje się w optymalizacji procesów i budowaniu efektywnej współpracy 
                    między zarządcami a wykonawcami.
                  </div>
                  <div className="flex space-x-1">
                    <Badge variant="secondary" className="text-xs">Zarządzanie</Badge>
                    <Badge variant="secondary" className="text-xs">Nieruchomości</Badge>
                    <Badge variant="secondary" className="text-xs">B2B</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpertConsultationPage;