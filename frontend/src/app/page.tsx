'use client';

import Link from 'next/link';
import Layout from '@/components/Layout';

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

export default function Home() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-8">
              Welcome to GinChat
              </h1>
            <p className="text-xl mb-12">
              A modern real-time chat application built with Go and React
              </p>
            <div className="flex justify-center space-x-4">
                  <Link
                    href="/auth/login"
                className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                <span>Get Started</span>
                <ArrowRightIcon className="w-5 h-5" />
                  </Link>
                </div>
              </div>

          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-primary-500 transition-colors">
              <h3 className="text-xl font-semibold mb-4">Real-time Chat</h3>
              <p className="text-gray-300">
                Experience instant messaging with WebSocket technology
              </p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-primary-500 transition-colors">
              <h3 className="text-xl font-semibold mb-4">Media Sharing</h3>
              <p className="text-gray-300">
                Share images, audio, and video with your chat partners
              </p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-primary-500 transition-colors">
              <h3 className="text-xl font-semibold mb-4">Multiple Chatrooms</h3>
              <p className="text-gray-300">
                Create and join different chatrooms for various topics
                    </p>
                  </div>
                </div>

          <div className="mt-24 text-center">
            <h2 className="text-3xl font-bold mb-8">Why Choose GinChat?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-primary-500 transition-colors">
                <h3 className="text-xl font-semibold mb-4">Modern Tech Stack</h3>
                <p className="text-gray-300">
                  Built with Go, React, and WebSocket for optimal performance
                    </p>
                  </div>
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-primary-500 transition-colors">
                <h3 className="text-xl font-semibold mb-4">User-Friendly</h3>
                <p className="text-gray-300">
                  Clean and intuitive interface for the best user experience
                    </p>
                  </div>
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-primary-500 transition-colors">
                <h3 className="text-xl font-semibold mb-4">Secure</h3>
                <p className="text-gray-300">
                  JWT authentication and secure WebSocket connections
                    </p>
                  </div>
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-primary-500 transition-colors">
                <h3 className="text-xl font-semibold mb-4">Responsive</h3>
                <p className="text-gray-300">
                  Works seamlessly on desktop and mobile devices
                </p>
            </div>
          </div>
        </div>

          <div className="mt-24 text-center">
            <h2 className="text-3xl font-bold mb-8">Ready to Start Chatting?</h2>
            <p className="text-xl mb-8">
              Join GinChat today and experience modern real-time communication
            </p>
            <Link
              href="/auth/register"
              className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-lg inline-flex items-center space-x-2 transition-colors"
            >
              <span>Sign Up Now</span>
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
