const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    const nestedRedirects = [
      { source: '/admin/verification/:path*', destination: '/administracja/weryfikacja/:path*' },
      { source: '/admin/verification', destination: '/administracja/weryfikacja' },
      { source: '/admin/settings', destination: '/administracja/ustawienia' },
      { source: '/admin/offers', destination: '/administracja/oferty' },
      { source: '/admin/listings', destination: '/administracja/ogloszenia' },
      { source: '/register/verification-choice', destination: '/rejestracja/wybor-weryfikacji' },
      { source: '/manager-dashboard/overview', destination: '/panel-zarzadcy/konkursy' },
      { source: '/panel-zarzadcy/przeglad', destination: '/panel-zarzadcy/konkursy' },
      { source: '/zlecenia/:path*', destination: '/konkurs/:path*' },
      { source: '/dodaj-zlecenie', destination: '/dodaj-konkurs' },
      { source: '/dodaj-zlecenie/:path*', destination: '/dodaj-konkurs/:path*' },
      { source: '/wybor-typu-zlecenia', destination: '/wybor-typu-konkursu' },
      { source: '/panel-zarzadcy/zlecenia/:id/applications', destination: '/panel-zarzadcy/konkursy/:id/aplikacje' },
      { source: '/panel-zarzadcy/zlecenia', destination: '/panel-zarzadcy/konkursy' },
      { source: '/panel-zarzadcy/zlecenia/:path*', destination: '/panel-zarzadcy/konkursy/:path*' },
      { source: '/manager-dashboard/jobs/:path*', destination: '/panel-zarzadcy/konkursy/:path*' },
      { source: '/manager-dashboard/contractors/:path*', destination: '/panel-zarzadcy/wykonawcy/:path*' },
      { source: '/manager-dashboard/tenders/:path*', destination: '/panel-zarzadcy/przetargi/:path*' },
      { source: '/contractor-dashboard/dashboard/:path*', destination: '/panel-wykonawcy/panel/:path*' },
      { source: '/contractor-dashboard/dashboard', destination: '/panel-wykonawcy/panel' },
      { source: '/contractor-dashboard/applications/:path*', destination: '/panel-wykonawcy/aplikacje/:path*' },
      { source: '/contractor-dashboard/applications', destination: '/panel-wykonawcy/aplikacje' },
      { source: '/contractor-dashboard/favorites/:path*', destination: '/panel-wykonawcy/ulubione/:path*' },
      { source: '/contractor-dashboard/favorites', destination: '/panel-wykonawcy/ulubione' },
      { source: '/contractor-dashboard/ratings/:path*', destination: '/panel-wykonawcy/oceny/:path*' },
      { source: '/contractor-dashboard/ratings', destination: '/panel-wykonawcy/oceny' },
      { source: '/contractor-dashboard/pricing/:path*', destination: '/panel-wykonawcy/cennik/:path*' },
      { source: '/contractor-dashboard/pricing', destination: '/panel-wykonawcy/cennik' },
      { source: '/contractor-dashboard/projects/:path*', destination: '/panel-wykonawcy/projekty/:path*' },
      { source: '/contractor-dashboard/projects', destination: '/panel-wykonawcy/projekty' },
      { source: '/auth/update-password', destination: '/auth/aktualizacja-hasla' },
    ];

    const polishRouteRedirects = [
      ['account', 'konto'],
      ['admin', 'administracja'],
      ['bookmarked-jobs', 'zapisane-zgloszenia'],
      ['contractor-dashboard', 'panel-wykonawcy'],
      ['contractors', 'wykonawcy'],
      ['expert-consultation', 'konsultacja-eksperta'],
      ['forgot-password', 'zapomniane-haslo'],
      ['job-type-selection', 'wybor-typu-konkursu'],
      ['jobs', 'konkurs'],
      ['login', 'logowanie'],
      ['manager-dashboard', 'panel-zarzadcy'],
      ['managers', 'zarzadcy'],
      ['messages', 'wiadomosci'],
      ['onboarding', 'wdrozenie'],
      ['post-contest', 'dodaj-konkurs'],
      ['post-job', 'dodaj-konkurs'],
      ['post-tender', 'dodaj-przetarg'],
      ['privacy', 'polityka-prywatnosci'],
      ['profile-completion', 'uzupelnianie-profilu'],
      ['register', 'rejestracja'],
      ['tender-creation', 'tworzenie-przetargu'],
      ['terms', 'regulamin'],
      ['tutorial', 'samouczek'],
      ['user-type-selection', 'wybor-typu-konta'],
      ['verification', 'weryfikacja'],
      ['welcome', 'powitanie'],
      ['contest-questions', 'pytania-konkursu'],
    ];

    return [
      {
        source: '/pricing',
        destination: '/',
        permanent: true,
      },
      ...nestedRedirects.map(({ source, destination }) => ({
        source,
        destination,
        permanent: true,
      })),
      ...polishRouteRedirects.map(([from, to]) => ({
        source: `/${from}/:path*`,
        destination: `/${to}/:path*`,
        permanent: true,
      })),
      ...polishRouteRedirects.map(([from, to]) => ({
        source: `/${from}`,
        destination: `/${to}`,
        permanent: true,
      })),
    ];
  },
  images: {
    remotePatterns: [
      ...(process.env.NODE_ENV === 'development'
        ? [
            {
              protocol: 'http',
              hostname: 'localhost',
            },
          ]
        : []),
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Server Action bodySizeLimit is not wired into renderOpts in Next 16.0.7; large
  // file uploads use /api/weryfikacja/upload instead. Keep this for when Next fixes it.
  serverActions: {
    bodySizeLimit: '50mb',
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  experimental: {
    // Headroom for multipart verification document uploads via Route Handlers (10 MB per file).
    proxyClientMaxBodySize: 12 * 1024 * 1024,
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip',
      'recharts',
    ],
  },
  // Turbopack config - empty to allow webpack config for production builds
  turbopack: {},
  // Webpack config is only used for production builds when --webpack flag is used
  // In dev mode with --turbopack, this config is ignored (warning is harmless)
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size (only applies in production builds, not with Turbopack)
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for large libraries
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Separate chunk for Google Maps
            googleMaps: {
              name: 'google-maps',
              test: /[\\/]node_modules[\\/](@googlemaps|google)/,
              chunks: 'all',
              priority: 30,
            },
            // Separate chunk for Radix UI
            radixUI: {
              name: 'radix-ui',
              test: /[\\/]node_modules[\\/]@radix-ui/,
              chunks: 'all',
              priority: 25,
            },
            // Separate chunk for Recharts
            recharts: {
              name: 'recharts',
              test: /[\\/]node_modules[\\/]recharts/,
              chunks: 'all',
              priority: 25,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
}

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
})
