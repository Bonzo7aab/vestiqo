'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

export interface MapFilterState {
  postTypes: string[];
  categories: string[];
  locations: string[];
  salaryRange: [number, number];
  urgentOnly: boolean;
}

interface MapFiltersProps {
  filters: MapFilterState;
  onFilterChange: (filters: MapFilterState) => void;
}

const categories = [
  'Utrzymanie Czystości i Zieleni',
  'Roboty Remontowo-Budowlane',
  'Instalacje i systemy',
  'Utrzymanie techniczne i konserwacja',
  'Specjalistyczne usługi',
];

const locations = ['Warszawa', 'Kraków', 'Gdańsk', 'Wrocław', 'Poznań', 'Katowice'];

// Custom Checkbox Component
const CustomCheckbox: React.FC<{
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}> = ({ id, checked, onCheckedChange }) => {
  return (
    <div className="relative">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="sr-only"
      />
      <label
        htmlFor={id}
        className={`w-4 h-4 border rounded cursor-pointer flex items-center justify-center ${
          checked 
            ? 'bg-primary border-primary' 
            : 'bg-white border-gray-300 hover:border-gray-400'
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </label>
    </div>
  );
};

export const MapFilters: React.FC<MapFiltersProps> = ({
  filters,
  onFilterChange,
}) => {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [locationsOpen, setLocationsOpen] = useState(false);

  // Count active filters
  const activeFilterCount =
    filters.categories.length +
    filters.locations.length +
    (filters.salaryRange[0] > 0 || filters.salaryRange[1] < 200 ? 1 : 0) +
    (filters.urgentOnly ? 1 : 0);

  const handleCategoryToggle = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onFilterChange({ ...filters, categories: newCategories });
  };

  const handleLocationToggle = (location: string) => {
    const newLocations = filters.locations.includes(location)
      ? filters.locations.filter(l => l !== location)
      : [...filters.locations, location];
    onFilterChange({ ...filters, locations: newLocations });
  };

  const handleSalaryChange = (value: number[]) => {
    onFilterChange({ ...filters, salaryRange: [value[0], value[1]] });
  };

  const handleUrgentToggle = () => {
    onFilterChange({ ...filters, urgentOnly: !filters.urgentOnly });
  };

  const handleClearFilters = () => {
    onFilterChange({
      postTypes: ['contest'],
      categories: [],
      locations: [],
      salaryRange: [0, 200],
      urgentOnly: false,
    });
  };

  return (
    <Card className="w-[320px] max-h-[80vh] overflow-hidden shadow-xl bg-white border-border backdrop-blur-sm">
      <CardHeader className="p-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Filtry</h3>
          {activeFilterCount > 0 && (
            <Badge variant="default" className="h-5 px-2 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4 overflow-y-auto max-h-[calc(80vh-120px)]">
        {/* Categories Filter */}
        <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
          <div className="space-y-2">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
              <Label className="text-xs font-semibold text-foreground cursor-pointer">
                Kategorie
                {filters.categories.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({filters.categories.length})
                  </span>
                )}
              </Label>
              {categoriesOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-1">
              {categories.map((category) => (
                <div key={category} className="flex items-center gap-2">
                  <CustomCheckbox
                    id={`category-${category}`}
                    checked={filters.categories.includes(category)}
                    onCheckedChange={() => handleCategoryToggle(category)}
                  />
                  <label
                    htmlFor={`category-${category}`}
                    className="text-sm cursor-pointer flex-1 leading-tight"
                  >
                    {category}
                  </label>
                </div>
              ))}
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Locations Filter */}
        <Collapsible open={locationsOpen} onOpenChange={setLocationsOpen}>
          <div className="space-y-2">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
              <Label className="text-xs font-semibold text-foreground cursor-pointer">
                Lokalizacje
                {filters.locations.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({filters.locations.length})
                  </span>
                )}
              </Label>
              {locationsOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-1">
              {locations.map((location) => (
                <div key={location} className="flex items-center gap-2">
                  <CustomCheckbox
                    id={`location-${location}`}
                    checked={filters.locations.includes(location)}
                    onCheckedChange={() => handleLocationToggle(location)}
                  />
                  <label
                    htmlFor={`location-${location}`}
                    className="text-sm cursor-pointer"
                  >
                    {location}
                  </label>
                </div>
              ))}
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Salary Range Filter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground">Stawka godzinowa</Label>
            <span className="text-xs text-muted-foreground">
              {filters.salaryRange[0]} - {filters.salaryRange[1]} PLN
            </span>
          </div>
          <Slider
            min={0}
            max={200}
            step={10}
            value={filters.salaryRange}
            onValueChange={handleSalaryChange}
            className="w-full"
          />
        </div>

        {/* Urgent Only Filter */}
        <div className="flex items-center gap-2 pt-2">
          <CustomCheckbox
            id="urgent-only"
            checked={filters.urgentOnly}
            onCheckedChange={handleUrgentToggle}
          />
          <label htmlFor="urgent-only" className="text-sm cursor-pointer font-medium">
            Tylko pilne zgłoszenia
          </label>
        </div>

        {/* Clear Filters Button */}
        {activeFilterCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="w-full mt-4"
          >
            Wyczyść filtry
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default MapFilters;




