'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
export async function login(formData: FormData) {
  const supabase = await createClient()

  // Type-casting here for convenience
  // In practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // Type-casting here for convenience
  // In practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    firstName: formData.get('firstName') as string,
    lastName: formData.get('lastName') as string,
    userType: formData.get('userType') as 'manager' | 'contractor',
    phone: formData.get('phone') as string,
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
        user_type: data.userType,
        phone: data.phone,
      }
    }
  })

  if (authError) {
    redirect('/error')
  }

  if (authData.user) {
    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        user_type: data.userType,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone || null,
        is_verified: false,
        profile_completed: false,
        onboarding_completed: false
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      // Continue anyway - the user can complete profile later
    }
  }

  revalidatePath('/', 'layout')
  redirect('/auth/confirm')
}

export async function signOut() {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  
  if (error) {
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/logowanie')
  }

  const profileData = {
    first_name: formData.get('firstName') as string,
    last_name: formData.get('lastName') as string,
    phone: formData.get('phone') as string,
    profile_completed: true,
  }

  const { error } = await supabase
    .from('user_profiles')
    .update(profileData)
    .eq('id', user.id)

  if (error) {
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
