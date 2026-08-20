export type FlagshipDeploymentEnvironment = 'production' | 'preview' | 'development';

export const FLAGSHIP_ENVIRONMENT_LABELS: Record<FlagshipDeploymentEnvironment, string> = {
  production: 'Produkcja',
  preview: 'Preview (feature branch)',
  development: 'Development (lokalnie)',
};

export function getFlagshipDeploymentEnvironment(
  vercelEnv: string | undefined = process.env.VERCEL_ENV,
): FlagshipDeploymentEnvironment {
  if (vercelEnv === 'production') {
    return 'production';
  }
  if (vercelEnv === 'preview') {
    return 'preview';
  }
  return 'development';
}
