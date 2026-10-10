import CreatorLayout from '../../components/CreatorLayout';
import { Target, DollarSign, Users, Zap, Rocket, ShieldCheck, PlayCircle, CheckCircle2, TrendingUp, HelpCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

const surface = 'bg-[#121318]';
const borderUniform = 'border border-white/[0.06]';
const hoverLift = 'hover:-translate-y-0.5 transition-all duration-200';

const CreatorGuide = () => {
  const [activeCategory, setActiveCategory] = useState('all');

  const guides = [
    {
      id: 'getting-started',
      category: 'basics',
      title: 'Setting Up a High-Converting Creator Profile',
      readTime: '5 min read',
      level: 'Beginner',
      icon: Target,
      summary: 'Learn how to optimize your bio, avatar, subscription pricing, and preview media to attract subscribers.',
      keyTakeaways: [
        'Use high-contrast, professional profile photos and dynamic banner art.',
        'Set your subscription price strategically (e.g. KES 500 – KES 1,500/mo).',
        'Pin a welcome video or introductory teaser post to your feed.'
      ]
    },
    {
      id: 'pricing-strategy',
      category: 'earnings',
      title: 'Maximizing Earnings: Subscriptions vs. Pay-Per-View',
      readTime: '7 min read',
      level: 'Intermediate',
      icon: DollarSign,
      summary: 'Discover the exact pricing formula top creators use to combine monthly recurring subscriptions with locked DM media and exclusive PPV posts.',
      keyTakeaways: [
        'Offer monthly subscription tiers for predictable recurring income.',
        'Send exclusive locked photo set DMs to fans with custom unlocked prices.',
        'Leverage tip goals on live streams and special post releases.'
      ]
    },
    {
      id: 'fan-engagement',
      category: 'growth',
      title: 'Building Fan Loyalty & Retaining Subscribers',
      readTime: '6 min read',
      level: 'Intermediate',
      icon: Users,
      summary: 'Strategies to build a tight-knit fan community, manage DM volume with automated welcome messages, and increase renewal rates.',
      keyTakeaways: [
        'Set up automated welcome messages with special intro offers using Automations.',
        'Respond to subscriber messages within 24 hours to foster strong connection.',
        'Schedule weekly recurring content drops.'
      ]
    },
    {
      id: 'mpesa-payouts',
      category: 'payouts',
      title: 'Fast M-Pesa Payouts & Statutory Compliance',
      readTime: '4 min read',
      level: 'Essential',
      icon: Zap,
      summary: 'Complete your KYC identity verification and configure instant B2C M-Pesa payouts directly to your phone number.',
      keyTakeaways: [
        'Complete KYC Verification under Kenya AML regulations in Edit Profile.',
        'Verify your mobile number via 6-digit SMS OTP to unlock M-Pesa payouts.',
        'Withdraw earnings seamlessly once your balance reaches KES 500.'
      ]
    },
    {
      id: 'social-traffic',
      category: 'growth',
      title: 'Driving Traffic from Social Media',
      readTime: '8 min read',
      level: 'Advanced',
      icon: Rocket,
      summary: 'Proven funnel tactics to convert casual social media followers into paying VIP subscribers on The Gents Dollhouse.',
      keyTakeaways: [
        'Place your custom profile link in your social media bios.',
        'Share clean SFW preview snippets with clear calls-to-action.',
        'Run limited-time promotional discount links using the Promotions feature.'
      ]
    }
  ];

  const categories = [
    { id: 'all', label: 'All guides' },
    { id: 'basics', label: 'Getting started' },
    { id: 'earnings', label: 'Monetization' },
    { id: 'growth', label: 'Fan growth' },
    { id: 'payouts', label: 'Payouts & KYC' },
  ];

  const filteredGuides = activeCategory === 'all' 
    ? guides 
    : guides.filter(g => g.category === activeCategory);

  const stats = [
    { icon: DollarSign, label: 'Direct M-Pesa transfers' },
    { icon: TrendingUp, label: 'Keep 80%+ of earnings' },
    { icon: Zap, label: 'Automated welcome offers' },
  ];

  return (
    <CreatorLayout>
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header */}
        <header className="space-y-4">
          <div className="flex items-center gap-2 text-red-500 text-xs font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Creator Academy
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
            Creator Playbook
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xl">
            Essential strategies to optimize your profile, increase subscribers, manage M-Pesa payouts, and grow your monthly earnings.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link 
              to="/edit-profile" 
              className={`bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2`}
            >
              <ShieldCheck className="w-4 h-4" /> Verify account to earn
            </Link>
            <Link 
              to="/create-post" 
              className={`${surface} ${borderUniform} hover:border-white/10 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2`}
            >
              <PlayCircle className="w-4 h-4 text-red-500" /> Create post
            </Link>
          </div>
        </header>

        {/* Stats Row */}
        <div className={`${surface} ${borderUniform} rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-0 sm:divide-x sm:divide-white/[0.06]`}>
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="flex items-center gap-3 sm:px-6 first:sm:pl-2 last:sm:pr-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-zinc-300">{stat.label}</span>
              </div>
            );
          })}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-red-600 text-white'
                  : `${surface} text-zinc-400 ${borderUniform} hover:text-white hover:border-white/10`
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Playbook Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredGuides.map((guide) => {
            const IconComponent = guide.icon;
            return (
              <article 
                key={guide.id}
                className={`${surface} ${borderUniform} rounded-xl p-5 flex flex-col justify-between ${hoverLift} hover:border-white/10 group`}
              >
                <div>
                  {/* Card top bar */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                      <IconComponent className="w-[18px] h-[18px]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-zinc-500">
                        {guide.readTime}
                      </span>
                      <span className="text-[11px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">
                        {guide.level}
                      </span>
                    </div>
                  </div>

                  {/* Title & summary */}
                  <h3 className="text-[15px] font-semibold text-white leading-snug mb-1.5">
                    {guide.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                    {guide.summary}
                  </p>

                  {/* Key actions */}
                  <div className="space-y-2 mb-4">
                    <div className="text-[11px] font-semibold text-zinc-500 mb-1">Key actions</div>
                    {guide.keyTakeaways.map((takeaway, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <span>{takeaway}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card footer */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-500">Guide</span>
                  <button className="text-xs font-semibold text-zinc-400 group-hover:text-red-500 flex items-center gap-1 transition-colors">
                    Read details <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Footer Support */}
        <div className={`${surface} ${borderUniform} rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
              <HelpCircle className="w-[18px] h-[18px]" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">Need help or profile guidance?</h4>
              <p className="text-xs text-zinc-400">Contact platform support for 1-on-1 creator assistance.</p>
            </div>
          </div>
          <Link
            to="/messages"
            className={`w-full sm:w-auto text-center ${surface} ${borderUniform} hover:border-white/10 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap`}
          >
            Support chat
          </Link>
        </div>

      </div>
    </CreatorLayout>
  );
};

export default CreatorGuide;
