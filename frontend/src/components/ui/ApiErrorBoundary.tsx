'use client';

import { useState, useEffect } from 'react';
import AlertMessage from './AlertMessage';

interface ApiErrorBoundaryProps {
  children: React.ReactNode;
}

const ApiErrorBoundary = ({ children }: ApiErrorBoundaryProps) => {
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    // Function to check if the backend API is available
    const checkApiAvailability = async () => {
      try {
        // Use a simple fetch to check if the API is available
        // We'll use the /health endpoint at the root level, not under /api
        const response = await fetch('/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Short timeout to avoid long waiting times
          signal: AbortSignal.timeout(3000),
        });
        if (!response.ok) {
          setApiError('Backend API is not responding properly. Some features may not work.');
        } else {
          setApiError(null);
        }
      } catch (error) {
        console.error('API availability check failed:', error);
        // More detailed error logging
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.error('Network error details:', error.message);
        } else if (error instanceof DOMException && error.name === 'AbortError') {
          console.error('Request timed out');
        }
        setApiError('Cannot connect to the backend server. Please ensure it is running.');
      }
    };

    // Check API availability when component mounts
    checkApiAvailability();

    // Also try a direct fetch to the backend to debug CORS issues
    fetch('http://localhost:8080/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors', // Explicitly set CORS mode
    })
      .then(response => {
        console.log('Direct backend access successful:', response.status);
        if (response.ok) {
          setApiError(null);
        }
      })
      .catch(error => {
        console.error('Direct backend access failed:', error);
      });

    // Set up periodic checks - only if there's an error
    // This reduces unnecessary requests to the backend
    const intervalId = setInterval(() => {
      if (apiError) {
        checkApiAvailability();
      }
    }, 60000); // Check every 60 seconds, but only if there's an error

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      {apiError && (
        <div className="fixed top-0 left-0 right-0 z-50 p-4">
          <AlertMessage
            type="error"
            message={
              <div>
                <p>{apiError}</p>
                <p className="text-xs mt-1">
                  If you're a developer, make sure the Go backend server is running at http://localhost:8080
                  <br />
                  Run <code className="bg-gray-100 px-1 rounded">cd backend && go run main.go</code> to start the server.
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
