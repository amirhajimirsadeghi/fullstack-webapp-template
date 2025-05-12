import { Logo } from "@/components/ui/logo";
import SignIn from "./sign-in";
import { Tabs, TabsTrigger, TabsContent, TabsList } from "@/components/ui/tabs";
import SignUp from "./sign-up";
import { useAuth } from "@/components/hooks/useAuth";
import { useRouter } from "next/router";

const AuthPage = () => {
  const auth = useAuth();
  const router = useRouter();
  if (auth?.isSignedIn) {
    router.push("/");
  }
  return (
    <main className="min-h-screen flex flex-col items-center pt-16">
      <Logo size="large" />
      <div className="max-w-md w-full p-6">
        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <SignIn />
          </TabsContent>
          <TabsContent value="signup">
            <SignUp />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default AuthPage;
