import { useState } from 'react';
import UserLayout from '../../components/UserLayout';
import { Crown, Star, Gem, Check, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const tiers = [
  {
    name: 'Silver Fan',
    price: '1,000',
    icon: Star,
    color: 'text-slate-400',
    bg: 'bg-slate-400/10',
    border: 'border-slate-500/20',
    shadow: 'hover:shadow-[0_0_20px_rgba(148,163,184,0.15)]',
    buttonColor: 'bg-slate-700 hover:bg-slate-600',
    features: [
      'Access to standard feeds',
      'Basic messaging with creators',
      'Standard customer support',
      'Access to public galleries'
    ]
  },
  {
    name: 'Gold VIP',
    price: '5,000',
    icon: Crown,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-500/30',
    shadow: 'hover:shadow-[0_0_30px_rgba(251,191,36,0.2)]',
    buttonColor: 'bg-amber-500 text-black hover:bg-amber-400',
    popular: true,
    features: [
      'All Silver features',
      'Exclusive behind-the-scenes content',
      'Priority messaging response',
      'Weekly VIP live streams',
      'High-resolution downloads'
    ]
  },
  {
    name: 'Diamond Elite',
    price: '15,000',
    icon: Gem,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-500/30',
    shadow: 'hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]',
    buttonColor: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/30',
    features: [
      'All Gold VIP features',
      '1-on-1 private video calls (monthly)',
      'Direct WhatsApp access to creators',
      'Personalized custom content requests',
      'VIP concierge support 24/7',
      'Exclusive physical merchandise'
    ]
  }
];

const ApplyMembership = () => {
  const [selectedTier, setSelectedTier] = useState<string | null>('Gold VIP');

  return (
    <UserLayout>
      <div className="max-w-5xl mx-auto py-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-red-500/10 rounded-full mb-4 ring-1 ring-red-500/20">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4">
            Upgrade Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-rose-400">Experience</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get closer to your favorite creators with exclusive perks, private content, and VIP treatment. Choose the tier that matches your desires.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div 
              key={tier.name}
              onClick={() => setSelectedTier(tier.name)}
              className={`relative bg-[#0D0E12] rounded-3xl p-8 border cursor-pointer transition-all duration-300 ${tier.border} ${tier.shadow} ${
                selectedTier === tier.name ? 'scale-105 border-white/40 shadow-2xl z-10 bg-black/60 backdrop-blur-sm' : 'hover:scale-[1.02] opacity-80 hover:opacity-100'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                  Most Popular
                </div>
              )}
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-muted-foreground">KES</span>
                    <span className={`text-4xl font-black ${tier.color}`}>{tier.price}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                </div>
                <div className={`p-3 rounded-2xl ${tier.bg}`}>
                  <tier.icon className={`w-8 h-8 ${tier.color}`} />
                </div>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                {tier.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 min-w-[20px]">
                      <Check className={`w-5 h-5 ${tier.color}`} />
                    </div>
                    <span className="text-sm font-medium text-white/90 leading-tight">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <Link 
                  to="/checkout" 
                  className={`flex items-center justify-center w-full py-4 rounded-xl font-bold transition-all text-white max-w-full ${tier.buttonColor}`}
                >
                  Select Plan
                </Link>
              </div>

              {/* Active Indicator overlay effect */}
              {selectedTier === tier.name && (
                <div className="absolute inset-0 rounded-3xl border-2 border-white/20 pointer-events-none" />
              )}
            </div>
          ))}
        </div>
        
        {/* Security badge at bottom */}
        <div className="mt-16 flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          Secure, encrypted, and discrete billing.
        </div>
      </div>
    </UserLayout>
  );
};

export default ApplyMembership;
