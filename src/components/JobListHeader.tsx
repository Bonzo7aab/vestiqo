import React, { useState } from 'react';
import { 
  ArrowUpDown, 
  Map, 
  MoreHorizontal,
  Bell,
  Bookmark,
  Share2
} from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

interface JobListHeaderProps {
  totalResults: number;
  filteredResults: number;
  sortBy: string;
  onSortChange: (sort: string) => void;
  isMapVisible: boolean;
  onToggleMap: () => void;
  searchQuery?: string;
  primaryLocation?: string;
  selectedPostTypes?: string[];
}

const sortOptions = [
  { value: 'newest', label: 'Najnowsze', description: 'Ostatnio dodane' },
  { value: 'deadline', label: 'Termin realizacji', description: 'Pilne zgłoszenia i przetargi' },
  { value: 'budget', label: 'Budżet całkowity', description: 'Największe projekty' },
  { value: 'salary-high', label: 'Najwyższa stawka', description: 'Od najlepiej płatnych' },
  { value: 'salary-low', label: 'Najniższa stawka', description: 'Od najtańszych' },
  { value: 'applications', label: 'Liczba aplikacji', description: 'Najmniej konkurencji' },
  { value: 'rating', label: 'Ocena klienta', description: 'Najlepiej oceniani' },
  { value: 'distance', label: 'Odległość', description: 'Najbliższe lokalizacje' },
  { value: 'tender-phase', label: 'Faza przetargu', description: 'Etap procedury przetargowej' }
];

export const JobListHeader: React.FC<JobListHeaderProps> = ({
  totalResults,
  filteredResults,
  sortBy,
  onSortChange,
  isMapVisible,
  onToggleMap,
  searchQuery,
  primaryLocation,
  selectedPostTypes
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const currentSort = sortOptions.find(option => option.value === sortBy);
  const isFiltered = filteredResults !== totalResults;

  // Generate dynamic title based on location and post types
  const generateTitle = () => {
    let baseTitle = "Ogłoszenia";
    
    // Add post type specification if specific types are selected
    if (selectedPostTypes && selectedPostTypes.length > 0) {
      if (selectedPostTypes.length === 1) {
        if (selectedPostTypes[0] === 'contest') {
          baseTitle = "Konkursy";
        } else {
          baseTitle = "Zgłoszenia";
        }
      }
    }
    
    // Add location specification
    if (primaryLocation && primaryLocation !== 'Wszystkie lokalizacje') {
      if (primaryLocation === 'Polska') {
        baseTitle += " z Polski";
      } else {
        baseTitle += ` z ${primaryLocation}`;
      }
    }
    
    return baseTitle;
  };

  const dynamicTitle = generateTitle();

  return (
    <div className="space-y-4">
      {/* Main Header Row */}
      <div className="flex items-center justify-between">
        {/* Left Side - Results Info */}
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-xl font-bold flex items-center">
              {dynamicTitle}
              <span className="ml-2 text-lg font-normal text-muted-foreground">
                ({filteredResults})
              </span>
              {isFiltered && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  filtrowane
                </Badge>
              )}
            </h2>
            {searchQuery && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>dla: &quot;<span className="font-medium">{searchQuery}</span>&quot;</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Controls */}
        <div className="flex items-center space-x-2">
          {/* Notifications Toggle */}
          {searchQuery && (
            <div className="flex items-center space-x-2 mr-4">
              <Bell className={`h-4 w-4 ${notificationsEnabled ? 'text-primary' : 'text-gray-600'}`} />
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
                className="data-[state=checked]:bg-primary"
              />
              <Label className="text-xs text-gray-600 cursor-pointer">
                Powiadomienia
              </Label>
            </div>
          )}

          {/* Sort Selector */}
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-56 bg-gray-100 border-0 text-gray-900">
              <ArrowUpDown className="w-4 h-4 mr-2 text-gray-600" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white shadow-lg rounded-md">
              {sortOptions.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value} 
                  className="hover:bg-brand-unread hover:text-primary text-gray-900 focus:bg-brand-unread focus:text-primary data-[highlighted]:bg-brand-unread data-[highlighted]:text-primary"
                >
                  <div className="flex flex-col w-full">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-gray-600">{option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Map Toggle */}
          <Button
            variant={isMapVisible ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleMap}
            className={`px-3 ${isMapVisible ? 'bg-primary hover:bg-primary/90 text-white' : 'border-gray-200 text-gray-900 hover:bg-gray-50'}`}
          >
            <Map className="w-4 h-4 mr-2" />
            {isMapVisible ? 'Wróć do listy' : 'Pokaż mapę'}
          </Button>

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-gray-200 text-gray-600 hover:bg-gray-50">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-lg">
              <DropdownMenuItem className="hover:bg-gray-50 text-gray-900">
                <Bookmark className="h-4 w-4 mr-2 text-gray-600" />
                Zapisz wyszukiwanie
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-gray-50 text-gray-900">
                <Share2 className="h-4 w-4 mr-2 text-gray-600" />
                Udostępnij listę
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem className="hover:bg-gray-50 text-gray-900">
                <Bell className="h-4 w-4 mr-2 text-gray-600" />
                Ustawienia powiadomień
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Active Sort Info */}
      {currentSort && (
        <div className="flex items-center text-xs text-gray-600">
          <ArrowUpDown className="h-3 w-3 mr-1 text-gray-600" />
          <span>Sortowanie: {currentSort.label}</span>
          {currentSort.description && (
            <>
              <span className="mx-1">•</span>
              <span>{currentSort.description}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};