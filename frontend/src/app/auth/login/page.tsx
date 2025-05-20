'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import LoginForm from '@/components/auth/LoginForm';
import AlertMessage from '@/components/ui/AlertMessage';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [sessionAlert, setSessionAlert] = useState<{ type: 'warning' | 'info', message: string } | null>(null);

  useEffect(() => {
    // Check if there's a session parameter
    const session = searchParams.get('session');
    if (session === 'expired') {
      setSessionAlert({
        type: 'warning',
        message: 'Your session has expired. Please log in again.'
      });
    } else if (session === 'logout') {
      setSessionAlert({
        type: 'info',
        message: 'You have been successfully logged out.'
      });
    }
  }, [searchParams]);

  return (
    <Layout>
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        {sessionAlert && (
          <div className="w-full max-w-md mb-4">
            <AlertMessage
              type={sessionAlert.type}
              message={sessionAlert.message}
              onClose={() => setSessionAlert(null)}
            />
          </div>
        )}
        <LoginForm />
      </div>
    </Layout>
  );
}
