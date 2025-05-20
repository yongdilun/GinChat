'use client';

import Layout from '@/components/Layout';
import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <Layout>
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <RegisterForm />
      </div>
    </Layout>
  );
}
