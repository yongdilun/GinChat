'use client';

import Layout from '@/components/Layout';
import RegisterForm from '@/components/auth/RegisterForm';

// Force this page to be dynamically rendered
export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <Layout>
      <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-16 bg-gradient-to-b from-gray-900 to-gray-800">
        <RegisterForm />
      </div>
    </Layout>
  );
}
