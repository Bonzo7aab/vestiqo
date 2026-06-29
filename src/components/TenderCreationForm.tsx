import {
  Award,
  Calculator,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileText,
  MapPin,
  Minus,
  Plus,
  X
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Collapsible, CollapsibleContent } from './ui/collapsible';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { TenderWithCompany } from '../lib/database/jobs';

interface TenderCreationFormProps {
  onClose: () => void;
  onSubmit: (tender: NewTender, tenderId?: string) => void;
  tenderId?: string;
  initialData?: TenderWithCompany;
}

interface NewTender {
  title: string;
  description: string;
  category: string;
  location: string;
  estimatedValue: string;
  currency: string;
  submissionDeadline: Date;
  evaluationDeadline: Date;
  requirements: string[];
  evaluationCriteria: EvaluationCriterion[];
  documents: TenderDocument[];
  isPublic: boolean;
  allowQuestions: boolean;
  questionsDeadline?: Date;
  minimumExperience: number;
  requiredCertificates: string[];
  insuranceRequired: string;
  advancePayment: boolean;
  performanceBond: boolean;
  status?: 'draft' | 'active';
}

interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  type: 'price' | 'quality' | 'time' | 'experience' | 'other';
}

interface TenderDocument {
  id: string;
  name: string;
  type: 'specification' | 'requirements' | 'drawings' | 'other';
  file: File;
}

const categories = [
  'Utrzymanie Czystości i Zieleni',
  'Roboty Remontowo-Budowlane', 
  'Instalacje i systemy',
  'Utrzymanie techniczne i konserwacja',
  'Specjalistyczne usługi'
];

// Available certificates (removed unused constant - kept for potential future use)
const _availableCertificates = [
  'ISO 9001 - System zarządzania jakością',
  'ISO 14001 - System zarządzania środowiskowego',
  'OHSAS 18001 - Bezpieczeństwo i higiena pracy',
  'Certyfikat DDD - Dezynfekcja, Dezynsekcja, Deratyzacja',
  'Uprawnienia budowlane',
  'Uprawnienia SEP',
  'Certyfikat spawacza',
  'Uprawnienia UDT',
  'Certyfikat energetyczny',
  'Certyfikat ekologiczny'
];

// Generate unique colors for criteria based on their position in sorted list
const getAllColors = (): string[] => {
  return [
    'bg-red-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 
    'bg-pink-500', 'bg-indigo-500', 'bg-orange-500', 'bg-teal-500', 
    'bg-cyan-500', 'bg-amber-500', 'bg-emerald-500', 'bg-violet-500',
    'bg-rose-500', 'bg-sky-500', 'bg-lime-500', 'bg-fuchsia-500',
    'bg-stone-500', 'bg-slate-500', 'bg-zinc-500', 'bg-neutral-500'
  ];
};

// Get color for a criterion based on its index in sorted list (ensures uniqueness)
const getCriterionColor = (index: number): string => {
  const allColors = getAllColors();
  return allColors[index % allColors.length];
};


const defaultCriteria: EvaluationCriterion[] = [
  {
    id: 'price',
    name: 'Cena oferty',
    description: 'Łączna cena realizacji zamówienia',
    weight: 40,
    type: 'price'
  },
  {
    id: 'quality',
    name: 'Jakość wykonania',
    description: 'Doświadczenie, referencje i portfolio wykonawcy',
    weight: 30,
    type: 'quality'
  },
  {
    id: 'time',
    name: 'Termin realizacji',
    description: 'Proponowany czas wykonania prac',
    weight: 20,
    type: 'time'
  },
  {
    id: 'warranty',
    name: 'Gwarancja i serwis',
    description: 'Okres gwarancji i jakość serwisu posprzedażowego',
    weight: 10,
    type: 'quality'
  }
];

