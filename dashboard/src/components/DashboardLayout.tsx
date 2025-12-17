"use client";

import { ReactNode, useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Zap, 
  Menu, 
  Home, 
  BarChart3, 
  Settings, 
  LogOut,
  DollarSign,
  TrendingUp,
  Bell,
  CreditCard,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface DashboardLayoutProps {
  children: ReactNode;
  balance: number;
  setBalance?: (balance: number) => void;
}

export default function DashboardLayout({ children, balance, setBalance }: DashboardLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isBalanceAnimating, setIsBalanceAnimating] = useState(false);

  // Check if user is demo account and determine which URL to use
  const isTonyDemo = session?.user?.email === "tony@demo.com";
  const isPublicDemo = session?.user?.email === "demo@winworks.com";
  const isDemoUser = isTonyDemo || isPublicDemo;
  
  // Tony demo uses port 8088, public demo uses port 8089
  const externalBettingUrl = isTonyDemo 
    ? "http://216.126.224.63:8088/bet/dashboard" 
    : "http://216.126.224.63:8089/bet/dashboard";

  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },
    { icon: CreditCard, label: "Transactions", href: "/dashboard/transactions" },
    { icon: Settings, label: "Accounts", href: "/dashboard/accounts" },
  ];

  const bettingLinks = isDemoUser ? [
    { id: "live-bets", icon: TrendingUp, label: "Live Bets", href: externalBettingUrl, external: true },
    { id: "props-board", icon: BarChart3, label: "Props Board", href: externalBettingUrl, external: true },
  ] : [
    { id: "live-bets", icon: TrendingUp, label: "Live Bets", href: "/dashboard/bets", external: false },
    { id: "props-board", icon: BarChart3, label: "Props Board", href: "/dashboard/props", external: false },
  ];

  const handleBalanceUpdate = () => {
    setIsBalanceAnimating(true);
    setTimeout(() => setIsBalanceAnimating(false), 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-lg sticky top-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Mobile Menu */}
            <div className="flex items-center gap-4">
              <Sheet>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" className="text-white">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="bg-slate-950 border-white/10">
                  <nav className="space-y-4 mt-8">
                    {menuItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                          pathname === item.href
                            ? "bg-blue-500/20 text-blue-400"
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                      </Link>
                    ))}
                    
                    {/* Betting Links - Mobile */}
                    <div className="pt-6 mt-6 border-t border-white/10">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3 px-4">Betting Tools</h3>
                      {bettingLinks.map((item) => {
                        const isActive = pathname === item.href;
                        const linkClassName = `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                          isActive
                            ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                        }`;
                        
                        return item.external ? (
                          <a
                            key={item.id}
                            href={item.href}
                            className={linkClassName}
                          >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                            <ExternalLink className="w-4 h-4 ml-auto" />
                          </a>
                        ) : (
                          <Link
                            key={item.id}
                            href={item.href}
                            className={linkClassName}
                          >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>

              <Link href="/dashboard" className="flex items-center gap-2">
                <Zap className="w-8 h-8 text-blue-400" />
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hidden sm:inline">
                  WinWorks
                </span>
              </Link>
            </div>

            {/* Balance Display */}
            <motion.div
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-blue-400/30"
              animate={isBalanceAnimating ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              <DollarSign className="w-5 h-5 text-green-400" />
              <div className="text-right">
                <p className="text-xs text-gray-400">Software Balance</p>
                <p className="text-lg font-bold text-white">
                  ${balance.toLocaleString()}
                </p>
              </div>
            </motion.div>

            {/* Notifications and User Menu */}
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:text-blue-400 relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar>
                      <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600">
                        {session?.user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-slate-900 border-white/10" align="end">
                  <DropdownMenuLabel className="text-white">
                    <div>
                      <p className="font-semibold">{session?.user?.name}</p>
                      <p className="text-xs text-gray-400">{session?.user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-white/5">
                    <Settings className="mr-2 w-4 h-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-white/5">
                    <TrendingUp className="mr-2 w-4 h-4" />
                    My Performance
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem 
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogOut className="mr-2 w-4 h-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex gap-6">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            <nav className="space-y-2 sticky top-24">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    pathname === item.href
                      ? "bg-blue-500/20 text-blue-400 border border-blue-400/50"
                      : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
              
              {/* Betting Links */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3 px-4">Betting Tools</h3>
                {bettingLinks.map((item) => {
                  const isActive = pathname === item.href;
                  const linkClassName = `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`;
                  
                  return item.external ? (
                    <a
                      key={item.id}
                      href={item.href}
                      className={linkClassName}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                      <ExternalLink className="w-4 h-4 ml-auto" />
                    </a>
                  ) : (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={linkClassName}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              
              {/* Quick Stats Sidebar */}
              <AccountStatsWidget balance={balance} />
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

// Widget to show account stats
function AccountStatsWidget({ balance }: { balance: number }) {
  const [accountCount, setAccountCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccountCount = async () => {
      try {
        const response = await fetch("/api/accounts");
        if (response.ok) {
          const accounts = await response.json();
          setAccountCount(accounts.length);
        }
      } catch (error) {
        console.error("Error fetching account count:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccountCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAccountCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const weeklyCost = accountCount * 10; // $10 per account per week

  return (
    <div className="mt-6 p-4 bg-white/5 backdrop-blur-lg rounded-lg border border-white/10">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-green-400" />
        Subscription
      </h3>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-400">Current Balance</p>
          <p className="text-lg font-bold text-green-400">${balance.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Active Accounts</p>
          {loading ? (
            <p className="text-lg font-bold text-white">...</p>
          ) : (
            <p className="text-lg font-bold text-white">{accountCount}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-400">Weekly Cost</p>
          {loading ? (
            <p className="text-lg font-bold text-blue-400">...</p>
          ) : (
            <>
              <p className="text-lg font-bold text-blue-400">${weeklyCost}</p>
              <p className="text-xs text-gray-500">$10 × {accountCount} accounts</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

