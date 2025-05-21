'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthNotFound() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page
    router.push('/auth/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Loading authentication...</h1>
        <p className="text-gray-600">You will be redirected automatically.</p>
      </div>
    </div>
  );
} 