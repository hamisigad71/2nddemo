import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FileQuestion,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  WifiOff,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';

const NotFound = () => {
  const location = useLocation();
  const [showDetails, setShowDetails] = useState(false);
  const [reloading, setReloading] = useState(false);

  const hostname =
    typeof window !== 'undefined' && window.location.hostname
      ? window.location.hostname
      : 'thegentsdollhouse.com';
  const currentUrl =
    typeof window !== 'undefined' && window.location.href
      ? window.location.href
      : `https://${hostname}${location.pathname || '/'}`;

  const handleReload = () => {
    setReloading(true);
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[9999] min-h-screen w-full overflow-y-auto bg-white text-zinc-900 flex items-center justify-center px-4 py-12 selection:bg-blue-100 selection:text-blue-900">
      <div className="w-full max-w-xl">
        <Card className="border-zinc-200/90 bg-white text-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_32px_-4px_rgba(0,0,0,0.05)] rounded-2xl">
          <CardHeader className="px-6 sm:px-8 pt-8 pb-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600">
                <WifiOff className="h-6 w-6 stroke-[1.75]" />
              </div>

              <Badge
                variant="outline"
                className="rounded-full border-zinc-200 bg-zinc-50 px-3 py-1 font-mono text-[11px] font-semibold text-zinc-600"
              >
                404 · ERR_CONNECTION_TIMED_OUT
              </Badge>
            </div>

            <div className="space-y-1.5 pt-1">
              <CardTitle className="text-2xl sm:text-[26px] font-bold tracking-tight text-zinc-900">
                This site can’t be reached
              </CardTitle>
              <CardDescription className="text-sm text-zinc-600 leading-relaxed">
                <span className="font-semibold text-zinc-800">{hostname}</span> took too long to respond or is currently unavailable.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-6 sm:px-8 py-4 space-y-4">
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Try:
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-zinc-700 list-disc pl-4">
                <li>Checking the connection</li>
                <li>Checking the proxy and the firewall</li>
                <li>Running Network Diagnostics</li>
              </ul>
            </div>

            <div className="text-xs text-zinc-500 font-mono">
              ERR_CONNECTION_TIMED_OUT
            </div>

            {showDetails && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600 space-y-2 leading-relaxed">
                <div className="flex items-center gap-2 font-semibold text-zinc-800">
                  <FileQuestion className="h-4 w-4 text-zinc-500 shrink-0" />
                  <span>Check your Internet connection</span>
                </div>
                <p>
                  Check any cables and reboot any routers, modems, or other network devices you may be using.
                </p>
                <p className="pt-1">
                  If <span className="font-mono text-zinc-800 break-all">{currentUrl}</span> is listed in your firewall or antivirus settings, allow your browser to access the network.
                </p>
              </div>
            )}

            <Separator className="bg-zinc-200/80" />
          </CardContent>

          <CardFooter className="px-6 sm:px-8 pb-7 pt-2 flex items-center justify-between gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDetails((prev) => !prev)}
              className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <span>{showDetails ? 'Hide details' : 'Details'}</span>
              {showDetails ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleReload}
              disabled={reloading}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 px-5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${reloading ? 'animate-spin' : ''}`} />
              <span>{reloading ? 'Reloading…' : 'Reload'}</span>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
