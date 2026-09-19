import { Alert, AlertDescription } from '../ui/alert';

interface HousingAlertsProps {
  error: string;
  success: string;
}

export function HousingAlerts({ error, success }: HousingAlertsProps) {
  return (
    <>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
