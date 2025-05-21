'use client';

import { useState, useEffect } from 'react';
import AlertMessage from './AlertMessage';

interface ApiErrorBoundaryProps {
  children: React.ReactNode;
}

const ApiErrorBoundary = ({ children }: ApiErrorBoundaryProps) => {
  const [apiError, setApiError] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://ginchat-14ry.onrender.com';
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Don't show error initially while we're still loading
    setApiError(null);
    
    // Function to check if the backend API is available
    const checkApiAvailability = async () => {
      if (isChecking) return; // Prevent multiple simultaneous checks
      
      setIsChecking(true);
      console.log(`Checking API health at ${apiUrl}/health`);
      
      try {
        // Use a direct fetch to the backend
        const response = await fetch(`${apiUrl}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'no-cors', // Try no-cors to bypass CORS issues
          cache: 'no-cache',
          signal: AbortSignal.timeout(8000),
        });
        
        console.log('Health check response:', response.status, response.statusText);
        
        // With no-cors, we can't access the status, so we assume it's ok if we got here
        setApiError(null);
      } catch (error) {
        console.error('API availability check failed:', error);
        
        // Try a second attempt with CORS mode
        try {
          const corsResponse = await fetch(`${apiUrl}/health`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            mode: 'cors',
            signal: AbortSignal.timeout(8000),
          });
          
          console.log('CORS health check response:', corsResponse.status);
          
          if (corsResponse.ok) {
            setApiError(null);
          } else {
            setApiError('Backend API is not responding properly. Some features may not work.');
          }
        } catch (corsError) {
          console.error('CORS health check failed:', corsError);
          setApiError('Cannot connect to the backend server. Please ensure it is running.');
        }
      } finally {
        setIsChecking(false);
      }
    };

    // Check API availability when component mounts
    checkApiAvailability();

    // Set up periodic checks but with reduced frequency
    const intervalId = setInterval(checkApiAvailability, 60000); // Check every minute

    return () => {
      clearInterval(intervalId);
    };
  }, [apiUrl, isChecking]);

  // If we're in development mode and using localhost, don't show the error
  const isDev = process.env.NODE_ENV === 'development';
  const isLocalBackend = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1');
  const shouldSuppress = isDev && isLocalBackend && apiError;

  return (
    <>
      {apiError && !shouldSuppress && (
        <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-opacity-90">
          <AlertMessage
            type="warning"
            message={
              <div>
                <p>{apiError}</p>
                <p className="text-xs mt-1">
                  Backend server URL: {apiUrl}
                </p>
              </div>
            }
            onClose={() => setApiError(null)}
          />
        </div>
      )}
      {children}
    </>
  );
};

export default ApiErrorBoundary;
