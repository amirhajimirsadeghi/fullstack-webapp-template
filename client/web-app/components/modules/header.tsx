import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/hooks/useAuth";
import { toast } from "sonner"
import { useState } from "react";

export default function Header() {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const handleSignOut = async () => {
    setIsLoading(true);
    if (!auth) {
      toast.error('Uh oh! Something went wrong.');
      console.error('No auth provider found');
      setIsLoading(false);
      return;
    }
    try {
      await auth.handleSignOut();
    } catch (error) {
      toast.error('Uh oh! Something went wrong.');
      console.error('Error occurred', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <header className="bg-background">
      <div className="container mx-auto py-1 flex justify-between items-center">
        <Logo />
        {auth?.isSignedIn && (
          <Button
            onClick={handleSignOut}
            disabled={isLoading}
          >
            {isLoading ? 'Signing out...' : 'Sign Out'}
          </Button>
        )}
      </div>
    </header>
  );
}