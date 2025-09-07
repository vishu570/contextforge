import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function Home() {
  // Check if user is already authenticated
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  // If authenticated, redirect to dashboard
  if (token) {
    redirect('/dashboard');
  }

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-6 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-6">
            Context<span className="text-blue-400">Forge</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            AI-powered context management platform for organizing, optimizing, and collaborating 
            on prompts, agents, rules, and templates.
          </p>
        </header>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
            <div className="text-blue-400 text-3xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold text-white mb-3">Smart Organization</h3>
            <p className="text-gray-400">
              Automatically categorize and organize your AI prompts, agents, and templates 
              with intelligent folder suggestions.
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
            <div className="text-green-400 text-3xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-white mb-3">AI-Powered</h3>
            <p className="text-gray-400">
              Optimize your content for different AI models, detect duplicates, 
              and enhance quality with built-in intelligence.
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
            <div className="text-purple-400 text-3xl mb-4">🤝</div>
            <h3 className="text-xl font-semibold text-white mb-3">Collaborative</h3>
            <p className="text-gray-400">
              Share your work, track changes, and collaborate with version control 
              and real-time analytics.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-gray-800 inline-block p-8 rounded-xl border border-gray-700">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Ready to get started?
            </h2>
            <p className="text-gray-400 mb-6">
              Join thousands of developers using ContextForge to manage their AI workflows.
            </p>
            
            <div className="flex gap-4 justify-center">
              <Link 
                href="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Get Started Free
              </Link>
              
              <Link 
                href="/login"
                className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500">
          <p>&copy; 2024 ContextForge. Built with Next.js and AI.</p>
        </footer>
      </div>
    </div>
  );
}
