import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { authAPI } from '@/services/api';
import AlertMessage from '@/components/ui/AlertMessage';

type RegisterFormData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type AlertState = {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
};

const RegisterForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<RegisterFormData>();

  const password = watch('password');

  // Clear alert after 5 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setAlert(null);

    try {
      const response = await authAPI.register(data.username, data.email, data.password);

      // Store token in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Show success message briefly before redirect
      setAlert({
        type: 'success',
        message: 'Registration successful! Redirecting to chat...'
      });

      // Redirect to chat page after a short delay
      setTimeout(() => {
        router.push('/chat');
      }, 1000);
    } catch (err: any) {
      // Handle different error scenarios
      if (err.response) {
        if (err.response.status === 409) {
          setAlert({
            type: 'error',
            message: 'This email or username is already registered. Please try another one.'
          });
        } else if (err.response.status === 400) {
          setAlert({
            type: 'error',
            message: err.response.data?.error || 'Invalid registration data. Please check your inputs.'
          });
        } else {
          setAlert({
            type: 'error',
            message: err.response.data?.error || 'An error occurred during registration'
          });
        }
      } else if (err.request) {
        setAlert({
          type: 'error',
          message: 'Network error. Please check your connection and try again.'
        });
      } else {
        setAlert({
          type: 'error',
          message: 'An unexpected error occurred. Please try again.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Create an Account</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Join GinChat and start chatting</p>
      </div>

      {alert && (
        <AlertMessage
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Username
          </label>
          <input
            id="username"
            type="text"
            {...register('username', {
              required: 'Username is required',
              minLength: {
                value: 3,
                message: 'Username must be at least 3 characters',
              },
              maxLength: {
                value: 50,
                message: 'Username must be less than 50 characters',
              },
            })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              }
            })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters',
              }
            })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: value => value === password || 'Passwords do not match'
            })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-all duration-200"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registering...
              </>
            ) : (
              'Register'
            )}
          </button>
        </div>
      </form>

      <div className="text-center mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-500">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;
