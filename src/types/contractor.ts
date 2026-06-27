export interface ServicePricing {
  type: 'hourly' | 'fixed' | 'range';
  min?: number;
  max?: number;
  currency: string;
  /** Jednostka miary (np. m², szt.) — string dla kompatybilności wstecznej */
  unit?: string;
  category?: string;
  subcategory?: string;
  workDescription?: string;
  netPrice?: number;
  vatRate?: number;
  grossPrice?: number;
}

export interface ContractorProfile {
  id: string;
  name: string;
  companyName: string;
  companyType: 'jednoosobowa' | 'sp_z_oo' | 'spolka_cywilna' | 'spolka_akcyjna';
  avatar?: string;
  coverImage?: string;
  location: {
    city: string;
    district?: string;
    coordinates: { lat: number; lng: number };
  };
  contactInfo: {
    phone: string;
    email: string;
    website?: string;
    address: string;
  };
  businessInfo: {
    nip: string;
    regon: string;
    krs?: string;
    yearEstablished: number;
    employeeCount: string;
  };
  rating: {
    overall: number;
    reviewsCount: number;
    categories: {
      quality: number;
      timeliness: number;
      communication: number;
      pricing: number;
    };
  };
  verification: {
    status: 'verified' | 'pending' | 'unverified';
    badges: string[];
    documents: string[];
    lastVerified?: string;
  };
  services: {
    primary: string[];
    secondary: string[];
    specializations: string[];
  };
  experience: {
    yearsInBusiness: number;
    completedProjects: number;
    projectTypes: { [key: string]: number };
    certifications: string[];
  };
  portfolio: {
    images: string[];
    featuredProjects: Array<{
      id: string;
      title: string;
      description: string;
      images: string[];
      budget: string;
      duration: string;
      year: number;
      category: string;
    }>;
  };
  pricing: {
    hourlyRate?: { min: number; max: number };
    projectBased: boolean;
    negotiable: boolean;
    paymentTerms: string[];
    servicePricing?: Record<string, ServicePricing>;
  };
  availability: {
    status: 'dostępny' | 'ograniczona_dostępność' | 'zajęty';
    nextAvailable?: string;
    workingHours: string;
    serviceArea: string[];
  };
  insurance: {
    hasOC: boolean;
    ocAmount?: string;
    hasAC: boolean;
    acAmount?: string;
    validUntil?: string;
  };
  reviews: Array<{
    id: string;
    author: string;
    authorType: 'manager' | 'private';
    rating: number;
    date: string;
    project: string;
    comment: string;
    response?: string;
    helpful: number;
  }>;
  stats: {
    responseTime: string;
    onTimeCompletion: number;
    budgetAccuracy: number;
    rehireRate: number;
  };
  plan: 'basic' | 'pro';
  joinedDate: string;
  lastActive: string;
}

export interface CompanyMetadata {
  service_subcategory_slugs?: string[];
  primary_category_slugs?: string[];
}
