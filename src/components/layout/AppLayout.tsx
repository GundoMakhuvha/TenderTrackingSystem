import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  List,
  Plus,
  LogOut,
  User,
  CalendarDays,
  Moon,
  Sun,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import tippFocusLogo from '@/assets/tipp-focus-logo.png';
import NotificationBell from '@/components/NotificationBell';
import { AppBreadcrumbs } from '@/components/layout/AppBreadcrumbs';

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  requiresPermission?: boolean;
  /** Paths that should NOT mark this item active even though they share its prefix. */
  exclude?: string[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Tenders', href: '/tenders', icon: List, exclude: ['/tenders/new', '/tenders/upload'] },
  { name: 'Key Dates', href: '/calendar', icon: CalendarDays },
  { name: 'New Tender', href: '/tenders/new', icon: Plus, requiresPermission: true },
];

function isActivePath(pathname: string, item: NavItem) {
  if (item.href === '/') return pathname === '/';
  if (item.exclude?.some((p) => pathname.startsWith(p))) return false;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, canManageTenders, roles } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = () => {
    if (roles.includes('admin')) return 'Admin';
    if (roles.includes('bids_team')) return 'Bids Team';
    return 'Team Member';
  };

  const filteredNavigation = navigation.filter(
    (item) => !item.requiresPermission || canManageTenders
  );

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <img src={tippFocusLogo} alt="TIPP Focus" className="h-9 w-auto" />
              <span className="font-semibold text-lg hidden sm:inline">Tender Tracker</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1" aria-label="Main">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(pathname, item);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full" aria-label="Account menu">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(profile?.full_name ?? null)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
                    <p className="text-xs leading-none text-primary font-medium mt-1">{getRoleBadge()}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/calendar')}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Key Dates
                </DropdownMenuItem>
                {canManageTenders && (
                  <DropdownMenuItem onClick={() => navigate('/tenders/upload')}>
                    <Upload className="mr-2 h-4 w-4" />
                    Bulk Upload
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden sticky top-16 z-40 border-b bg-card overflow-x-auto" aria-label="Main">
        <div className="flex px-4 gap-1">
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(pathname, item);
            return (
              <Link
                key={item.name}
                to={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main id="main-content" className="container py-6">
        <AppBreadcrumbs />
        {children}
      </main>
    </div>
  );
}
