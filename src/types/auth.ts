import type { User } from '@supabase/supabase-js'
import type { Database } from './database'

// Base types
export type UserType = 'manager' | 'contractor'

// Database types
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']

export type PlatformRole = 'user' | 'platform_admin'

// Authentication user interface (used by useAuth hook)
export interface AuthUser {
  id: string
  email?: string
  firstName: string
  lastName: string
  userType: UserType
  phone?: string
  company?: string
  isVerified: boolean
  /**
   * ISO timestamp of when the user submitted documents for verification.
   * `null` once the admin issues a decision (approved or rejected) — used
   * together with `isVerified` to derive a tri-state on the client.
   */
  verificationSubmittedAt?: string | null
  profileCompleted: boolean
  onboardingCompleted: boolean
  avatar?: string
  platformRole?: PlatformRole
  accountRole?: string | null
  organizationType?: string | null
}

// User with profile interface (used by useUser hook)
export interface UserWithProfile {
  id: string
  email?: string
  firstName: string
  lastName: string
  userType: UserType
  phone?: string
  company?: string
  isVerified: boolean
  profileCompleted: boolean
  onboardingCompleted: boolean
  avatar?: string
  profileId?: string
}

// Form data interfaces
export interface LoginData {
  email: string
  password: string
}

export interface SignUpData {
  email: string
  password: string
  firstName: string
  lastName: string
  userType: UserType
  phone?: string
  company?: string
}

export interface UpdateUserData {
  firstName?: string
  lastName?: string
  phone?: string
  company?: string
  avatarUrl?: string
  profileCompleted?: boolean
  onboardingCompleted?: boolean
}

// Component prop interfaces
export interface LoginPageProps {
  onBack: () => void
  onRegisterClick: () => void
  onForgotPasswordClick: () => void
  onLoginSuccess: () => void
}

export interface RegisterPageProps {
  onBack: () => void
  onLoginClick: () => void
  defaultUserType?: UserType
  onRegistrationSuccess?: () => void
}

export interface UserTypeSelectionPageProps {
  onBack: () => void
  onContractorLogin: () => void
  onContractorRegister: () => void
  onManagerLogin: () => void
  onManagerRegister: () => void
}

export interface MobileUserTypeSelectionProps {
  onBack: () => void
  onUserTypeSelect: (type: UserType, action: 'login' | 'register') => void
}

export interface UserAccountPageProps {
  onBack: () => void
  onVerificationClick?: () => void
  onManagerDashboardClick?: () => void
  onContractorDashboardClick?: () => void
}

// Validation and survey types
export interface ValidationSurveyData {
  userType: UserType
  experience: string
  specialization: string[]
  location: string
  budget: string
  timeline: string
  additionalInfo: string
}

// Authentication state types
export interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface UserState {
  user: UserWithProfile | null
  isLoading: boolean
}

// Hook return types
export interface UseAuthReturn extends AuthState {
  login: (credentials: LoginData) => Promise<void>
  register: (userData: SignUpData) => Promise<void>
  logout: () => Promise<void>
  updateUser: (userData: UpdateUserData) => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

export interface UseUserReturn extends UserState {
  isAuthenticated: boolean
  refresh: () => Promise<void>
}

// Error types
export interface AuthError {
  message: string
  code?: string
}

// Session types
export interface AuthSession {
  user: User | null
  access_token?: string
  refresh_token?: string
}
