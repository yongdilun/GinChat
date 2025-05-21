'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import LoginForm from '@/components/auth/LoginForm';
import AlertMessage from '@/components/ui/AlertMessage';

// Force this page to be dynamically rendered
export const dynamic = 'force-dynamic';

// Loading component to show while the page is loading
function LoginPageLoading() {
  return (
    <Layout>
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// The actual login page content
function LoginPageContent() {
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

// Main page component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginPageContent />
    </Suspense>
  );
}
