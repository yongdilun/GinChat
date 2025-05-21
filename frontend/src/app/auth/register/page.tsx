'use client';

import Layout from '@/components/Layout';
import RegisterForm from '@/components/auth/RegisterForm';

// Force Next.js to render this page dynamically at request time
export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <Layout>
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <RegisterForm />
      </div>
    </Layout>
  );
}
