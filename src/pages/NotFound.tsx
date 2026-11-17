import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { FileQuestion, Home, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn('404: no route for', location.pathname);
    document.title = 'Page not found | Tender Tracker';
  }, [location.pathname]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <FileQuestion className="h-14 w-14 mx-auto text-muted-foreground mb-4" />
        <h1 className="mb-2 text-4xl font-bold">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">We couldn't find that page.</p>
        <div className="flex justify-center gap-2">
          <Button asChild>
            <Link to="/"><Home className="mr-2 h-4 w-4" />Dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/tenders"><List className="mr-2 h-4 w-4" />All tenders</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
