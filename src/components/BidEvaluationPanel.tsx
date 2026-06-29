import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { 
  Crown, 
  Eye, 
  Download,
  Star,
  DollarSign,
  Calendar,
  Clock,
  Shield,
  Award,
  FileText,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner';
import { mockTenderBids, mockEvaluationCriteria } from '../mocks';

interface BidEvaluationPanelProps {
  tenderId: string;
  tenderTitle: string;
  evaluationCriteria: EvaluationCriterion[];
  bids: TenderBid[];
  onClose: () => void;
  onAwardTender: (bidId: string, notes: string) => void;
  onRejectBid: (bidId: string, reason: string) => void;
}

interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  type: 'price' | 'quality' | 'time' | 'experience';
}

interface TenderBid {
  id: string;
  contractorId: string;
  contractorName: string;
  contractorCompany: string;
  contractorAvatar?: string;
  contractorRating: number;
  contractorCompletedJobs: number;
  totalPrice: number;
  currency: string;
  proposedTimeline: number;
  proposedStartDate: Date;
  guaranteePeriod: number;
  description: string;
  technicalProposal: string;
  attachments: BidAttachment[];
  criteriaResponses: CriteriaResponse[];
  submittedAt: Date;
  status: 'submitted' | 'under_review' | 'shortlisted' | 'rejected' | 'awarded';
  evaluation?: BidEvaluation;
}

interface BidAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

interface CriteriaResponse {
  criterionId: string;
  response: string;
}

interface BidEvaluation {
  criteriaScores: Record<string, number>; // criterionId -> score (0-100)
  totalScore: number;
  evaluatorNotes: string;
  evaluatedAt: Date;
  evaluatorId: string;
}

