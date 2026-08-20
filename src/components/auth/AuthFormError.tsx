import { FormErrorBanner } from '../ui/form-error-banner';

interface AuthFormErrorProps {
  message: string;
  className?: string;
  testId?: string;
}

export function AuthFormError({ message, className, testId }: AuthFormErrorProps) {
  return <FormErrorBanner message={message} className={className} testId={testId} />;
}