export const TenderCreationForm: React.FC<TenderCreationFormProps> = ({
  onClose,
  onSubmit,
  tenderId,
  initialData
}) => {
  const isEditMode = !!tenderId && !!initialData;

  const [formData, setFormData] = useState<NewTender>({
    title: '',
    description: '',
    category: '',
    location: '',
    estimatedValue: '',
    currency: 'PLN',
    submissionDeadline: new Date(),
    evaluationDeadline: new Date(),
    requirements: [''],
    evaluationCriteria: defaultCriteria,
    documents: [],
    isPublic: true,
    allowQuestions: true,
    questionsDeadline: undefined,
    minimumExperience: 1,
    requiredCertificates: [],
    insuranceRequired: '500000',
    advancePayment: false,
    performanceBond: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
    new Set()
  );

  // Track if form has been initialized to prevent cascading renders
  const hasInitialized = useRef(false);

  // Populate form with initial data when editing
  useEffect(() => {
    if (isEditMode && initialData && !hasInitialized.current) {
      hasInitialized.current = true;
      
      // Convert location to string if it's an object
      const locationString = typeof initialData.location === 'string' 
        ? initialData.location 
        : initialData.location && typeof initialData.location === 'object' && 'city' in initialData.location
          ? initialData.location.city + (initialData.location.sublocality_level_1 ? `, ${initialData.location.sublocality_level_1}` : '')
          : '';
      
      // Use setTimeout to make setState asynchronous and avoid cascading renders
      setTimeout(() => {
        setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        category: initialData.category?.name || '',
        location: locationString,
        estimatedValue: initialData.estimated_value?.toString() || '',
        currency: initialData.currency || 'PLN',
        submissionDeadline: initialData.submission_deadline ? new Date(initialData.submission_deadline) : new Date(),
        evaluationDeadline: ('evaluation_deadline' in initialData && initialData.evaluation_deadline) ? new Date(initialData.evaluation_deadline as string) : new Date(),
        requirements: initialData.requirements && initialData.requirements.length > 0 
          ? initialData.requirements 
          : [''],
        evaluationCriteria: initialData.evaluation_criteria && Array.isArray(initialData.evaluation_criteria)
          ? initialData.evaluation_criteria.map((criterion: Record<string, unknown>) => ({
              id: (criterion.id as string) || `criterion-${Date.now()}-${Math.random()}`,
              name: (criterion.name as string) || '',
              description: (criterion.description as string) || '',
              weight: (criterion.weight as number) || 0,
              type: ((criterion.type as 'price' | 'quality' | 'time' | 'experience' | 'other') || 'quality') as 'price' | 'quality' | 'time' | 'experience' | 'other'
            }))
          : defaultCriteria,
        documents: [], // Documents from DB are not File objects, so we start fresh
        isPublic: ('is_public' in initialData ? initialData.is_public : true) as boolean,
        allowQuestions: true, // Not stored in DB, default to true
        questionsDeadline: undefined,
        minimumExperience: 1,
        requiredCertificates: [],
        insuranceRequired: '500000',
        advancePayment: false,
        performanceBond: false,
        status: initialData.status as 'draft' | 'active' || 'draft'
        });
      }, 0);
    }
  }, [isEditMode, initialData]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.title.trim()) newErrors.title = 'Tytuł jest wymagany';
      if (!formData.description.trim()) newErrors.description = 'Opis jest wymagany';
      if (!formData.category) newErrors.category = 'Kategoria jest wymagana';
      if (!formData.location.trim()) newErrors.location = 'Lokalizacja jest wymagana';
    }

    if (step === 2) {
      if (!formData.estimatedValue) newErrors.estimatedValue = 'Szacowana wartość jest wymagana';
      if (isNaN(Number(formData.estimatedValue))) newErrors.estimatedValue = 'Wartość musi być liczbą';
      if (formData.submissionDeadline <= new Date()) newErrors.submissionDeadline = 'Termin składania ofert musi być w przyszłości';
      if (formData.evaluationDeadline <= formData.submissionDeadline) newErrors.evaluationDeadline = 'Termin oceny musi być po terminie składania ofert';
    }

    if (step === 3) {
      const totalWeight = formData.evaluationCriteria.reduce((sum, criteria) => sum + criteria.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.1) {
        newErrors.criteria = 'Suma wag kryteriów musi wynosić 100%';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleStepClick = (step: number) => {
    // In edit mode, allow clicking any step without validation
    if (isEditMode) {
      setCurrentStep(step);
      return;
    }
    
    // Allow going backward without validation
    if (step < currentStep) {
      setCurrentStep(step);
      return;
    }
    
    // For going forward, validate all previous steps
    if (step > currentStep) {
      let canProceed = true;
      for (let i = 1; i < step; i++) {
        if (!validateStep(i)) {
          canProceed = false;
          break;
        }
      }
      if (canProceed) {
        setCurrentStep(step);
      }
    }
  };

  const handleSubmit = (asDraft: boolean = false) => {
    if (!asDraft && !validateStep(currentStep)) return;

    const tender: NewTender = {
      ...formData,
      requirements: formData.requirements.filter(req => req.trim() !== ''),
      status: asDraft ? 'draft' : 'active'
    };

    onSubmit(tender, tenderId);
    toast.success(
      isEditMode 
        ? (asDraft ? 'Przetarg zaktualizowany jako szkic' : 'Przetarg został zaktualizowany i opublikowany')
        : (asDraft ? 'Przetarg zapisany jako szkic' : 'Przetarg został opublikowany')
    );
    onClose();
  };

  const addRequirement = () => {
    setFormData(prev => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }));
  };

  const updateRequirement = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.map((req, i) => i === index ? value : req)
    }));
  };

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const updateCriterion = (id: string, field: keyof EvaluationCriterion, value: EvaluationCriterion[keyof EvaluationCriterion]) => {
    setFormData(prev => ({
      ...prev,
      evaluationCriteria: prev.evaluationCriteria.map(criterion => 
        criterion.id === id ? { ...criterion, [field]: value } : criterion
      )
    }));
  };

  const addCriterion = () => {
    const newCriterion: EvaluationCriterion = {
      id: `custom-${Date.now()}`,
      name: '',
      description: '',
      weight: 5,
      type: 'quality'
    };
    
    setFormData(prev => ({
      ...prev,
      evaluationCriteria: [...prev.evaluationCriteria, newCriterion]
    }));
  };

  const removeCriterion = (id: string) => {
    const remainingCriteria = formData.evaluationCriteria.filter(c => c.id !== id);
    
    if (remainingCriteria.length === 0) {
      setFormData(prev => ({
        ...prev,
        evaluationCriteria: []
      }));
      setExpandedDescriptions(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }
    
    setFormData(prev => {
      const newCriteria = prev.evaluationCriteria.filter(c => c.id !== id);
      const remainingTotal = newCriteria.reduce((sum, c) => sum + c.weight, 0);
      
      // Always redistribute to 100% proportionally, ensuring we never exceed 100%
      if (remainingTotal > 0) {
        // Scale all weights proportionally to sum to 100%
        const scaleFactor = 100 / remainingTotal;
        
        const redistributedCriteria = newCriteria.map(criterion => {
          const scaledWeight = criterion.weight * scaleFactor;
          // Round to nearest 0.5
          const roundedWeight = Math.round(scaledWeight * 2) / 2;
          return {
            ...criterion,
            weight: Math.max(5, Math.min(100, roundedWeight))
          };
        });
        
        // Ensure total doesn't exceed 100% (shouldn't happen, but safety check)
        const finalTotal = redistributedCriteria.reduce((sum, c) => sum + c.weight, 0);
        if (finalTotal > 100) {
          // Scale down proportionally to ensure we don't exceed 100%
          const scale = 100 / finalTotal;
          return {
            ...prev,
            evaluationCriteria: redistributedCriteria.map(criterion => ({
              ...criterion,
              weight: Math.max(5, Math.round(criterion.weight * scale * 2) / 2)
            }))
          };
        }
        
        // If total is less than 100%, distribute the difference proportionally
        const difference = 100 - finalTotal;
        if (Math.abs(difference) > 0.25) {
          const adjustmentPerCriterion = difference / redistributedCriteria.length;
          return {
            ...prev,
            evaluationCriteria: redistributedCriteria.map(criterion => {
              const adjustedWeight = criterion.weight + adjustmentPerCriterion;
              return {
                ...criterion,
                weight: Math.max(5, Math.min(100, Math.round(adjustedWeight * 2) / 2))
              };
            })
          };
        }
        
        return {
          ...prev,
          evaluationCriteria: redistributedCriteria
        };
      }
      
      // If remaining total is 0, set equal weights
      const equalWeight = 100 / newCriteria.length;
      return {
        ...prev,
        evaluationCriteria: newCriteria.map(criterion => ({
          ...criterion,
          weight: Math.round(equalWeight * 2) / 2
        }))
      };
    });
    
    setExpandedDescriptions(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const normalizeWeights = () => {
    const currentTotal = formData.evaluationCriteria.reduce((sum, c) => sum + c.weight, 0);
    if (currentTotal === 0) {
      return;
    }
    
    setFormData(prev => {
      // First, normalize and round to 0.5%
      const normalizedCriteria = prev.evaluationCriteria.map(criterion => {
        const normalizedWeight = (criterion.weight / currentTotal) * 100;
        // Round to nearest 0.5
        return {
          ...criterion,
          weight: Math.round(normalizedWeight * 2) / 2
        };
      });
      
      // Calculate the actual total after rounding
      const roundedTotal = normalizedCriteria.reduce((sum, c) => sum + c.weight, 0);
      
      // If total exceeds 100%, scale down proportionally
      if (roundedTotal > 100) {
        const scale = 100 / roundedTotal;
        return {
          ...prev,
          evaluationCriteria: normalizedCriteria.map(criterion => ({
            ...criterion,
            weight: Math.max(5, Math.round(criterion.weight * scale * 2) / 2)
          }))
        };
      }
      
      // If total is less than 100%, distribute the difference proportionally
      const difference = 100 - roundedTotal;
      if (Math.abs(difference) > 0.25) {
        const adjustmentPerCriterion = difference / normalizedCriteria.length;
        return {
          ...prev,
          evaluationCriteria: normalizedCriteria.map(criterion => {
            const adjustedWeight = criterion.weight + adjustmentPerCriterion;
            return {
              ...criterion,
              weight: Math.max(5, Math.min(100, Math.round(adjustedWeight * 2) / 2))
            };
          })
        };
      }
      
      return {
        ...prev,
        evaluationCriteria: normalizedCriteria
      };
    });
  };

  const autoFillTo100 = () => {
    const currentTotal = formData.evaluationCriteria.reduce((sum, c) => sum + c.weight, 0);
    const difference = 100 - currentTotal;
    
    if (Math.abs(difference) < 0.1) {
      toast.info('Suma wag już wynosi 100%');
      return;
    }
    
    if (currentTotal === 0) {
      // If all weights are 0, distribute equally
      const equalWeight = 100 / formData.evaluationCriteria.length;
      setFormData(prev => ({
        ...prev,
        evaluationCriteria: prev.evaluationCriteria.map(criterion => ({
          ...criterion,
          weight: Math.round(equalWeight * 2) / 2 // Round to nearest 0.5
        }))
      }));
      // Normalize to ensure exactly 100%
      setTimeout(() => {
        normalizeWeights();
      }, 0);
      toast.success('Wagi zostały automatycznie dostosowane do 100%');
      return;
    }
    
    // Distribute the difference proportionally based on current weights
    // Ensure minimum of 5% per criterion and never exceed 100%
    setFormData(prev => {
      const newCriteria = prev.evaluationCriteria.map(criterion => {
        // Calculate proportional adjustment
        const proportion = criterion.weight / currentTotal;
        const adjustment = difference * proportion;
        const newWeight = criterion.weight + adjustment;
        // Round to nearest 0.5
        const roundedWeight = Math.round(newWeight * 2) / 2;
        return {
          ...criterion,
          weight: Math.max(5, Math.min(100, roundedWeight))
        };
      });
      
      // Calculate new total and adjust if needed
      const newTotal = newCriteria.reduce((sum, c) => sum + c.weight, 0);
      const finalDifference = 100 - newTotal;
      
      // Ensure we never exceed 100%
      if (newTotal > 100) {
        // Scale down proportionally to ensure we don't exceed 100%
        const scale = 100 / newTotal;
        return {
          ...prev,
          evaluationCriteria: newCriteria.map(criterion => ({
            ...criterion,
            weight: Math.max(5, Math.round(criterion.weight * scale * 2) / 2)
          }))
        };
      }
      
      // Distribute final difference if needed
      if (Math.abs(finalDifference) > 0.25) {
        const adjustmentPerCriterion = finalDifference / newCriteria.length;
        return {
          ...prev,
          evaluationCriteria: newCriteria.map(criterion => {
            const adjustedWeight = criterion.weight + adjustmentPerCriterion;
            return {
              ...criterion,
              weight: Math.max(5, Math.min(100, Math.round(adjustedWeight * 2) / 2))
            };
          })
        };
      }
      
      return {
        ...prev,
        evaluationCriteria: newCriteria
      };
    });
    
    // Final normalization to ensure exactly 100%
    setTimeout(() => {
      normalizeWeights();
    }, 50);
    
    toast.success('Wagi zostały automatycznie dostosowane do 100%');
  };

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
            <div>
              <h2 className="text-2xl font-bold">{isEditMode ? 'Edytuj przetarg' : 'Nowy przetarg'}</h2>
              <p className="text-gray-600">Krok {currentStep} z {totalSteps}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 pt-4 flex-shrink-0">
            <div className="flex items-start">
              {Array.from({ length: totalSteps }, (_, i) => {
                const labels = ['Podstawowe', 'Warunki', 'Kryteria', 'Podsumowanie'];
                const stepNumber = i + 1;
                const isActive = stepNumber === currentStep;
                const isCompleted = stepNumber < currentStep;
                // In edit mode, all steps are clickable; otherwise only completed/current steps
                const isClickable = isEditMode || stepNumber <= currentStep || isCompleted;
                
                return (
                  <React.Fragment key={i}>
                    <div className="flex flex-col items-center" style={{ flex: '0 0 auto' }}>
                      <button
                        type="button"
                        onClick={() => handleStepClick(stepNumber)}
                        disabled={!isClickable && !isEditMode && stepNumber > currentStep}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700'
                            : isCompleted
                            ? 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700'
                            : isClickable || isEditMode
                            ? 'bg-gray-200 text-gray-600 cursor-pointer hover:bg-gray-300'
                            : 'bg-gray-200 text-gray-600 cursor-not-allowed opacity-50'
                        }`}
                        title={isClickable || isEditMode ? `Przejdź do kroku ${stepNumber}: ${labels[i]}` : 'Najpierw uzupełnij poprzednie kroki'}
                      >
                        {stepNumber}
                      </button>
                      <span className={`text-xs mt-2 whitespace-nowrap ${
                        isActive ? 'text-blue-600 font-medium' : 'text-gray-500'
                      }`}>
                        {labels[i]}
                      </span>
                    </div>
                    {i < totalSteps - 1 && (
                      <div className={`h-1 flex-1 mt-4 mx-2 ${
                        isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Podstawowe informacje
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">Tytuł przetargu *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="np. Kompleksowy remont elewacji budynku"
                        className={errors.title ? 'border-red-500' : ''}
                      />
                      {errors.title && (
                        <p className="text-sm text-red-600 mt-1">{errors.title}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="description">Opis szczegółowy *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Szczegółowy opis zakresu prac, wymagań i oczekiwań..."
                        rows={4}
                        className={errors.description ? 'border-red-500' : ''}
                      />
                      {errors.description && (
                        <p className="text-sm text-red-600 mt-1">{errors.description}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Kategoria *</Label>
                        <Select 
                          value={formData.category} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Wybierz kategorię" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.category && (
                          <p className="text-sm text-red-600 mt-1">{errors.category}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="location">Lokalizacja *</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="np. Warszawa, Mokotów"
                          className={errors.location ? 'border-red-500' : ''}
                        />
                        {errors.location && (
                          <p className="text-sm text-red-600 mt-1">{errors.location}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Terms and Deadlines */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Warunki finansowe i terminowe
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="estimatedValue">Szacowana wartość *</Label>
                        <Input
                          id="estimatedValue"
                          type="number"
                          value={formData.estimatedValue}
                          onChange={(e) => setFormData(prev => ({ ...prev, estimatedValue: e.target.value }))}
                          placeholder="450000"
                          className={errors.estimatedValue ? 'border-red-500' : ''}
                        />
                        {errors.estimatedValue && (
                          <p className="text-sm text-red-600 mt-1">{errors.estimatedValue}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="currency">Waluta</Label>
                        <Select 
                          value={formData.currency} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PLN">PLN</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="submissionDeadline">Termin składania ofert *</Label>
                        <Input
                          id="submissionDeadline"
                          type="datetime-local"
                          value={formData.submissionDeadline.toISOString().slice(0, 16)}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            submissionDeadline: new Date(e.target.value) 
                          }))}
                          className={errors.submissionDeadline ? 'border-red-500' : ''}
                        />
                        {errors.submissionDeadline && (
                          <p className="text-sm text-red-600 mt-1">{errors.submissionDeadline}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="evaluationDeadline">Termin oceny ofert *</Label>
                        <Input
                          id="evaluationDeadline"
                          type="datetime-local"
                          value={formData.evaluationDeadline.toISOString().slice(0, 16)}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            evaluationDeadline: new Date(e.target.value) 
                          }))}
                          className={errors.evaluationDeadline ? 'border-red-500' : ''}
                        />
                        {errors.evaluationDeadline && (
                          <p className="text-sm text-red-600 mt-1">{errors.evaluationDeadline}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>Wymagania dla wykonawców</Label>
                      <div className="space-y-2">
                        {formData.requirements.map((requirement, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={requirement}
                              onChange={(e) => updateRequirement(index, e.target.value)}
                              placeholder="np. Doświadczenie min. 3 lata w remontach elewacji"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeRequirement(index)}
                              disabled={formData.requirements.length === 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addRequirement}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Dodaj wymaganie
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Evaluation Criteria */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <Card className="flex flex-col max-h-[calc(90vh-200px)] overflow-hidden">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Kryteria oceny ofert
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-y-auto flex-1 min-h-0">
                    {(() => {
                      // Sort criteria by weight (highest first)
                      const sortedCriteria = [...formData.evaluationCriteria].sort((a, b) => b.weight - a.weight);
                      const totalWeight = formData.evaluationCriteria.reduce((sum, criteria) => sum + criteria.weight, 0);
                      const isWeightValid = Math.abs(totalWeight - 100) < 0.1;
                      
                      return (
                        <>
                          {/* Prominent Weight Total Banner */}
                          <div className={`mb-6 p-4 rounded-lg border-2 ${
                            isWeightValid 
                              ? 'bg-green-50 border-green-300' 
                              : 'bg-red-50 border-red-300'
                          }`}>
                            <div className="flex items-center justify-between flex-wrap gap-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${
                                  isWeightValid ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                  <Calculator className={`h-5 w-5 ${
                                    isWeightValid ? 'text-green-700' : 'text-red-700'
                                  }`} />
                                </div>
                                <div>
                                  <div className={`text-lg font-bold ${
                                    isWeightValid ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                    Suma wag: {totalWeight.toFixed(1)}% / 100%
                                  </div>
                                  {!isWeightValid && (
                                    <div className="text-sm text-red-600 font-medium mt-1">
                                      Suma wag kryteriów musi wynosić 100%
                                    </div>
                                  )}
                                  {isWeightValid && (
                                    <div className="text-sm text-green-600 font-medium mt-1">
                                      ✓ Wszystkie kryteria mają poprawną sumę wag
                                    </div>
                                  )}
                                </div>
                              </div>
                              {!isWeightValid && (
                                <Button
                                  type="button"
                                  onClick={autoFillTo100}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <Calculator className="h-4 w-4 mr-2" />
                                  Automatycznie uzupełnij do 100%
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Weight Distribution - Main Slider */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Rozkład wag:</Label>
                            <div className="space-y-3">
                              {/* Main Combined Slider */}
                              <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
                                {sortedCriteria.map((criterion, index) => {
                                  const colorClass = getCriterionColor(index);
                                  const totalWeight = sortedCriteria.reduce((sum, c) => sum + c.weight, 0);
                                  const scaleFactor = totalWeight > 0 ? Math.min(100 / totalWeight, 1) : 0;
                                  
                                  const previousWeights = sortedCriteria
                                    .slice(0, index)
                                    .reduce((sum, c) => sum + c.weight, 0);
                                  
                                  const scaledWidth = criterion.weight * scaleFactor;
                                  const scaledLeft = previousWeights * scaleFactor;
                                  const width = Math.max(0, scaledWidth);
                                  const left = Math.max(0, scaledLeft);
                                  
                                  return (
                                    <div
                                      key={criterion.id}
                                      className={`absolute h-full ${colorClass} transition-all duration-300`}
                                      style={{
                                        left: `${left}%`,
                                        width: `${width}%`,
                                        minWidth: criterion.weight > 0 ? '2px' : '0'
                                      }}
                                      title={`${criterion.name || `Kryterium ${index + 1}`}: ${criterion.weight.toFixed(1)}%`}
                                    />
                                  );
                                })}
                              </div>
                              {/* Legend */}
                              <div className="flex flex-wrap gap-3 text-xs">
                                {sortedCriteria.map((criterion, index) => {
                                  const colorClass = getCriterionColor(index);
                                  return (
                                    <div key={criterion.id} className="flex items-center gap-1.5">
                                      <div className={`w-3 h-3 rounded ${colorClass}`} />
                                      <span className="font-medium">{criterion.name || `Kryterium ${index + 1}`}</span>
                                      <span className="text-muted-foreground">({criterion.weight.toFixed(1)}%)</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <Separator className="my-6" />

                          {/* Criteria List */}
                          <div className="space-y-6">
                            {sortedCriteria.map((criterion, index) => {
                              const isExpanded = expandedDescriptions.has(criterion.id);
                              const colorClass = getCriterionColor(index);
                              return (
                                <div key={criterion.id} className={`rounded-lg p-4 space-y-4 bg-card border border-border`}>
                            {/* Main Criterion Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                              <div className="md:col-span-4">
                                <Label htmlFor={`name-${criterion.id}`}>Nazwa kryterium</Label>
                                <Input
                                  id={`name-${criterion.id}`}
                                  value={criterion.name}
                                  required
                                  onChange={(e) => updateCriterion(criterion.id, 'name', e.target.value)}
                                  placeholder="np. Cena oferty"
                                />
                              </div>
                              
                              <div className="md:col-span-3">
                                <Label htmlFor={`type-${criterion.id}`}>Typ</Label>
                                <Select 
                                  value={criterion.type} 
                                  onValueChange={(value) => updateCriterion(criterion.id, 'type', value)}
                                >
                                  <SelectTrigger id={`type-${criterion.id}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="price">Cena</SelectItem>
                                    <SelectItem value="quality">Jakość</SelectItem>
                                    <SelectItem value="time">Czas</SelectItem>
                                    <SelectItem value="experience">Doświadczenie</SelectItem>
                                    <SelectItem value="other">Inne</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="md:col-span-3">
                                <Label htmlFor={`weight-${criterion.id}`}>Waga (%)</Label>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      id={`weight-${criterion.id}`}
                                      type="number"
                                      min="5"
                                      max="100"
                                      step="0.5"
                                      value={criterion.weight}
                                      onChange={(e) => {
                                        const value = Number(e.target.value);
                                        // Round to nearest 0.5
                                        const roundedValue = Math.round(value * 2) / 2;
                                        updateCriterion(criterion.id, 'weight', Math.max(5, Math.min(100, roundedValue)));
                                      }}
                                      className="flex-1"
                                    />
                                    <Badge className={`min-w-[50px] justify-center ${colorClass} text-white`}>
                                      {criterion.weight.toFixed(1)}%
                                    </Badge>
                                  </div>
                                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${colorClass} transition-all duration-300 rounded-full`}
                                      style={{ width: `${Math.min(100, Math.max(0, criterion.weight))}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="md:col-span-2 flex items-end gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleDescription(criterion.id)}
                                  className="flex-1"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-4 w-4 mr-1" />
                                      <span className="text-xs">Ukryj</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4 mr-1" />
                                      <span className="text-xs">Opis</span>
                                    </>
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeCriterion(criterion.id)}
                                  disabled={formData.evaluationCriteria.length === 1}
                                  className="px-2"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Collapsible Description */}
                            <Collapsible open={isExpanded} onOpenChange={() => toggleDescription(criterion.id)}>
                              <CollapsibleContent>
                                <div className="pt-2">
                                  <Label htmlFor={`desc-${criterion.id}`}>Opis (opcjonalny)</Label>
                                  <Textarea
                                    id={`desc-${criterion.id}`}
                                    value={criterion.description}
                                    onChange={(e) => updateCriterion(criterion.id, 'description', e.target.value)}
                                    placeholder="Szczegółowy opis kryterium oceny"
                                    rows={2}
                                    className="mt-1"
                                  />
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        );
                      })}
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={addCriterion}
                            className="flex items-center gap-2 w-full"
                          >
                            <Plus className="h-4 w-4" />
                            Dodaj kryterium
                          </Button>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 4: Summary */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Podsumowanie przetargu
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Basic Information Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold mb-3 text-blue-700 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Podstawowe informacje
                        </h4>
                        <div className="space-y-2.5 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-gray-700 min-w-[80px]">Tytuł:</span>
                            <span className="text-gray-900">{formData.title}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-gray-700 min-w-[80px]">Kategoria:</span>
                            <span className="text-gray-900">{formData.category}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-gray-700 min-w-[80px]">Lokalizacja:</span>
                            <span className="text-gray-900 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-blue-600" />
                              {formData.location}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-gray-700 min-w-[80px]">Wartość:</span>
                            <span className="font-semibold flex items-center gap-1 text-blue-600">
                              <DollarSign className="h-3 w-3" />
                              {formData.estimatedValue ? `${parseInt(formData.estimatedValue).toLocaleString('pl-PL')} ${formData.currency}` : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <h4 className="font-semibold mb-3 text-purple-700 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Terminy
                        </h4>
                        <div className="space-y-2.5 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-gray-700 min-w-[140px]">Składanie ofert:</span>
                            <span className="text-gray-900">{formData.submissionDeadline.toLocaleString('pl-PL')}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-gray-700 min-w-[140px]">Ocena ofert:</span>
                            <span className="text-gray-900">{formData.evaluationDeadline.toLocaleString('pl-PL')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Requirements Section */}
                    {formData.requirements.filter(req => req.trim()).length > 0 && (
                      <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <h4 className="font-semibold mb-3 text-amber-700 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Wymagania
                        </h4>
                        <ul className="space-y-2 text-sm">
                          {formData.requirements.filter(req => req.trim()).map((req, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-amber-600 mt-1">•</span>
                              <span className="text-gray-900">{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Evaluation Criteria Section */}
                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                      <h4 className="font-semibold mb-3 text-indigo-700 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Kryteria oceny
                      </h4>
                      <div className="space-y-3">
                        {(() => {
                          const sortedCriteria = [...formData.evaluationCriteria].sort((a, b) => b.weight - a.weight);
                          return sortedCriteria.map((criterion, index) => {
                            const colorClass = getCriterionColor(index);
                            return (
                              <div key={criterion.id} className="flex justify-between items-center bg-card rounded-lg p-3 border border-border">
                                <span className="text-sm font-medium text-gray-900">{criterion.name}</span>
                                <Badge className={`${colorClass} text-white min-w-[60px] justify-center`}>
                                  {criterion.weight.toFixed(1)}%
                                </Badge>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Success Alert */}
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <strong>Przetarg jest gotowy do publikacji.</strong> Po opublikowaniu wykonawcy będą mogli składać oferty.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50 flex-shrink-0">
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Anuluj
              </Button>
              {currentStep > 1 && (
                <Button 
                  variant="outline" 
                  onClick={handlePrevious}
                  className="min-w-[100px]"
                >
                  Poprzedni
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {currentStep === totalSteps && (
                <Button variant="outline" onClick={() => handleSubmit(true)}>
                  Zapisz jako szkic
                </Button>
              )}
              
              {currentStep < totalSteps ? (
                <Button onClick={handleNext}>
                  Następny
                </Button>
              ) : (
                <Button onClick={() => handleSubmit(false)}>
                  Opublikuj przetarg
                </Button>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default TenderCreationForm;