export const BidEvaluationPanel: React.FC<BidEvaluationPanelProps> = ({
  tenderId: _tenderId,
  tenderTitle,
  evaluationCriteria = mockEvaluationCriteria,
  bids: initialBids = mockTenderBids,
  onClose,
  onAwardTender,
  onRejectBid
}) => {
  const [bids, setBids] = useState<TenderBid[]>(initialBids);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [evaluationMode, setEvaluationMode] = useState<'overview' | 'detailed' | 'compare'>('overview');

  // Update bids when prop changes
  useEffect(() => {
    setBids(initialBids);
  }, [initialBids]);

  const selectedBid = selectedBidId ? bids.find(b => b.id === selectedBidId) : null;

  // Calculate automatic scores based on criteria
  const calculateAutomaticScore = (bid: TenderBid, criterion: EvaluationCriterion): number => {
    switch (criterion.type) {
      case 'price': {
        const validPrices = bids.map(b => b.totalPrice).filter(p => p != null && p > 0);
        if (validPrices.length === 0 || !bid.totalPrice || bid.totalPrice <= 0) {
          return 50; // Default score if no valid prices
        }
        const lowestPrice = Math.min(...validPrices);
        const priceScore = (lowestPrice / bid.totalPrice) * 100;
        return Math.min(100, Math.max(0, priceScore));
      }

      case 'time': {
        const validTimelines = bids.map(b => b.proposedTimeline).filter(t => t != null && t > 0);
        if (validTimelines.length === 0 || !bid.proposedTimeline || bid.proposedTimeline <= 0) {
          return 50; // Default score if no valid timelines
        }
        const shortestTime = Math.min(...validTimelines);
        const timeScore = (shortestTime / bid.proposedTimeline) * 100;
        return Math.min(100, Math.max(0, timeScore));
      }

      default:
        return 75; // Default score for quality/experience criteria
    }
  };

  // Calculate total score for a bid
  const calculateTotalScore = (bid: TenderBid): number => {
    let totalScore = 0;
    
    evaluationCriteria.forEach(criterion => {
      const score = bid.evaluation?.criteriaScores[criterion.id] || calculateAutomaticScore(bid, criterion);
      const scoreValue = typeof score === 'number' && !isNaN(score) ? score : 0;
      const weight = typeof criterion.weight === 'number' && !isNaN(criterion.weight) ? criterion.weight : 0;
      totalScore += (scoreValue * weight) / 100;
    });
    
    const finalScore = Math.round(totalScore);
    return isNaN(finalScore) ? 0 : finalScore;
  };

  // Update evaluation score
  const updateEvaluationScore = (bidId: string, criterionId: string, score: number) => {
    setBids(prev => prev.map(bid => {
      if (bid.id === bidId) {
        const evaluation = bid.evaluation || {
          criteriaScores: {},
          totalScore: 0,
          evaluatorNotes: '',
          evaluatedAt: new Date(),
          evaluatorId: 'current-user'
        };
        
        evaluation.criteriaScores[criterionId] = score;
        evaluation.totalScore = calculateTotalScore({...bid, evaluation});
        evaluation.evaluatedAt = new Date();
        
        return { ...bid, evaluation };
      }
      return bid;
    }));
  };

  // Get sorted bids by total score
  const getSortedBids = () => {
    return [...bids].sort((a, b) => calculateTotalScore(b) - calculateTotalScore(a));
  };

  // Handle bid status change
  const updateBidStatus = (bidId: string, status: TenderBid['status']) => {
    setBids(prev => prev.map(bid => 
      bid.id === bidId ? { ...bid, status } : bid
    ));
  };

  const handleAwardTender = (bidId: string) => {
    const notes = 'Oferta wybrana jako najlepsza po szczegółowej analizie wszystkich kryteriów.';
    updateBidStatus(bidId, 'awarded');
    onAwardTender(bidId, notes);
    toast.success('Przetarg został rozstrzygnięty');
  };

  const handleRejectBid = (bidId: string) => {
    const reason = 'Oferta nie spełnia wymagań jakościowych.';
    updateBidStatus(bidId, 'rejected');
    onRejectBid(bidId, reason);
    toast.success('Oferta została odrzucona');
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString('pl-PL')} ${currency}`;
  };

  const getStatusBadge = (status: TenderBid['status']) => {
    const configs: Record<string, { color: string; label: string }> = {
      submitted: { color: 'bg-blue-100 text-blue-700', label: 'Złożona' },
      under_review: { color: 'bg-yellow-100 text-yellow-700', label: 'W ocenie' },
      shortlisted: { color: 'bg-green-100 text-green-700', label: 'Preselekacja' },
      rejected: { color: 'bg-red-100 text-red-700', label: 'Odrzucona' },
      awarded: { color: 'bg-purple-100 text-purple-700', label: 'Wybrana' },
      pending: { color: 'bg-gray-100 text-gray-700', label: 'Oczekująca' }
    };
    
    // Default to 'submitted' if status is undefined/null or not in configs
    const normalizedStatus = status || 'submitted';
    const config = configs[normalizedStatus] || configs.submitted;
    
    return <Badge className={`${config.color} border-0`}>{config.label}</Badge>;
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[95vw] w-[95vw] !h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden [&>button]:hidden sm:!max-w-[95vw]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-2xl">Ocena ofert w przetargu</DialogTitle>
          <DialogDescription className="text-base">{tenderTitle}</DialogDescription>
        </DialogHeader>

        {/* Navigation */}
        <div className="border-b flex-shrink-0">
          <Tabs value={evaluationMode} onValueChange={(value) => setEvaluationMode(value as 'overview' | 'detailed' | 'compare')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Przegląd ofert</TabsTrigger>
              <TabsTrigger value="detailed">Szczegółowa ocena</TabsTrigger>
              <TabsTrigger value="compare">Porównanie</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {/* Empty State */}
            {bids.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="bg-gray-100 rounded-full p-6 mb-4">
                  <FileText className="h-16 w-16 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak złożonych ofert</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Jeszcze żadna oferta nie została złożona w tym przetargu. Oferty pojawią się tutaj po ich złożeniu przez wykonawców.
                </p>
              </div>
            ) : (
              <>
            {/* Overview Mode */}
            {evaluationMode === 'overview' && (
              <div className="space-y-6">
                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Złożone oferty</p>
                          <p className="text-2xl font-bold">{bids.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Najniższa cena</p>
                          <p className="text-2xl font-bold">
                            {bids.length > 0 ? formatCurrency(Math.min(...bids.map(b => b.totalPrice)), bids[0]?.currency || 'PLN') : '-'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Najkrótszy czas</p>
                          <p className="text-2xl font-bold">
                            {bids.length > 0 ? `${Math.min(...bids.map(b => b.proposedTimeline))} dni` : '-'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Star className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Średnia ocena</p>
                          <p className="text-2xl font-bold">
                            {bids.length > 0 ? (bids.reduce((sum, b) => sum + b.contractorRating, 0) / bids.length).toFixed(1) : '-'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Bids Ranking */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Ranking ofert
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getSortedBids().map((bid, index) => {
                        const totalScore = calculateTotalScore(bid);
                        return (
                          <div
                            key={bid.id}
                            className={`flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                              index === 0 ? 'border-yellow-500 border-2' : ''
                            }`}
                            onClick={() => {
                              setSelectedBidId(bid.id);
                              setEvaluationMode('detailed');
                            }}
                          >
                            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={bid.contractorAvatar} />
                                <AvatarFallback className="bg-blue-100 text-blue-700">
                                  {bid.contractorName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-semibold text-sm md:text-base text-gray-900 break-words">{bid.contractorName}</h4>
                                  {index === 0 && (
                                    <Badge className="bg-yellow-500 text-white text-xs">
                                      Polecane
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs md:text-sm text-gray-600 truncate">{bid.contractorCompany}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                                  <span className="text-xs text-gray-600">{bid.contractorRating.toFixed(1)}</span>
                                  <span className="text-xs text-gray-500">•</span>
                                  <span className="text-xs text-gray-600">{bid.contractorCompletedJobs} projektów</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row md:items-center gap-3 md:gap-6">
                              <div className="text-left md:text-right min-w-0 sm:min-w-[120px]">
                                <p className="font-semibold text-sm md:text-base text-gray-900">{formatCurrency(bid.totalPrice, bid.currency)}</p>
                                <p className="text-xs md:text-sm text-gray-600 flex items-center md:justify-end gap-1 mt-1">
                                  <Clock className="h-3 w-3 flex-shrink-0" />
                                  {bid.proposedTimeline} dni
                                </p>
                              </div>
                              
                              <div className="text-left md:text-right min-w-0 sm:min-w-[100px]">
                                <div className="flex items-center md:justify-end gap-2 mb-1">
                                  <p className="font-bold text-base md:text-lg text-gray-900">{isNaN(totalScore) ? 0 : totalScore}</p>
                                  <span className="text-xs md:text-sm text-gray-500">/100</span>
                                </div>
                                <Progress value={isNaN(totalScore) ? 0 : totalScore} className="w-full md:w-24 h-2" />
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {getStatusBadge(bid.status)}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBidId(bid.id);
                                    setEvaluationMode('detailed');
                                  }}
                                  className="flex-shrink-0"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Detailed Evaluation Mode */}
            {evaluationMode === 'detailed' && (
              <>
                {selectedBid ? (
                  <div className="space-y-6">
                {/* Bid Header */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-white shadow-md">
                          <AvatarImage src={selectedBid.contractorAvatar} />
                          <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">
                            {selectedBid.contractorName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">{selectedBid.contractorName}</h3>
                          <p className="text-gray-600 mt-1">{selectedBid.contractorCompany}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{selectedBid.contractorRating.toFixed(1)}</span>
                            </div>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-600">{selectedBid.contractorCompletedJobs} ukończonych projektów</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => handleRejectBid(selectedBid.id)}
                          disabled={selectedBid.status === 'awarded' || selectedBid.status === 'rejected'}
                        >
                          Odrzuć
                        </Button>
                        <Button 
                          onClick={() => handleAwardTender(selectedBid.id)}
                          disabled={selectedBid.status === 'awarded' || selectedBid.status === 'rejected'}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Crown className="h-4 w-4 mr-2" />
                          Wybierz ofertę
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Evaluation Criteria */}
                  <div className="md:col-span-2 lg:col-span-2 space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5" />
                          Ocena według kryteriów
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {evaluationCriteria && evaluationCriteria.length > 0 ? (
                          <>
                            {evaluationCriteria.map(criterion => {
                              const currentScore = selectedBid.evaluation?.criteriaScores[criterion.id] || 
                                                 calculateAutomaticScore(selectedBid, criterion);
                              const response = selectedBid.criteriaResponses?.find(r => r.criterionId === criterion.id);
                              
                              return (
                                <div key={criterion.id} className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-gray-900">{criterion.name}</h4>
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                      {criterion.weight}%
                                    </Badge>
                                  </div>
                                  
                                  {criterion.description && (
                                    <p className="text-sm text-gray-600 mb-3">{criterion.description}</p>
                                  )}
                                  
                                  {response && response.response ? (
                                    <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                      <p className="text-sm text-gray-700 whitespace-pre-line">{response.response}</p>
                                    </div>
                                  ) : (
                                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                      <p className="text-sm text-amber-700 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Brak odpowiedzi na to kryterium
                                      </p>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                      <Label className="text-sm font-medium">Ocena (0-100 punktów)</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={currentScore}
                                        onChange={(e) => updateEvaluationScore(
                                          selectedBid.id, 
                                          criterion.id, 
                                          Number(e.target.value)
                                        )}
                                        className="mt-1"
                                      />
                                    </div>
                                    <div className="text-right min-w-[80px]">
                                      <p className="text-xs text-gray-500 mb-1">Punkty</p>
                                      <p className="text-lg font-semibold text-blue-600">
                                        {((currentScore * criterion.weight) / 100).toFixed(1)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            
                            <div className="border-t-2 border-gray-200 pt-4 mt-6">
                              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                <span className="text-lg font-semibold text-gray-900">Łączna ocena:</span>
                                {(() => {
                                  const score = calculateTotalScore(selectedBid);
                                  return <span className="text-2xl font-bold text-blue-600">{isNaN(score) ? 0 : score}/100 punktów</span>;
                                })()}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                            <Award className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500">Brak zdefiniowanych kryteriów oceny</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Bid Details */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Szczegóły oferty
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <Label className="text-xs text-gray-500 mb-1 block">Cena całkowita</Label>
                          <p className="font-bold text-xl text-green-700">{formatCurrency(selectedBid.totalPrice, selectedBid.currency)}</p>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm text-gray-500">Czas realizacji</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <p className="font-medium text-gray-900">{selectedBid.proposedTimeline} dni</p>
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-sm text-gray-500">Planowany start</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <p className="font-medium text-gray-900">{selectedBid.proposedStartDate.toLocaleDateString('pl-PL')}</p>
                            </div>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <Label className="text-sm text-gray-500 mb-2 block">Ocena wykonawcy</Label>
                          <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{selectedBid.contractorRating.toFixed(1)}</span>
                            <span className="text-sm text-gray-600">
                              ({selectedBid.contractorCompletedJobs} projektów)
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm text-gray-500 mb-2 block">Status</Label>
                          <div className="mt-1">
                            {getStatusBadge(selectedBid.status)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {selectedBid.description && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Opis oferty</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                            {selectedBid.description}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {selectedBid.attachments && selectedBid.attachments.length > 0 ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <FileText className="h-4 w-4" />
                            Załączniki ({selectedBid.attachments.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {selectedBid.attachments.map(attachment => (
                              <div key={attachment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="p-2 bg-blue-100 rounded">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
                                    <p className="text-xs text-gray-500">{(attachment.size / 1024).toFixed(1)} KB</p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="p-6 text-center">
                          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 text-sm">Brak załączników</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="bg-gray-100 rounded-full p-6 mb-4">
                      <Eye className="h-16 w-16 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Wybierz ofertę do oceny</h3>
                    <p className="text-gray-500 text-center max-w-md">
                      Kliknij na jedną z ofert w rankingu, aby zobaczyć szczegóły i przeprowadzić ocenę.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Compare Mode */}
            {evaluationMode === 'compare' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Porównanie ofert
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {bids.length > 0 ? (
                      <>
                        <Alert className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Wybierz maksymalnie 3 oferty do porównania
                          </AlertDescription>
                        </Alert>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b-2 border-gray-200">
                                <th className="text-left p-3 font-semibold text-gray-900">Kryterium</th>
                                {bids.slice(0, 3).map(bid => (
                                  <th key={bid.id} className="text-center p-3">
                                    <div className="bg-gray-50 rounded-lg p-2">
                                      <p className="font-semibold text-gray-900">{bid.contractorName}</p>
                                      <p className="text-xs text-gray-600 mt-1">{bid.contractorCompany}</p>
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-900">Cena</td>
                                {bids.slice(0, 3).map(bid => (
                                  <td key={bid.id} className="text-center p-3">
                                    <span className="font-semibold">{formatCurrency(bid.totalPrice, bid.currency)}</span>
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-900">Czas realizacji</td>
                                {bids.slice(0, 3).map(bid => (
                                  <td key={bid.id} className="text-center p-3">
                                    <div className="flex items-center justify-center gap-1">
                                      <Clock className="h-4 w-4 text-gray-400" />
                                      <span>{bid.proposedTimeline} dni</span>
                                    </div>
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-900">Gwarancja</td>
                                {bids.slice(0, 3).map(bid => (
                                  <td key={bid.id} className="text-center p-3">
                                    <div className="flex items-center justify-center gap-1">
                                      <Shield className="h-4 w-4 text-gray-400" />
                                      <span>{bid.guaranteePeriod} miesięcy</span>
                                    </div>
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-900">Ocena wykonawcy</td>
                                {bids.slice(0, 3).map(bid => (
                                  <td key={bid.id} className="text-center p-3">
                                    <div className="flex items-center justify-center gap-1">
                                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                      <span className="font-medium">{bid.contractorRating.toFixed(1)}</span>
                                    </div>
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b-2 border-gray-300 bg-gradient-to-r from-blue-50 to-indigo-50">
                                <td className="p-3 font-bold text-gray-900">Łączna ocena</td>
                                {bids.slice(0, 3).map(bid => {
                                  const score = calculateTotalScore(bid);
                                  return (
                                    <td key={bid.id} className="text-center p-3">
                                      <span className="text-xl font-bold text-blue-600">{isNaN(score) ? 0 : score}/100</span>
                                    </td>
                                  );
                                })}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">Brak ofert do porównania</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
              </>
            )}
            
            {/* Bid Selection */}
            {evaluationMode === 'detailed' && (
              <div className="border-t p-4 bg-gray-50 mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {bids.map((bid) => (
                      <Button
                        key={bid.id}
                        variant={selectedBidId === bid.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedBidId(bid.id)}
                      >
                        {bid.contractorName}
                      </Button>
                    ))}
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Oferta {bids.findIndex(b => b.id === selectedBidId) + 1} z {bids.length}
                  </div>
                </div>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BidEvaluationPanel;