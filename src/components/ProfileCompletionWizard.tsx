import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, MapPin, Award, Shield, Building } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { useUserProfile } from '../contexts/AuthContext';
import { updateUserAction } from '../lib/auth/actions';
import { createClient } from '../lib/supabase/client';
import { fetchUserPrimaryCompany, upsertUserCompany } from '../lib/database/companies';
import { toast } from 'sonner';

interface ProfileCompletionWizardProps {
  onComplete: () => void;
  onBack: () => void;
  onVerificationClick?: () => void;
}

interface ProfileData {
  // Basic info
  companyName: string;
  description: string;
  website: string;
  phone: string;
  
  // Address
  street: string;
  city: string;
  postalCode: string;
  voivodeship: string;
  
  // Services (for contractors)
  selectedServices: string[];
  experience: string;
  teamSize: string;
  
  // Certifications
  certifications: string[];
  customCertification: string;
  insurance: boolean;
  
  // Portfolio
  portfolioDescription: string;
  
  // Manager specific
  managedProperties: string;
  propertyTypes: string[];
}

export const ProfileCompletionWizard: React.FC<ProfileCompletionWizardProps> = ({ 
  onComplete, 
  onBack,
  onVerificationClick 
}) => {
  const { user } = useUserProfile();
  const [currentStep, setCurrentStep] = useState(1);
  const [profileData, setProfileData] = useState<ProfileData>({
    companyName: user?.company || '',
    description: '',
    website: '',
    phone: user?.phone || '',
    street: '',
    city: '',
    postalCode: '',
    voivodeship: '',
    selectedServices: [],
    experience: '',
    teamSize: '',
    certifications: [],
    customCertification: '',
    insurance: false,
    portfolioDescription: '',
    managedProperties: '',
    propertyTypes: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [_isLoadingCompany, setIsLoadingCompany] = useState(true);

  // Fetch and pre-fill company data
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!user?.id) {
        setIsLoadingCompany(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data: company, error } = await fetchUserPrimaryCompany(supabase, user.id);

        if (error || !company) {
          setIsLoadingCompany(false);
          return;
        }

        // Pre-fill form fields with existing company data
        setProfileData(prev => ({
          ...prev,
          companyName: company.name || prev.companyName,
          description: company.description || prev.description,
          website: company.website || prev.website,
          phone: company.phone || prev.phone || user?.phone || '',
          street: company.address || prev.street,
          city: company.city || prev.city,
          postalCode: company.postal_code || prev.postalCode,
          // Note: voivodeship is not stored in companies table, so we keep the default
        }));
      } catch (err) {
        console.error('Error loading company data:', err);
      } finally {
        setIsLoadingCompany(false);
      }
    };

    loadCompanyData();
  }, [user?.id, user?.phone]);

  const isContractor = user?.userType === 'contractor';
  const totalSteps = isContractor ? 5 : 3;

  const serviceCategories = [
    'Utrzymanie Czystości i Zieleni',
    'Roboty Remontowo-Budowlane', 
    'Instalacje i systemy',
    'Utrzymanie techniczne i konserwacja',
    'Specjalistyczne usługi'
  ];

  const propertyTypes = [
    'Spółdzielnie mieszkaniowe',
    'Wspólnoty mieszkaniowe', 
    'Budynki komercyjne',
    'Obiekty użyteczności publicznej',
    'Kompleksy mieszkaniowe'
  ];

  const availableCertifications = [
    'ISO 9001:2015 (Systemy zarządzania jakością)',
    'ISO 14001:2015 (Systemy zarządzania środowiskowego)',
    'ISO 45001:2018 (Bezpieczeństwo i higiena pracy)',
    'Certyfikat energetyczny budynków',
    'Uprawnienia budowlane',
    'SEP do 1kV (Stowarzyszenie Elektryków Polskich)',
    'SEP powyżej 1kV',
    'Gazowe G1, G2, G3',
    'Installer fotowoltaiki',
    'Certyfikat instalatora pomp ciepła',
    'Uprawnienia spawalnicze',
    'Certyfikat BHP',
    'Certyfikat pierwszej pomocy',
    'Certyfikat pracy na wysokości',
    'Uprawnienia UDT (dźwigi, wózki widłowe)',
    'Certyfikat konserwatora zabytków',
    'Certyfikat rzeczoznawcy budowlanego'
  ];

  const voivodeships = [
    'dolnośląskie', 'kujawsko-pomorskie', 'lubelskie', 'lubuskie',
    'łódzkie', 'małopolskie', 'mazowieckie', 'opolskie',
    'podkarpackie', 'podlaskie', 'pomorskie', 'śląskie',
    'świętokrzyskie', 'warmińsko-mazurskie', 'wielkopolskie', 'zachodniopomorskie'
  ];

  const handleInputChange = (field: keyof ProfileData, value: string | string[] | boolean) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Basic Info
        if (!profileData.companyName.trim()) {
          newErrors.companyName = 'Nazwa firmy jest wymagana';
        }
        if (!profileData.description.trim()) {
          newErrors.description = 'Opis firmy jest wymagany';
        }
        if (!profileData.phone.trim()) {
          newErrors.phone = 'Telefon jest wymagany';
        }
        break;
        
      case 2: // Address
        if (!profileData.street.trim()) newErrors.street = 'Ulica jest wymagana';
        if (!profileData.city.trim()) newErrors.city = 'Miasto jest wymagane';
        if (!profileData.postalCode.trim()) newErrors.postalCode = 'Kod pocztowy jest wymagany';
        if (!profileData.voivodeship.trim()) newErrors.voivodeship = 'Województwo jest wymagane';
        break;
        
      case 3: // Services/Properties
        if (isContractor) {
          if (profileData.selectedServices.length === 0) {
            newErrors.selectedServices = 'Wybierz co najmniej jedną kategorię usług';
          }
          if (!profileData.experience.trim()) {
            newErrors.experience = 'Doświadczenie jest wymagane';
          }
        } else {
          if (profileData.propertyTypes.length === 0) {
            newErrors.propertyTypes = 'Wybierz co najmniej jeden typ nieruchomości';
          }
        }
        break;
        
      case 4: // Certifications (contractors) or Verification (managers)
        if (isContractor && !profileData.insurance) {
          newErrors.insurance = 'Potwierdzenie ubezpieczenia jest wymagane';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }
    if (!isContractor && currentStep === 3) {
      void handleComplete();
      return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      void handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!user?.id) {
      await updateUserAction({
        phone: profileData.phone,
        profile_completed: true
      });
      onComplete();
      return;
    }

    try {
      const supabase = createClient();
      const { data: company, error: companyFetchError } = await fetchUserPrimaryCompany(supabase, user.id);

      if (companyFetchError) {
        console.error('Error loading company before profile save:', companyFetchError);
      }

      if (company) {
        const companyRow = company as typeof company & { is_public?: boolean };
        const { error: upsertError } = await upsertUserCompany(supabase, user.id, {
          name: profileData.companyName.trim(),
          type: company.type,
          phone: profileData.phone.trim(),
          email: (company.email?.trim() || user.email?.trim() || '').trim() || undefined,
          address: profileData.street.trim(),
          city: profileData.city.trim(),
          postal_code: profileData.postalCode.trim(),
          nip: (company.nip || '').trim() || undefined,
          regon: company.regon || undefined,
          krs: company.krs || undefined,
          website: profileData.website.trim() || company.website || undefined,
          founded_year: company.founded_year ?? undefined,
          employee_count: company.employee_count || undefined,
          description: profileData.description.trim(),
          is_public: companyRow.is_public !== false,
        });

        if (upsertError) {
          console.error('Failed to save company from profile wizard:', upsertError);
          toast.error('Nie udało się zapisać danych adresowych firmy (w tym kodu pocztowego). Spróbuj ponownie lub uzupełnij dane w zakładce Firma w koncie.');
          return;
        }
      }
    } catch (err) {
      console.error('Error saving company from profile wizard:', err);
      toast.error('Nie udało się zapisać danych firmy. Spróbuj ponownie.');
      return;
    }

    await updateUserAction({
      phone: profileData.phone,
      profile_completed: true
    });

    onComplete();
  };

  const handleServiceToggle = (service: string) => {
    const updatedServices = profileData.selectedServices.includes(service)
      ? profileData.selectedServices.filter(s => s !== service)
      : [...profileData.selectedServices, service];
    
    handleInputChange('selectedServices', updatedServices);
  };

  const handlePropertyTypeToggle = (type: string) => {
    const updatedTypes = profileData.propertyTypes.includes(type)
      ? profileData.propertyTypes.filter(t => t !== type)
      : [...profileData.propertyTypes, type];
    
    handleInputChange('propertyTypes', updatedTypes);
  };

  const handleCertificationToggle = (certification: string) => {
    const updatedCertifications = profileData.certifications.includes(certification)
      ? profileData.certifications.filter(c => c !== certification)
      : [...profileData.certifications, certification];
    
    handleInputChange('certifications', updatedCertifications);
  };

  const handleAddCustomCertification = () => {
    if (profileData.customCertification.trim() && !profileData.certifications.includes(profileData.customCertification.trim())) {
      const updatedCertifications = [...profileData.certifications, profileData.customCertification.trim()];
      handleInputChange('certifications', updatedCertifications);
      handleInputChange('customCertification', '');
    }
  };

  const handleRemoveCertification = (certification: string) => {
    const updatedCertifications = profileData.certifications.filter(c => c !== certification);
    handleInputChange('certifications', updatedCertifications);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Building className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-xl font-semibold">Podstawowe informacje o firmie</h3>
              <p className="text-muted-foreground">
                Podaj podstawowe dane swojej {isContractor ? 'firmy wykonawczej' : 'firmy zarządzającej'}
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nazwa firmy *</Label>
                <Input
                  id="companyName"
                  value={profileData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder={isContractor ? 'Firma Budowlana ABC' : 'Zarząd Nieruchomości XYZ'}
                />
                {errors.companyName && (
                  <p className="text-sm text-destructive">{errors.companyName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Opis firmy *</Label>
                <Textarea
                  id="description"
                  value={profileData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder={
                    isContractor 
                      ? 'Opisz swoją firmę, specjalizację i doświadczenie...'
                      : 'Opisz swoją firmę i zarządzane nieruchomości...'
                  }
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon *</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+48 123 456 789"
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Strona internetowa</Label>
                  <Input
                    id="website"
                    value={profileData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://twoja-firma.pl"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <MapPin className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-xl font-semibold">Adres firmy</h3>
              <p className="text-muted-foreground">
                Podaj adres siedziby firmy - pomoże to klientom znaleźć Cię w okolicy
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">Ulica i numer *</Label>
                <Input
                  id="street"
                  value={profileData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  placeholder="ul. Przykładowa 123"
                />
                {errors.street && (
                  <p className="text-sm text-destructive">{errors.street}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Miasto *</Label>
                  <Input
                    id="city"
                    value={profileData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Warszawa"
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive">{errors.city}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">Kod pocztowy *</Label>
                  <Input
                    id="postalCode"
                    value={profileData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    placeholder="00-000"
                  />
                  {errors.postalCode && (
                    <p className="text-sm text-destructive">{errors.postalCode}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="voivodeship">Województwo *</Label>
                <select
                  id="voivodeship"
                  value={profileData.voivodeship}
                  onChange={(e) => handleInputChange('voivodeship', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-card"
                >
                  <option value="">Wybierz województwo</option>
                  {voivodeships.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                {errors.voivodeship && (
                  <p className="text-sm text-destructive">{errors.voivodeship}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {isContractor ? (
              <>
                <div className="text-center space-y-2">
                  <Award className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">Usługi i doświadczenie</h3>
                  <p className="text-muted-foreground">
                    Wybierz kategorie usług i opisz swoje doświadczenie
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label>Kategorie usług *</Label>
                    <div className="grid gap-3">
                      {serviceCategories.map(service => (
                        <div key={service} className="flex items-center space-x-2">
                          <Checkbox
                            id={service}
                            checked={profileData.selectedServices.includes(service)}
                            onCheckedChange={() => handleServiceToggle(service)}
                          />
                          <Label htmlFor={service} className="cursor-pointer">
                            {service}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {errors.selectedServices && (
                      <p className="text-sm text-destructive">{errors.selectedServices}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="experience">Lata doświadczenia *</Label>
                      <Input
                        id="experience"
                        value={profileData.experience}
                        onChange={(e) => handleInputChange('experience', e.target.value)}
                        placeholder="5 lat"
                      />
                      {errors.experience && (
                        <p className="text-sm text-destructive">{errors.experience}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="teamSize">Wielkość zespołu</Label>
                      <Input
                        id="teamSize"
                        value={profileData.teamSize}
                        onChange={(e) => handleInputChange('teamSize', e.target.value)}
                        placeholder="10 osób"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <Building className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">Zarządzane nieruchomości</h3>
                  <p className="text-muted-foreground">
                    Opisz typy nieruchomości, którymi zarządzasz
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label>Typy nieruchomości *</Label>
                    <div className="grid gap-3">
                      {propertyTypes.map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={type}
                            checked={profileData.propertyTypes.includes(type)}
                            onCheckedChange={() => handlePropertyTypeToggle(type)}
                          />
                          <Label htmlFor={type} className="cursor-pointer">
                            {type}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {errors.propertyTypes && (
                      <p className="text-sm text-destructive">{errors.propertyTypes}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="managedProperties">Liczba zarządzanych nieruchomości</Label>
                    <Input
                      id="managedProperties"
                      value={profileData.managedProperties}
                      onChange={(e) => handleInputChange('managedProperties', e.target.value)}
                      placeholder="50 budynków"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {isContractor ? (
              <>
                <div className="text-center space-y-2">
                  <Award className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">Certyfikaty i ubezpieczenia</h3>
                  <p className="text-muted-foreground">
                    Potwierdź swoje kwalifikacje i ubezpieczenia
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label>Posiadane certyfikaty i uprawnienia</Label>
                    <p className="text-sm text-muted-foreground">
                      Wybierz certyfikaty które posiadasz. Pomogą one w budowaniu zaufania klientów.
                    </p>
                    
                    {/* Available certifications */}
                    <div className="grid gap-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                      {availableCertifications.map(cert => (
                        <div key={cert} className="flex items-center space-x-2">
                          <Checkbox
                            id={cert}
                            checked={profileData.certifications.includes(cert)}
                            onCheckedChange={() => handleCertificationToggle(cert)}
                          />
                          <Label htmlFor={cert} className="cursor-pointer text-sm leading-5">
                            {cert}
                          </Label>
                        </div>
                      ))}
                    </div>

                    {/* Custom certification input */}
                    <div className="space-y-2">
                      <Label htmlFor="customCert">Dodaj własny certyfikat</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="customCert"
                          value={profileData.customCertification}
                          onChange={(e) => handleInputChange('customCertification', e.target.value)}
                          placeholder="Wpisz nazwę certyfikatu..."
                        />
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={handleAddCustomCertification}
                          disabled={!profileData.customCertification.trim()}
                        >
                          Dodaj
                        </Button>
                      </div>
                    </div>

                    {/* Selected certifications */}
                    {profileData.certifications.length > 0 && (
                      <div className="space-y-2">
                        <Label>Wybrane certyfikaty:</Label>
                        <div className="flex flex-wrap gap-2">
                          {profileData.certifications.map(cert => (
                            <Badge key={cert} variant="secondary" className="pr-1">
                              {cert}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleRemoveCertification(cert)}
                              >
                                ×
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="insurance"
                          checked={profileData.insurance}
                          onCheckedChange={(checked) => handleInputChange('insurance', !!checked)}
                        />
                        <Label htmlFor="insurance" className="cursor-pointer">
                          Potwierdzam posiadanie aktualnego ubezpieczenia OC *
                        </Label>
                      </div>
                      {errors.insurance && (
                        <p className="text-sm text-destructive">{errors.insurance}</p>
                      )}
                    </div>

                    <Alert>
                      <AlertDescription>
                        <strong>Informacja RODO:</strong> Dokumenty potwierdzające certyfikaty i ubezpieczenia 
                        przetwarzamy w celu weryfikacji kwalifikacji i budowania zaufania na platformie. 
                        Przesłanie dokumentów jest dobrowolne - możesz korzystać z platformy bez weryfikacji, 
                        ale zweryfikowane konto otrzymuje więcej zgłoszeń.{' '}
                        <Link href="/polityka-prywatnosci" className="text-blue-600 hover:underline font-medium">
                          Więcej informacji w Polityce prywatności
                        </Link>.
                      </AlertDescription>
                    </Alert>
                    
                    <Alert variant="destructive">
                      <AlertDescription>
                        <strong>Bezpieczeństwo danych:</strong> Wszystkie przesłane dokumenty są szyfrowane 
                        i przechowywane zgodnie z najwyższymi standardami bezpieczeństwa. 
                        Dostęp mają tylko upoważnieni pracownicy do celów weryfikacji.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <Check className="h-12 w-12 text-success mx-auto" />
                  <h3 className="text-xl font-semibold">Profil gotowy!</h3>
                  <p className="text-muted-foreground">
                    Twój profil zarządcy został uzupełniony
                  </p>
                </div>
                
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      <strong>Weryfikacja konta zarządcy:</strong> Aby zwiększyć zaufanie wykonawców, 
                      możesz zweryfikować swoją firmę przesyłając dokumenty potwierdzające 
                      uprawnienia do zarządzania nieruchomościami.
                    </AlertDescription>
                  </Alert>

                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <h4 className="font-medium">Dokumenty do weryfikacji (opcjonalnie):</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Wypis z KRS/CEIDG</li>
                      <li>• Umowy zarządzania nieruchomościami</li>
                      <li>• Certyfikat zarządcy nieruchomości</li>
                      <li>• Ubezpieczenie OC zarządcy</li>
                    </ul>
                  </div>

                  <Alert variant="destructive">
                    <AlertDescription>
                      <strong>Ochrona danych:</strong> Wszystkie dokumenty są przetwarzane zgodnie z RODO. 
                      Weryfikacja jest dobrowolna, ale zweryfikowani zarządcy otrzymują więcej ofert od wykonawców.{' '}
                      <Link href="/polityka-prywatnosci" className="text-blue-600 hover:underline font-medium">
                        Więcej informacji w Polityce prywatności
                      </Link>.
                    </AlertDescription>
                  </Alert>

                  {onVerificationClick && (
                    <div className="flex justify-center pt-4">
                      <Button variant="outline" onClick={onVerificationClick}>
                        <Shield className="h-4 w-4 mr-2" />
                        Rozpocznij weryfikację teraz
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );

      case 5: // Only for contractors
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Check className="h-12 w-12 text-success mx-auto" />
              <h3 className="text-xl font-semibold">Profil gotowy!</h3>
              <p className="text-muted-foreground">
                Twój profil wykonawcy został uzupełniony
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="portfolioDescription">Opis portfolio (opcjonalnie)</Label>
              <Textarea
                id="portfolioDescription"
                value={profileData.portfolioDescription}
                onChange={(e) => handleInputChange('portfolioDescription', e.target.value)}
                placeholder="Opisz swoje najważniejsze projekty i osiągnięcia..."
                rows={4}
              />
            </div>

            <Alert>
              <AlertDescription>
                Możesz teraz rozpocząć aplikowanie o projekty! 
                Pamiętaj o regularnym aktualizowaniu swojego profilu i portfolio.
              </AlertDescription>
            </Alert>

            {onVerificationClick && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={onVerificationClick}>
                  <Shield className="h-4 w-4 mr-2" />
                  Zweryfikuj konto teraz
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="hidden md:flex">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
          <div className="text-center">
            <div className="inline-flex items-center space-x-2">
              <Building className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold text-primary">Urbi.eu</span>
            </div>
          </div>
          <div className="w-20"></div> {/* Spacer */}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Krok {currentStep} z {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
        </div>

        {/* Content */}
        <Card>
          <CardContent className="pt-6">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(currentStep - 1)}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Wstecz
          </Button>
          <Button onClick={handleNext}>
            {currentStep === totalSteps ? 'Zakończ' : 'Dalej'}
            {currentStep < totalSteps && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
};