# Frontend/Components/Auth Workspace

## Context
<!-- Update this section per project -->
Authentication UI components and forms. Handles login, signup, password reset, and OAuth provider buttons.

## File Structure
<!-- Update this section per project -->
```
/frontend/components/auth/
├── LoginForm.tsx        # Email/password login with remember me
├── SignupForm.tsx       # Registration with validation
├── ResetPassword.tsx    # Password reset flow
├── OAuthButtons.tsx     # Google/GitHub OAuth providers
├── AuthGuard.tsx        # Route protection wrapper
├── hooks/
│   └── useAuthForm.ts   # Form submission and error handling
└── styles/
    └── auth.module.css  # Auth-specific styling
```

## Core Logic & Patterns
<!-- Update this section per project -->

**Form Validation**: Zod schemas in each component, see `loginSchema` in LoginForm.tsx

**Error Handling**: `useAuthForm` hook manages API errors and displays them inline

**OAuth Flow**: `OAuthButtons` initiates provider flow → callback handled in `/pages/auth/callback`

**Session Check**: `AuthGuard` wraps protected routes, redirects to `/login` if no session

## Environment Variables
<!-- Update this section per project -->
```env
NEXT_PUBLIC_API_URL=         # Backend API endpoint
NEXT_PUBLIC_GOOGLE_CLIENT_ID= # Google OAuth client
NEXT_PUBLIC_GITHUB_CLIENT_ID= # GitHub OAuth client
NEXT_PUBLIC_RECAPTCHA_KEY=   # reCAPTCHA for signup form
```

## External Integrations
<!-- Update this section per project -->

**Supabase Auth**: Client initialized in `/lib/supabase.ts`, handles JWT tokens

**Google reCAPTCHA**: Loaded in SignupForm, verify token sent with registration

**Sentry**: Error tracking, user context set after login in `AuthGuard.tsx`

**Analytics**: Track login/signup events via `analytics.track()` in `/lib/analytics.ts`

## Key Files to Know
<!-- Update this section per project -->

- `/lib/auth.ts` - Core auth utilities (token storage, refresh)
- `/api/auth/` - Backend auth endpoints
- `/types/auth.ts` - User and session TypeScript types
- `/middleware.ts` - Next.js middleware for protected routes
