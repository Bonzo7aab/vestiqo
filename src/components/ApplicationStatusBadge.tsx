import React from 'react';
import { Badge } from './ui/badge';
import { 
  Clock, 
  Eye, 
  CheckCircle, 
  XCircle, 
  FileText,
  AlertCircle
} from 'lucide-react';

type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'cancelled';

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
}

const statusConfig = {
  draft: {
    label: 'Szkic',
    variant: 'secondary' as const,
    icon: FileText,
    color: 'text-gray-600'
  },
  submitted: {
    label: 'Wysłana',
    variant: 'default' as const,
    icon: Clock,
    color: 'text-blue-600'
  },
  under_review: {
    label: 'W trakcie oceny',
    variant: 'secondary' as const,
    icon: Eye,
    color: 'text-orange-600'
  },
  accepted: {
    label: 'Zaakceptowana',
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'text-green-600'
  },
  rejected: {
    label: 'Odrzucona',
    variant: 'destructive' as const,
    icon: XCircle,
    color: 'text-red-600'
  },
  cancelled: {
    label: 'Anulowana',
    variant: 'outline' as const,
    icon: AlertCircle,
    color: 'text-gray-500'
  }
};

export const ApplicationStatusBadge: React.FC<ApplicationStatusBadgeProps> = ({
  status,
  size = 'default',
  showIcon = true,
  showText = true
}) => {
  const config = statusConfig[status];
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    default: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  // Custom styling for each status
  const getCustomStyles = () => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'under_review':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'accepted':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'cancelled':
        return 'bg-gray-50 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  return (
    <Badge
      variant="outline"
      className={`
        inline-flex items-center gap-1.5 font-medium border
        ${sizeClasses[size]}
        ${getCustomStyles()}
      `}
    >
      {showIcon && (
        <IconComponent className={iconSizes[size]} />
      )}
      {showText && config.label}
    </Badge>
  );
};

// Komponent rozszerzony z dodatkowymi informacjami
interface ApplicationStatusCardProps {
  status: ApplicationStatus;
  submittedAt?: Date;
  lastUpdated?: Date;
  reviewedBy?: string;
  notes?: string;
}

export const ApplicationStatusCard: React.FC<ApplicationStatusCardProps> = ({
  status,
  submittedAt,
  lastUpdated,
  reviewedBy,
  notes
}) => {
  const config = statusConfig[status];
  const IconComponent = config.icon;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'submitted':
        return 'Twoja aplikacja została wysłana i oczekuje na rozpatrzenie przez zarządcę.';
      case 'under_review':
        return 'Zarządca obecnie analizuje Twoją ofertę. Oczekuj odpowiedzi w ciągu 48 godzin.';
      case 'accepted':
        return 'Gratulacje! Twoja aplikacja została zaakceptowana. Zarządca skontaktuje się z Tobą w sprawie dalszych kroków.';
      case 'rejected':
        return 'Niestety, Twoja aplikacja nie została zaakceptowana tym razem. Zachęcamy do aplikowania na inne zgłoszenia.';
      case 'cancelled':
        return 'Aplikacja została anulowana na Twoją prośbę.';
      default:
        return 'Status aplikacji jest nieokreślony.';
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${config.color} bg-opacity-10`}>
          <IconComponent className={`h-5 w-5 ${config.color}`} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <ApplicationStatusBadge status={status} />
            {submittedAt && (
              <span className="text-sm text-gray-500">
                wysłana {formatDate(submittedAt)}
              </span>
            )}
          </div>
          
          <p className="text-gray-700 mb-3">
            {getStatusMessage()}
          </p>
          
          <div className="space-y-1 text-sm text-gray-500">
            {lastUpdated && (
              <p>Ostatnia aktualizacja: {formatDate(lastUpdated)}</p>
            )}
            {reviewedBy && (
              <p>Rozpatrzone przez: {reviewedBy}</p>
            )}
          </div>
          
          {notes && (
            <div className="mt-3 p-3 bg-gray-50 rounded border-l-4 border-gray-300">
              <p className="text-sm text-gray-700">
                <strong>Notatka od zarządcy:</strong> {notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationStatusBadge;