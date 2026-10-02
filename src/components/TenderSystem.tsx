import {
  ArrowLeft,
  BarChart3,
  Clock,
  DollarSign,
  Eye,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trophy,
  Users
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { TenderStatusBadge } from './TenderStatusBadge';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { getDaysRemaining } from '../utils/tenderHelpers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useUserProfile } from '../contexts/AuthContext';
import { createClient } from '../lib/supabase/client';
import { fetchTenders, type TenderWithCompany } from '../lib/database/jobs';
import { TenderStatus } from '../types/tender';
import type { PostgrestError } from '@supabase/supabase-js';

// Types now imported from centralized types folder

interface TenderSystemProps {
  userRole: 'manager' | 'contractor';
  onTenderCreate?: () => void;
  onTenderSelect?: (tenderId: string) => void;
  onBidSubmit?: (tenderId: string) => void;
  onTenderEdit?: (tenderId: string) => void;
  onViewBids?: (tenderId: string) => void;
  onBack?: () => void;
}

interface LocalTender {
  id: string;
  title: string;
  description: string;
  location: string;
  estimatedValue: string;
  currency: string;
  status: TenderStatus;
  submissionDeadline: Date;
  evaluationDeadline?: Date;
  bidCount: number;
  createdBy: string;
  category: string;
  winnerName?: string;
}

export const TenderSystem: React.FC<TenderSystemProps> = ({
  userRole,
  onTenderCreate,
  onTenderSelect,
  onBidSubmit,
  onTenderEdit,
  onViewBids,
  onBack
}) => {
  const { user } = useUserProfile();
  const [tenders, setTenders] = useState<LocalTender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TenderStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Fetch tenders from database
  useEffect(() => {
    const loadTenders = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const filters: Record<string, unknown> = {
          status: statusFilter === 'all' ? undefined : statusFilter,
        };
        
        // For managers, pass their user ID to see drafts
        const managerId = userRole === 'manager' ? user?.id : undefined;
        
        const { data, error } = await fetchTenders(supabase, filters, managerId);
        
        if (error) {
          console.error('Error fetching tenders:', error);
          // Log error details for debugging
          if (error && typeof error === 'object') {
            console.error('Error details:', {
              message: (error as PostgrestError)?.message,
              code: (error as PostgrestError)?.code,
              details: (error as PostgrestError)?.details,
              hint: (error as PostgrestError)?.hint,
              originalError: (error as PostgrestError & { originalError?: unknown })?.originalError
            });
          }
          setTenders([]);
        } else if (data) {
          // Convert database format to component format
          const convertedTenders: LocalTender[] = data.map((t: TenderWithCompany) => {
            // Convert location to string if it's an object
            let locationString: string;
            if (typeof t.location === 'string') {
              locationString = t.location;
            } else if (t.location && typeof t.location === 'object' && 'city' in t.location) {
              locationString = t.location.city + (t.location.sublocality_level_1 ? `, ${t.location.sublocality_level_1}` : '');
            } else {
              locationString = 'Nieznana lokalizacja';
            }

            return {
              id: t.id,
              title: t.title,
              description: t.description,
              location: locationString,
              estimatedValue: t.estimated_value?.toString() || '0',
              currency: t.currency || 'PLN',
              status: t.status as TenderStatus,
              submissionDeadline: new Date(t.submission_deadline),
              evaluationDeadline: t.evaluation_deadline ? new Date(t.evaluation_deadline) : undefined,
              bidCount: t.offers_count || 0,
              createdBy: t.company?.name || 'Unknown',
              category: t.category?.name || 'Inne',
              winnerName: ((t as { winner_name?: string }).winner_name) || undefined,
            };
          });
          setTenders(convertedTenders);
        } else {
          setTenders([]);
        }
      } catch (error) {
        console.error('Error loading tenders:', error);
        setTenders([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTenders();
  }, [userRole, user?.id, statusFilter]);

  // Filter tenders based on search and filters
  const filteredTenders = tenders.filter(tender => {
    const matchesSearch = tender.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tender.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tender.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || tender.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || tender.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(tenders.map(t => t.category)));

  // Statistics for manager dashboard
  const getStatistics = () => {
    const activeTenders = tenders.filter(t => t.status === 'active').length;
    const totalBids = tenders.reduce((sum, t) => sum + t.bidCount, 0);
    const avgBidsPerTender = totalBids / tenders.length || 0;
    const completedTenders = tenders.filter(t => t.status === 'awarded').length;
    
    return { activeTenders, totalBids, avgBidsPerTender, completedTenders };
  };

  const stats = getStatistics();

  const formatCurrency = (amount: string, currency: string) => {
    return `${parseInt(amount).toLocaleString('pl-PL')} ${currency}`;
  };

  // Using imported getDaysRemaining helper

  const handleTenderClick = (tenderId: string) => {
    if (onTenderSelect) {
      onTenderSelect(tenderId);
    }
  };

  const handleBidClick = (tenderId: string) => {
    if (onBidSubmit) {
      onBidSubmit(tenderId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with statistics */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">System przetargów</h1>
          <p className="text-sm md:text-base text-gray-600">
            {userRole === 'manager' 
              ? 'Zarządzaj przetargami i oceniaj oferty wykonawców'
              : 'Przeglądaj i składaj oferty w przetargach'
            }
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {userRole === 'manager' && !user?.actionsSuspended && (
            <Button onClick={onTenderCreate} className="flex items-center gap-2 flex-1 md:flex-initial">
              <Plus className="h-4 w-4" />
              Nowy przetarg
            </Button>
          )}
          
          {onBack && (
            <Button onClick={onBack} variant="outline" className="flex items-center gap-2 flex-1 md:flex-initial">
              <ArrowLeft className="h-4 w-4" />
              Wróć do listy
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Aktywne przetargi</p>
                <p className="text-2xl font-bold">{stats.activeTenders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Łączne oferty</p>
                <p className="text-2xl font-bold">{stats.totalBids}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Średnio ofert/przetarg</p>
                <p className="text-2xl font-bold">{stats.avgBidsPerTender.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Trophy className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Zakończone</p>
                <p className="text-2xl font-bold">{stats.completedTenders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Szukaj przetargów..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TenderStatus | 'all')}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                <SelectItem value="draft">Szkice</SelectItem>
                <SelectItem value="active">Aktywne</SelectItem>
                <SelectItem value="evaluation">W ocenie</SelectItem>
                <SelectItem value="awarded">Rozstrzygnięte</SelectItem>
                <SelectItem value="cancelled">Anulowane</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tenders List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">Ładowanie przetargów...</p>
            </CardContent>
          </Card>
        ) : filteredTenders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-600 mb-2">Brak przetargów</h3>
              <p className="text-sm text-gray-500">
                Nie znaleziono przetargów spełniających wybrane kryteria
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTenders.map((tender) => (
            <Card 
              key={tender.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleTenderClick(tender.id)}
            >
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                      <h3 className="font-semibold text-base md:text-lg break-words">{tender.title}</h3>
                      <TenderStatusBadge status={tender.status} />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600 mb-3">
                      <span className="font-medium">{tender.createdBy}</span>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                        <span className="break-words">{tender.location}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">{tender.category}</Badge>
                    </div>
                    
                    <p className="text-gray-700 text-xs md:text-sm mb-4 line-clamp-2">
                      {tender.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm">
                      <div className="flex items-center gap-1 md:gap-2">
                        <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-gray-500 flex-shrink-0" />
                        <span>Wartość: {formatCurrency(tender.estimatedValue, tender.currency)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 md:gap-2">
                        <Users className="h-3 w-3 md:h-4 md:w-4 text-gray-500 flex-shrink-0" />
                        <span>{tender.bidCount} ofert</span>
                      </div>
                      
                      {userRole === 'manager' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onViewBids) {
                              onViewBids(tender.id);
                            }
                          }}
                          disabled={tender.bidCount === 0}
                          className="text-xs"
                        >
                          <Users className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                          Zobacz oferty {tender.bidCount > 0 && `(${tender.bidCount})`}
                        </Button>
                      )}
                      
                      {tender.status === 'active' && (
                        <div className="flex items-center gap-1 md:gap-2 text-orange-600">
                          <Clock className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                          <span>{getDaysRemaining(tender.submissionDeadline)} dni do końca</span>
                        </div>
                      )}

                      {tender.status === 'awarded' && tender.winnerName && (
                        <div className="flex items-center gap-1 md:gap-2 text-green-600">
                          <Trophy className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                          <span>Wygrał: {tender.winnerName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col gap-2 w-full md:w-auto md:ml-6">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTenderClick(tender.id);
                      }}
                      className="flex-1 sm:flex-initial"
                    >
                      <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      Szczegóły
                    </Button>
                    
                    {userRole === 'manager' && tender.status === 'draft' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTenderEdit) {
                            onTenderEdit(tender.id);
                          }
                        }}
                        className="flex-1 sm:flex-initial"
                      >
                        <Pencil className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        Edytuj
                      </Button>
                    )}
                    
                    {userRole === 'contractor' && tender.status === 'active' && (
                      <Button 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBidClick(tender.id);
                        }}
                        className="flex-1 sm:flex-initial"
                      >
                        Złóż ofertę
                      </Button>
                    )}
                    
                    {userRole === 'manager' && tender.status === 'evaluation' && (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTenderSelect) {
                            onTenderSelect(tender.id);
                          }
                        }}
                        className="flex-1 sm:flex-initial"
                      >
                        Oceń oferty
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TenderSystem;