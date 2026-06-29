"use client";

import { useState } from 'react';
import { Award, Calendar, CheckCircle, Clock, MapPin, Shield, Star, Users, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useUserProfile } from '../../contexts/AuthContext';
import type { ContractorProfile } from '../../types/contractor';

interface ContractorProfileHeaderProps {
  profile: ContractorProfile | null;
}

export function ContractorProfileHeader({ profile }: ContractorProfileHeaderProps) {
  const router = useRouter();
  const { user } = useUserProfile();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_showPhoneNumber, setShowPhoneNumber] = useState(false);

  const _handleRequestQuote = () => {
    if (!user?.id) {
      toast.error('Musisz być zalogowany, aby wysłać zapytanie o wycenę');
      router.push(`/logowanie?redirectTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (!profile?.id) {
      toast.error('Nie można znaleźć profilu wykonawcy');
      return;
    }

    // Dispatch custom event to open quote modal
    window.dispatchEvent(new CustomEvent('openQuoteModal'));
  };

  if (!profile) {
    return (
      <div className="bg-card border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-4 lg:py-6">
        <div className="flex flex-col items-center md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-col items-center md:flex-row md:items-center gap-3 md:gap-4">
              <Avatar className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex-shrink-0">
                <AvatarFallback className="bg-primary text-white text-sm sm:text-lg md:text-xl">WY</AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Nie znaleziono wykonawcy</h1>
                <p className="text-gray-600 text-sm md:text-base mt-1">Profil nie istnieje</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const contractorData = {
    name: profile.companyName,
    shortName: profile.companyName.split(' ')[0],
    avatar: profile.avatar || '',
    verified: profile.verification?.status === 'verified',
    hasInsurance: profile.insurance?.hasOC || false,
    premium: profile.plan === 'pro',
    rating: profile.rating?.overall || 0,
    reviewCount: profile.rating?.reviewsCount || 0,
    completedJobs: profile.experience?.completedProjects || 0,
    location: profile.location?.city || 'Warszawa',
    founded: profile.businessInfo?.yearEstablished || new Date().getFullYear(),
    employees: profile.businessInfo?.employeeCount || '1-5',
    responseTime: profile.stats?.responseTime || '',
    phone: profile.contactInfo?.phone || '',
    specialties: [...(profile.services?.primary || []), ...(profile.services?.secondary || [])].slice(0, 5),
  };

  return (
    <div className="bg-card border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-4 lg:py-6 relative">
        {/* Rating - Top Left Corner (Mobile only) */}
        {contractorData.rating > 0 && (
          <button
            onClick={() => {
              window.location.hash = '#reviews';
              window.dispatchEvent(new HashChangeEvent('hashchange'));
            }}
            className="absolute top-4 left-4 sm:left-6 md:hidden flex items-center gap-1.5 text-xs sm:text-sm text-gray-900 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
            <span className="font-medium">
              {contractorData.rating.toFixed(1)} ({contractorData.reviewCount} {contractorData.reviewCount === 1 ? 'opinia' : contractorData.reviewCount < 5 ? 'opinie' : 'opinii'})
            </span>
          </button>
        )}

        {/* Response Time - Top Right Corner */}
        {contractorData.responseTime && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute top-4 right-4 sm:right-6 lg:right-8 flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 cursor-help">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                <span className="font-medium md:inline hidden">Odpowiedź: {contractorData.responseTime}</span>
                <span className="font-medium md:hidden">{contractorData.responseTime}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Odpowiedź: {contractorData.responseTime}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Mobile: Centered layout, Desktop: Horizontal layout */}
        <div className="flex flex-col items-center md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
          {/* Main content area */}
          <div className="flex flex-col items-center md:flex-row md:items-start gap-3 md:gap-4 flex-1 min-w-0 w-full md:w-auto">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <Avatar className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20">
                <AvatarImage src={contractorData.avatar} />
                <AvatarFallback className="bg-primary text-white text-sm sm:text-lg md:text-xl">
                  {contractorData.shortName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {contractorData.premium && (
                <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 md:-top-1 md:-right-1 bg-yellow-400 rounded-full p-1 sm:p-1.5 md:p-2">
                  <Award className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 text-white" />
                </div>
              )}
            </div>

            {/* Content section */}
            <div className="flex-1 min-w-0 w-full md:w-auto text-center md:text-left">
              {/* Company Name with Badges inline */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2 md:mb-1.5">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                  {contractorData.name}
                </h1>
                {contractorData.verified && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="bg-green-100 text-green-800 p-1 h-auto cursor-help">
                        <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Zweryfikowany</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {contractorData.hasInsurance && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="bg-blue-100 text-blue-800 p-1 h-auto cursor-help">
                        <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ubezpieczenie OC</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {contractorData.premium && (
                  <Badge className="bg-yellow-100 text-yellow-800 text-[10px] sm:text-xs md:text-sm px-2 py-1">
                    <Award className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    Premium
                  </Badge>
                )}
              </div>

              {/* Stats Row - rating (desktop), jobs */}
              {(contractorData.rating > 0 || contractorData.completedJobs > 0) && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 mb-2 md:mb-2">
                  {contractorData.rating > 0 && (
                    <button
                      onClick={() => {
                        window.location.hash = '#reviews';
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                      }}
                      className="hidden md:flex items-center gap-1.5 hover:text-gray-700 transition-colors cursor-pointer"
                    >
                      <Star className="w-4 h-4 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900">
                        {contractorData.rating.toFixed(1)} ({contractorData.reviewCount} {contractorData.reviewCount === 1 ? 'opinia' : contractorData.reviewCount < 5 ? 'opinie' : 'opinii'})
                      </span>
                    </button>
                  )}
                  {contractorData.completedJobs > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700">
                        {contractorData.completedJobs} {contractorData.completedJobs === 1 ? 'zgłoszenie' : contractorData.completedJobs < 5 ? 'zgłoszenia' : 'zgłoszeń'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Info Cards - location, founded, employees */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2 md:mb-2">
                {contractorData.location && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-md border border-gray-100">
                    <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-700 font-medium truncate">{contractorData.location}</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-md border border-gray-100">
                  <Calendar className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700 font-medium">Od {contractorData.founded}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-md border border-gray-100">
                  <Users className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700 font-medium">{contractorData.employees}</span>
                </div>
              </div>

              {/* Specialties - badges at bottom */}
              {contractorData.specialties && contractorData.specialties.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-1.5 md:mt-2">
                  {contractorData.specialties.map((specialty: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs sm:text-xs px-2.5 py-1">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
