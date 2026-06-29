import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Play, Check, Search, MessagesSquare, FileText, Star, Shield, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useUserProfile } from '../contexts/AuthContext';

interface TutorialPageProps {
  onBack: () => void;
  onComplete: () => void;
}

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
  actionText?: string;
}

export function TutorialPage({ onBack, onComplete }: TutorialPageProps) {
  const { user } = useUserProfile();
  const [currentStep, setCurrentStep] = useState(0);
  
  const isContractor = user?.userType === 'contractor';

  const contractorSteps: TutorialStep[] = [
    {
      title: 'Przeglądaj dostępne projekty',
      description: 'Znajdź projekty dopasowane do Twoich umiejętności',
      icon: Search,
      content: (
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Jak znaleźć idealne projekty:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Użyj filtrów aby zawęzić wyniki do Twojej specjalizacji</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Sprawdź lokalizację - znajdź projekty w swojej okolicy</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Przeczytaj szczegóły zgłoszenia przed aplikowaniem</span>
              </li>
            </ul>
          </div>
          <div className="bg-success/10 border border-success/20 p-3 rounded-lg">
            <p className="text-sm text-success-foreground">
              <strong>Wskazówka:</strong> Regularne sprawdzanie nowych zgłoszeń zwiększa Twoje szanse na znalezienie atrakcyjnych projektów.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Składaj konkurencyjne oferty',
      description: 'Wyróżnij się w procesie przetargowym',
      icon: FileText,
      content: (
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Elementy skutecznej oferty:</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>Szczegółowy kosztorys</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>Realistyczny harmonogram</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>Opis doświadczenia</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>Portfolio podobnych prac</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>Gwarancje i ubezpieczenia</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>Konkurencyjna cena</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-warning/10 border border-warning/20 p-3 rounded-lg">
            <p className="text-sm text-warning-foreground">
              <strong>Pamiętaj:</strong> Jakość oferty jest często ważniejsza niż najniższa cena. Zarządcy szukają niezawodnych partnerów.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Komunikuj się profesjonalnie',
      description: 'Buduj dobre relacje z zarządcami',
      icon: MessagesSquare,
      content: (
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Zasady dobrej komunikacji:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Odpowiadaj szybko na wiadomości i pytania</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Zadawaj pytania doprecyzowujące przed złożeniem oferty</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Informuj o postępach prac regularnie</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Dokumentuj wykonane prace zdjęciami</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: 'Zbieraj pozytywne opinie',
      description: 'Buduj swoją reputację na platformie',
      icon: Star,
      content: (
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Jak zdobywać 5-gwiazdkowe opinie:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start space-x-2">
                <Star className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <span>Dotrzymuj terminów realizacji projektów</span>
              </li>
              <li className="flex items-start space-x-2">
                <Star className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <span>Wykonuj prace zgodnie z ustaleniami</span>
              </li>
              <li className="flex items-start space-x-2">
                <Star className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <span>Pozostaw miejsce pracy w czystości</span>
              </li>
              <li className="flex items-start space-x-2">
                <Star className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <span>Oferuj gwarancję na wykonane prace</span>
              </li>
            </ul>
          </div>
          <div className="bg-info/10 border border-info/20 p-3 rounded-lg">
            <p className="text-sm text-info-foreground">
              <strong>Ważne:</strong> Pozytywne opinie to klucz do otrzymywania lepszych zgłoszeń i wyższych stawek w przyszłości.
            </p>
          </div>
        </div>
      )
    }
  ];

  const managerSteps: TutorialStep[] = [
    {
      title: 'Publikuj szczegółowe zgłoszenia',
      description: 'Opisz dokładnie zakres prac i wymagania',
      icon: FileText,
      content: (
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Co zawrzeć w zgłoszeniu:</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>Dokładny opis prac</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>Termin realizacji</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>Budżet orientacyjny</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>Wymagane certyfikaty</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>Lokalizacja i dostęp</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>Osoba kontaktowa</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-success/10 border border-success/20 p-3 rounded-lg">
            <p className="text-sm text-success-foreground">
              <strong>Wskazówka:</strong> Im bardziej szczegółowe zgłoszenie, tym dokładniejsze oferty otrzymasz od wykonawców.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Oceniaj oferty kompleksowo',
      description: 'Wybieraj wykonawców na podstawie różnych kryteriów',
      icon: Search,
      content: (
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Kryteria oceny ofert:</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-card rounded">
                <span className="text-sm">Cena</span>
                <Badge variant="secondary">30%</Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-card rounded">
                <span className="text-sm">Doświadczenie i opinie</span>
                <Badge variant="secondary">25%</Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-card rounded">
                <span className="text-sm">Terminowość</span>
                <Badge variant="secondary">20%</Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-card rounded">
                <span className="text-sm">Jakość portfolio</span>
                <Badge variant="secondary">15%</Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-card rounded">
                <span className="text-sm">Certyfikaty i ubezpieczenia</span>
                <Badge variant="secondary">10%</Badge>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Zarządzaj projektami aktywnie',
      description: 'Monitoruj postępy i komunikuj się z wykonawcami',
      icon: MessagesSquare,
      content: (
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Dobre praktyki zarządzania:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Ustal jasne milestones z terminami kontrolnymi</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Wymagaj regularnych raportów z postępów</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Dokumentuj wszystkie zmiany w projekcie</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span>Przeprowadzaj odbiory częściowe</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: 'Buduj bazę zaufanych wykonawców',
      description: 'Oceniaj i polecaj najlepszych partnerów',
      icon: Users,
      content: (
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Korzyści z budowania relacji:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start space-x-2">
                <Shield className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span>Szybsze realizacje przyszłych projektów</span>
              </li>
              <li className="flex items-start space-x-2">
                <Shield className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span>Lepsze ceny dla stałych klientów</span>
              </li>
              <li className="flex items-start space-x-2">
                <Shield className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span>Priorytetowe traktowanie pilnych napraw</span>
              </li>
              <li className="flex items-start space-x-2">
                <Shield className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span>Rekomendacje dla innych zarządców</span>
              </li>
            </ul>
          </div>
          <div className="bg-info/10 border border-info/20 p-3 rounded-lg">
            <p className="text-sm text-info-foreground">
              <strong>Pamiętaj:</strong> Uczciwe opinie pomagają całej społeczności w znalezieniu najlepszych wykonawców.
            </p>
          </div>
        </div>
      )
    }
  ];

  const steps = isContractor ? contractorSteps : managerSteps;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-3 mb-4">
            <div className="bg-primary w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
              <Play className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Przewodnik Domio</h1>
              <p className="text-lg text-muted-foreground">
                {isContractor ? 'Dla wykonawców' : 'Dla zarządców nieruchomości'}
              </p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
              Wróć do poprzedniego ekranu
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Krok {currentStep + 1} z {steps.length}</span>
            <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <Progress value={((currentStep + 1) / steps.length) * 100} className="h-2" />
        </div>

        {/* Current Step */}
        <Card className="bg-card/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <currentStepData.icon className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
            <CardDescription className="text-lg">
              {currentStepData.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentStepData.content}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Wstecz
          </Button>

          <div className="flex space-x-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep 
                    ? 'bg-primary' 
                    : index < currentStep 
                      ? 'bg-success' 
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <Button onClick={handleNext} className="bg-primary hover:bg-primary/90">
            {currentStep === steps.length - 1 ? (
              <>
                Zakończ
                <Check className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Dalej
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Skip option */}
        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={onComplete}
            className="text-muted-foreground hover:text-foreground"
          >
            Przejdź do platformy bez przewodnika
          </Button>
        </div>
      </div>
    </div>
  );
};