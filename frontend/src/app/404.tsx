'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Special handling for auth routes - redirect to login
    if (pathname?.startsWith('/auth/')) {
      router.push('/auth/login');
    }
  }, [pathname, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">404 - Page Not Found</h1>
        
        {pathname?.startsWith('/auth/') ? (
          <>
            <p className="text-gray-600 mb-6">Redirecting to login page...</p>
            <div className="animate-pulse bg-blue-100 rounded-full h-2 w-24 mx-auto mb-6"></div>
          </>
        ) : (
          <>
            <p className="text-gray-600 mb-6">The page you're looking for doesn't exist or has been moved.</p>
            <Link href="/" className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded transition-colors inline-block">
              Go to Home
            </Link>
          </>
        )}
      </div>
    </div>
  );
} 