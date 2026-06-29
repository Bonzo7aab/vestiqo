import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { 
  Upload, 
  X, 
  FileText, 
  Image, 
  AlertCircle, 
  CheckCircle,
  Calculator,
} from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { useUserProfile } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface JobApplicationFormProps {
  jobId: string;
  jobTitle: string;
  jobCategory: string;
  estimatedBudget?: string;
  onClose: () => void;
  onSubmit: (application: JobApplication) => void;
}

interface JobApplication {
  id: string;
  jobId: string;
  contractorId: string;
  contractorName: string;
  contractorCompany: string;
  proposedPrice: number;
  proposedTimeline: string;
  coverLetter: string;
  experience: string;
  teamSize: number;
  availableFrom: string;
  guaranteePeriod: string;
  attachments: ApplicationAttachment[];
  certificates: string[];
  status: 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected';
  submittedAt: Date;
  lastUpdated: Date;
}

interface ApplicationAttachment {
  id: string;
  name: string;
  type: 'portfolio' | 'certificate' | 'reference' | 'other';
  url: string;
  size: number;
}

export const JobApplicationForm: React.FC<JobApplicationFormProps> = ({
  jobId,
  jobTitle,
  jobCategory,
  estimatedBudget,
  onClose,
  onSubmit
}) => {
  const { user } = useUserProfile();
  const [formData, setFormData] = useState({
    proposedPrice: '',
    proposedTimeline: '',
    coverLetter: '',
    experience: '',
    teamSize: '1',
    availableFrom: '',
    guaranteePeriod: '12'
  });
  const [attachments, setAttachments] = useState<ApplicationAttachment[]>([]);
  const [selectedCertificates, setSelectedCertificates] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock certificates based on job category
  const availableCertificates = {
    'Utrzymanie Czystości i Zieleni': [
      'Certyfikat DDD',
      'ISO 9001 - Systemy zarządzania jakością',
      'Certyfikat pielęgnacji zieleni',
      'Uprawnienia pestycydowe'
    ],
    'Roboty Remontowo-Budowlane': [
      'Uprawnienia budowlane',
      'Certyfikat monterski',
      'ISO 14001 - Systemy zarządzania środowiskowego',
      'Certyfikat spawalniczy'
    ],
    'Instalacje i systemy': [
      'Uprawnienia SEP do 1kV',
      'Uprawnienia hydrauliczne',
      'Certyfikat instalatorski',
      'Uprawnienia gazowe G1'
    ],
    'Utrzymanie techniczne i konserwacja': [
      'Certyfikat UDT',
      'Uprawnienia windowe',
      'ISO 9001',
      'Certyfikat serwisowy'
    ],
    'Specjalistyczne usługi': [
      'Licencja agencji ochrony',
      'Certyfikat DDD',
      'Pozwolenie na biocydy',
      'Certyfikat monitoringu'
    ]
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const attachment: ApplicationAttachment = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type.startsWith('image/') ? 'portfolio' : 'other',
        url: URL.createObjectURL(file), // In real app, upload to server
        size: file.size
      };
      setAttachments(prev => [...prev, attachment]);
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const toggleCertificate = (cert: string) => {
    setSelectedCertificates(prev => 
      prev.includes(cert) 
        ? prev.filter(c => c !== cert)
        : [...prev, cert]
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.proposedPrice) {
      newErrors.proposedPrice = 'Podaj proponowaną cenę';
    } else if (isNaN(Number(formData.proposedPrice)) || Number(formData.proposedPrice) <= 0) {
      newErrors.proposedPrice = 'Podaj prawidłową kwotę';
    }

    if (!formData.proposedTimeline) {
      newErrors.proposedTimeline = 'Podaj przewidywany czas realizacji';
    }

    if (!formData.coverLetter || formData.coverLetter.length < 50) {
      newErrors.coverLetter = 'List motywacyjny musi mieć min. 50 znaków';
    }

    if (!formData.experience) {
      newErrors.experience = 'Opisz swoje doświadczenie';
    }

    if (!formData.availableFrom) {
      newErrors.availableFrom = 'Podaj datę dostępności';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Wypełnij wszystkie wymagane pola');
      return;
    }

    setIsSubmitting(true);

    try {
      const application: JobApplication = {
        id: Math.random().toString(36).substr(2, 9),
        jobId,
        contractorId: user?.id || '',
        contractorName: user ? `${user.firstName} ${user.lastName}` : '',
        contractorCompany: user?.company || '',
        proposedPrice: Number(formData.proposedPrice),
        proposedTimeline: formData.proposedTimeline,
        coverLetter: formData.coverLetter,
        experience: formData.experience,
        teamSize: Number(formData.teamSize),
        availableFrom: formData.availableFrom,
        guaranteePeriod: formData.guaranteePeriod,
        attachments,
        certificates: selectedCertificates,
        status: 'submitted',
        submittedAt: new Date(),
        lastUpdated: new Date()
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onSubmit(application);
      toast.success('Aplikacja została wysłana pomyślnie!');
      onClose();
    } catch {
      toast.error('Wystąpił błąd podczas wysyłania aplikacji');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Aplikuj na zgłoszenie</h2>
            <p className="text-gray-600 mt-1">{jobTitle}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Podstawowe informacje o ofercie */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Szczegóły oferty
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="proposedPrice">Proponowana cena (zł) *</Label>
                    <Input
                      id="proposedPrice"
                      type="number"
                      placeholder="np. 5000"
                      value={formData.proposedPrice}
                      onChange={(e) => handleInputChange('proposedPrice', e.target.value)}
                      className={errors.proposedPrice ? 'border-red-500' : ''}
                    />
                    {errors.proposedPrice && (
                      <p className="text-red-500 text-sm mt-1">{errors.proposedPrice}</p>
                    )}
                    {estimatedBudget && (
                      <p className="text-gray-500 text-sm mt-1">
                        Budżet organizatora: {estimatedBudget}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="proposedTimeline">Czas realizacji *</Label>
                    <Select onValueChange={(value) => handleInputChange('proposedTimeline', value)}>
                      <SelectTrigger className={errors.proposedTimeline ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Wybierz czas realizacji" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-3 dni">1-3 dni</SelectItem>
                        <SelectItem value="1 tydzień">1 tydzień</SelectItem>
                        <SelectItem value="2 tygodnie">2 tygodnie</SelectItem>
                        <SelectItem value="1 miesiąc">1 miesiąc</SelectItem>
                        <SelectItem value="2-3 miesiące">2-3 miesiące</SelectItem>
                        <SelectItem value="więcej niż 3 miesiące">Więcej niż 3 miesiące</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.proposedTimeline && (
                      <p className="text-red-500 text-sm mt-1">{errors.proposedTimeline}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="teamSize">Wielkość zespołu</Label>
                    <Select onValueChange={(value) => handleInputChange('teamSize', value)} defaultValue="1">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 osoba</SelectItem>
                        <SelectItem value="2-3">2-3 osoby</SelectItem>
                        <SelectItem value="4-5">4-5 osób</SelectItem>
                        <SelectItem value="6+">6+ osób</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="availableFrom">Dostępność od *</Label>
                    <Input
                      id="availableFrom"
                      type="date"
                      value={formData.availableFrom}
                      onChange={(e) => handleInputChange('availableFrom', e.target.value)}
                      className={errors.availableFrom ? 'border-red-500' : ''}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.availableFrom && (
                      <p className="text-red-500 text-sm mt-1">{errors.availableFrom}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="guaranteePeriod">Gwarancja (miesiące)</Label>
                    <Select onValueChange={(value) => handleInputChange('guaranteePeriod', value)} defaultValue="12">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 miesięcy</SelectItem>
                        <SelectItem value="12">12 miesięcy</SelectItem>
                        <SelectItem value="24">24 miesiące</SelectItem>
                        <SelectItem value="36">36 miesięcy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* List motywacyjny */}
            <Card>
              <CardHeader>
                <CardTitle>List motywacyjny *</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Opisz dlaczego jesteś idealnym kandydatem do tego zgłoszenia. Uwzględnij swoje doświadczenie, podejście do pracy i to co wyróżnia Cię na tle konkurencji..."
                  value={formData.coverLetter}
                  onChange={(e) => handleInputChange('coverLetter', e.target.value)}
                  className={`min-h-[120px] ${errors.coverLetter ? 'border-red-500' : ''}`}
                />
                <div className="flex justify-between items-center mt-2">
                  {errors.coverLetter && (
                    <p className="text-red-500 text-sm">{errors.coverLetter}</p>
                  )}
                  <p className="text-gray-500 text-sm ml-auto">
                    {formData.coverLetter.length}/500 znaków
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Doświadczenie */}
            <Card>
              <CardHeader>
                <CardTitle>Doświadczenie w podobnych projektach *</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Opisz swoje doświadczenie w podobnych projektach. Podaj konkretne przykłady realizacji, osiągnięte rezultaty i referencje..."
                  value={formData.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  className={`min-h-[100px] ${errors.experience ? 'border-red-500' : ''}`}
                />
                {errors.experience && (
                  <p className="text-red-500 text-sm mt-2">{errors.experience}</p>
                )}
              </CardContent>
            </Card>

            {/* Certyfikaty */}
            <Card>
              <CardHeader>
                <CardTitle>Posiadane certyfikaty i uprawnienia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {availableCertificates[jobCategory as keyof typeof availableCertificates]?.map((cert) => (
                    <div
                      key={cert}
                      onClick={() => toggleCertificate(cert)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedCertificates.includes(cert)
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {selectedCertificates.includes(cert) && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                        <span className="text-sm">{cert}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedCertificates.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Wybrane certyfikaty:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedCertificates.map((cert) => (
                        <Badge key={cert} variant="secondary" className="text-xs">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Załączniki */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Załączniki (portfolio, referencje, certyfikaty)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">
                      Kliknij aby dodać pliki lub przeciągnij je tutaj
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Obsługiwane formaty: JPG, PNG, PDF, DOC, DOCX (max 10MB)
                    </p>
                  </Label>
                </div>

                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {attachment.type === 'portfolio' ? (
                            <Image className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="text-sm">{attachment.name}</span>
                          <span className="text-xs text-gray-500">
                            ({formatFileSize(attachment.size)})
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(attachment.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Podsumowanie */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Po wysłaniu aplikacji otrzymasz potwierdzenie na e-mail. Zarządca będzie mógł 
                skontaktować się z Tobą w ciągu 48 godzin. Możesz śledzić status swojej aplikacji 
                w panelu wykonawcy.
              </AlertDescription>
            </Alert>
          </form>
        </div>

        {/* Footer z przyciskami */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Anuluj
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2" />
                Wysyłanie...
              </>
            ) : (
              'Wyślij aplikację'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JobApplicationForm;