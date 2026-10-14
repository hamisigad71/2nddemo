import { useState } from 'react';
import { ArrowLeft, ExternalLink, Sparkles, Eye, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import CreatorLayout from '../../components/CreatorLayout';
import CreatePostForm from '../../components/CreatePostForm';
import { useAuth } from '../../context/AuthContext';

const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [justPublished, setJustPublished] = useState(false);

  const handlePostCreated = () => {
    setJustPublished(true);
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <CreatorLayout>
      <div className="max-w-3xl mx-auto pb-12">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium mb-3 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Dashboard
            </button>
            <h1 className="text-3xl font-black text-white tracking-tight mb-1 flex items-center gap-2">
              Create New Post <Sparkles className="w-6 h-6 text-red-500" />
            </h1>
            <p className="text-zinc-400 text-sm">
              Upload photos and videos as public posts, subscriber-only content, or pay-per-view media. Save unfinished work as a draft.
            </p>
          </div>

          {user && (
            <Link
              to={`/creator/${user.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/10 rounded-xl text-xs font-bold transition-all shadow-md shrink-0 self-start sm:self-center"
            >
              <Eye className="w-4 h-4 text-red-500" /> View Public Profile <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </Link>
          )}
        </div>

        {/* Success Notice if post published */}
        {justPublished && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-emerald-200 text-sm font-bold">Your post is now live!</p>
                <p className="text-emerald-400/80 text-xs">Instantly visible on the User Feed and your Creator Profile.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/user"
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-all"
              >
                View User Feed →
              </Link>
              {user && (
                <Link
                  to={`/creator/${user.id}`}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-extrabold tracking-wide uppercase shadow"
                >
                  Profile →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Main Post Creator Form */}
        <div className="bg-[#0D0E12] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <CreatePostForm onPostCreated={handlePostCreated} />
        </div>

        {/* Creator Content Tips */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
            <div className="text-xs uppercase font-extrabold tracking-wider text-red-400 mb-2">
              Free Teasers
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed">
              Post high-quality teasers without a padlock so new fans visiting your profile get hooked and convert into paying subscribers.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
            <div className="text-xs uppercase font-extrabold tracking-wider text-emerald-400 mb-2">
              Pay-Per-View (PPV)
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed">
              Charge separately for an individual photo or video. Fans unlock it via M-Pesa; a subscription does not include PPV content.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
            <div className="text-xs uppercase font-extrabold tracking-wider text-blue-400 mb-2">
              Subscriber-only
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed">
              Share posts included with an active subscription. Subscribers do not pay an extra PPV charge.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
            <div className="text-xs uppercase font-extrabold tracking-wider text-zinc-300 mb-2">
              Drafts
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed">
              Save a caption or upload privately and publish it later from My Feed.
            </p>
          </div>
        </div>
      </div>
    </CreatorLayout>
  );
};

export default CreatePost;
