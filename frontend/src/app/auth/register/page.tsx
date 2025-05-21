'use client';

import Layout from '@/components/Layout';
import RegisterForm from '@/components/auth/RegisterForm';

// Force this page to be dynamically rendered
export const dynamic = 'force-dynamic';

// Skip static generation during build
export async function generateStaticParams() {
  return [];
}

export default function RegisterPage() {
  return (
    <Layout>
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <RegisterForm />
      </div>
    </Layout>
  );
}
