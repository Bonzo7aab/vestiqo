import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { 
  Users, 
  Eye, 
  CheckCircle, 
  XCircle, 
  MessagesSquare,
  Download,
  Star,
  MapPin,
  Clock,
  Euro,
  Calendar,
  Shield,
  Award,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { Application as JobApplication } from '../types';
import { ServiceReviewDialog } from './reviews/ServiceReviewDialog';

// JobApplication type now imported from centralized types folder

interface JobApplicationsListProps {
  jobId: string;
  jobTitle: string;
  jobBudget?: string;
  /** When `completed`, manager can rate accepted contractor service. */
  jobStatus?: string;
  applications: JobApplication[];
  onStatusChange: (applicationId: string, status: string, notes?: string) => void;
  onStartConversation: (contractorId: string, applicationId: string) => void;
}

export const JobApplicationsList: React.FC<JobApplicationsListProps> = ({
  jobId,
  jobTitle,
  jobBudget,
  jobStatus,
  applications,
  onStatusChange,
  onStartConversation
}) => {
  const [selectedTab, setSelectedTab] = useState('all');
  const [reviewingApplicationId, setReviewingApplicationId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedContractorForReview, setSelectedContractorForReview] = useState<{
    companyId: string;
    name: string;
  } | null>(null);

  const canRateService = jobStatus === 'completed';

  // Filtrowanie aplikacji według statusu
  const filteredApplications = applications.filter(app => {
    switch (selectedTab) {
      case 'pending':
        return app.status === 'submitted';
      case 'under_review':
        return app.status === 'under_review';
      case 'accepted':
        return app.status === 'accepted';
      case 'rejected':
        return app.status === 'rejected';
      case 'cancelled':
        return app.status === 'cancelled';
      default:
        return true;
    }
  });

  // Statystyki aplikacji
  const stats = {
    total: applications.length,
    pending: applications.filter(app => app.status === 'submitted').length,
    under_review: applications.filter(app => app.status === 'under_review').length,
    accepted: applications.filter(app => app.status === 'accepted').length,
    rejected: applications.filter(app => app.status === 'rejected').length,
    cancelled: applications.filter(app => app.status === 'cancelled').length
  };

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    if (newStatus === 'under_review') {
      onStatusChange(applicationId, newStatus);
      toast.success('Status oferty został zaktualizowany');
    } else {
      setReviewingApplicationId(applicationId);
    }
  };

  const confirmStatusChange = async () => {
    if (!reviewingApplicationId) return;

    const app = applications.find(a => a.id === reviewingApplicationId);
    if (!app) return;

    const status = app.status === 'under_review' ? 'accepted' : 'rejected';
    
    onStatusChange(reviewingApplicationId, status, reviewNotes);
    setReviewingApplicationId(null);
    setReviewNotes('');
    
    toast.success(
      status === 'accepted' 
        ? 'Oferta została zaakceptowana' 
        : 'Oferta została odrzucona'
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">Oferty na zgłoszenie</h2>
        <p className="text-gray-600">{jobTitle}</p>
        {jobBudget && (
          <p className="text-sm text-gray-500 mt-1">Budżet: {jobBudget}</p>
        )}
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-gray-600">Wszystkie</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Nowe</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.under_review}</div>
            <div className="text-sm text-gray-600">W ocenie</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
            <div className="text-sm text-gray-600">Zaakceptowane</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-600">Odrzucone</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.cancelled}</div>
            <div className="text-sm text-gray-600">Anulowane</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtry */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="grid w-full grid-cols-6 min-w-[600px] md:min-w-0">
            <TabsTrigger value="all" className="text-xs md:text-sm whitespace-nowrap">Wszystkie ({stats.total})</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs md:text-sm whitespace-nowrap">Nowe ({stats.pending})</TabsTrigger>
            <TabsTrigger value="under_review" className="text-xs md:text-sm whitespace-nowrap">W ocenie ({stats.under_review})</TabsTrigger>
            <TabsTrigger value="accepted" className="text-xs md:text-sm whitespace-nowrap">Zaakceptowane ({stats.accepted})</TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs md:text-sm whitespace-nowrap">Odrzucone ({stats.rejected})</TabsTrigger>
            <TabsTrigger value="cancelled" className="text-xs md:text-sm whitespace-nowrap">Anulowane ({stats.cancelled})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={selectedTab} className="mt-6">
          {filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Brak ofert w tej kategorii
                </h3>
                <p className="text-gray-500">
                  {selectedTab === 'all' 
                    ? 'Nie otrzymano jeszcze żadnych ofert na to zgłoszenie.'
                    : `Brak ofert o statusie "${selectedTab}".`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application) => (
                <Card key={application.id} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={application.contractorAvatar} />
                          <AvatarFallback>
                            {application.contractorName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{application.contractorName}</h3>
                          <p className="text-gray-600">{application.contractorCompany}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span>{application.contractorRating.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              <span>{application.contractorCompletedJobs} zgłoszeń</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{application.contractorLocation}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-left md:text-right flex-shrink-0">
                        <ApplicationStatusBadge status={application.status} />
                        <p className="text-xs md:text-sm text-gray-500 mt-1">
                          {formatDate(application.submittedAt)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Główne informacje oferty */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-lg font-semibold text-primary">
                          <Euro className="h-5 w-5" />
                          {formatPrice(application.proposedPrice)}
                        </div>
                        <p className="text-sm text-gray-600">Cena oferty</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 font-medium">
                          <Clock className="h-4 w-4" />
                          {application.proposedTimeline}
                        </div>
                        <p className="text-sm text-gray-600">Czas realizacji</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 font-medium">
                          <Calendar className="h-4 w-4" />
                          {new Date(application.availableFrom).toLocaleDateString('pl-PL')}
                        </div>
                        <p className="text-sm text-gray-600">Dostępność</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 font-medium">
                          <Shield className="h-4 w-4" />
                          {application.guaranteePeriod} mies.
                        </div>
                        <p className="text-sm text-gray-600">Gwarancja</p>
                      </div>
                    </div>

                    {/* List motywacyjny */}
                    <div>
                      <h4 className="font-medium mb-2">List motywacyjny:</h4>
                      <p className="text-foreground/80 bg-card p-3 rounded border">
                        {application.coverLetter}
                      </p>
                    </div>

                    {/* Doświadczenie */}
                    <div>
                      <h4 className="font-medium mb-2">Doświadczenie:</h4>
                      <p className="text-foreground/80 bg-card p-3 rounded border">
                        {application.experience}
                      </p>
                    </div>

                    {/* Certyfikaty */}
                    {application.certificates.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          Certyfikaty i uprawnienia:
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {application.certificates.map((cert, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Załączniki */}
                    {application.attachments.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Załączniki:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {application.attachments.map((attachment) => (
                            <Button
                              key={attachment.id}
                              variant="outline"
                              size="sm"
                              className="h-auto p-2"
                              onClick={() => window.open(attachment.url, '_blank')}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              {attachment.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notatki z oceny */}
                    {application.reviewNotes && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <h4 className="font-medium mb-1">Notatka z oceny:</h4>
                        <p className="text-sm text-gray-700">{application.reviewNotes}</p>
                      </div>
                    )}

                    {/* Akcje */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => onStartConversation(application.contractorId, application.id)}
                        className="w-full sm:w-auto"
                      >
                        <MessagesSquare className="h-4 w-4 mr-2" />
                        Napisz wiadomość
                      </Button>

                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        {application.status === 'submitted' && (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => handleStatusChange(application.id, 'under_review')}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Rozpocznij ocenę
                            </Button>
                          </>
                        )}
                        
                        {application.status === 'under_review' && (
                          <>
                            <Button
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => setReviewingApplicationId(application.id)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Odrzuć
                            </Button>
                            <Button
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => setReviewingApplicationId(application.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Zaakceptuj
                            </Button>
                          </>
                        )}
                        
                        {application.status === 'accepted' && canRateService && application.contractorCompanyId && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedContractorForReview({
                                companyId: application.contractorCompanyId!,
                                name: application.contractorCompany || application.contractorName,
                              });
                              setShowReviewForm(true);
                            }}
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Oceń Konkurs
                          </Button>
                        )}
                        {application.status === 'accepted' && !canRateService && (
                          <span className="text-xs text-muted-foreground self-center">
                            Ocena konkursu po ukończeniu zgłoszenia
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal potwierdzenia zmiany statusu */}
      {reviewingApplicationId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Potwierdź decyzję</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Czy na pewno chcesz{' '}
                {applications.find(a => a.id === reviewingApplicationId)?.status === 'under_review' 
                  ? 'zaakceptować' 
                  : 'odrzucić'
                } tę ofertę?
              </p>
              
              <div>
                <Label htmlFor="reviewNotes">Notatka (opcjonalnie):</Label>
                <Textarea
                  id="reviewNotes"
                  placeholder="Dodaj komentarz do swojej decyzji..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReviewingApplicationId(null);
                    setReviewNotes('');
                  }}
                >
                  Anuluj
                </Button>
                <Button onClick={confirmStatusChange}>
                  Potwierdź
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedContractorForReview && (
        <ServiceReviewDialog
          open={showReviewForm}
          onOpenChange={(open) => {
            setShowReviewForm(open);
            if (!open) setSelectedContractorForReview(null);
          }}
          jobId={jobId}
          contractorCompanyId={selectedContractorForReview.companyId}
          contractorName={selectedContractorForReview.name}
        />
      )}
    </div>
  );
};

export default JobApplicationsList;