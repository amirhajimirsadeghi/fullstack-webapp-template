import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRootError,
} from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useAuth, SignUpNextSteps, SignUpError, ConfirmSignUpError } from '@/components/hooks/useAuth';
import { useState } from 'react';
import { useRouter } from 'next/router';

const signUpFormSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one symbol"),
})

function SignUpForm({ goToConfirm }: { goToConfirm: () => void }) {
  const auth = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof signUpFormSchema>>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof signUpFormSchema>) => {
    setIsLoading(true);
    form.clearErrors();
    if (!auth) {
      console.error('No auth provider found');
      form.setError("root", { type: "server", message: "Error occurred" })
      setIsLoading(false);
      return;
    }
    try {
      const nextStep = await auth.handleSignUp(values.name, values.email, values.password);
      if (nextStep === SignUpNextSteps.CONFIRM_SIGN_UP) {
        goToConfirm();
      } else if (nextStep === SignUpNextSteps.DONE) {
        router.push('/');
      } else {
        console.error('Unknown sign up step', nextStep);
      }
    } catch (error) {
      if (error === SignUpError.USER_ALREADY_EXISTS) {
        form.setError("root", { type: "server", message: "User already exists" })
      } else {
        form.setError("root", { type: "server", message: "Error occurred" })
        console.error('Error occurred:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }


  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    form.clearErrors();
    if (!auth) {
      form.setError("root", { type: "server", message: "Error occurred" })
      console.error('No auth provider found');
      setIsLoading(false);
      return;
    }
    try {
      await auth?.handleGoogleSignIn();
    } catch (error) {
      console.error('Error during Google sign in', error);
      form.setError("root", { type: "server", message: "Error occurred" })
    } finally {
      setIsLoading(false);
    }
  }


  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign Up</CardTitle>
        <CardDescription>Enter your email and password to sign up for an account</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormRootError />
            <Button type='button' variant="ghost" className="w-full mb-4 border" disabled={isLoading} onClick={handleGoogleSignIn}>
              <img src="/icons/google.png" alt="Google" className="w-4 h-4 mr-2" />
              Sign up with Google
            </Button>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="********" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Submitting...' : 'Submit'}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );

}

const confirmSignUpFormSchema = z.object({
  code: z.string(),
})

function ConfirmSignUpForm() {
  const auth = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof confirmSignUpFormSchema>>({
    resolver: zodResolver(confirmSignUpFormSchema),
    defaultValues: {
      code: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof confirmSignUpFormSchema>) => {
    form.clearErrors();
    setIsLoading(true);
    if (!auth) {
      console.error('No auth provider found');
      form.setError("root", { type: "server", message: "Error occurred" })
      setIsLoading(false);
      return;
    }
    try {
      await auth.handleConfirmSignUp(values.code);
      router.push('/');
    } catch (error) {
      if (error === ConfirmSignUpError.INCORRECT_CODE) {
        form.setError("root", { type: "server", message: "Incorrect code" })
      } else {
        form.setError("root", { type: "server", message: "Error occurred" })
        console.error('Error occurred', error);
      }
    } finally {
      setIsLoading(false);
    }
  }


  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Confirm Sign Up</CardTitle>
        <CardDescription>Enter the code sent to your email to confirm your account</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormRootError />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input placeholder="1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Submitting...' : 'Submit'}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );

}


enum SignUpStep {
  SIGN_UP = 'signUp',
  CONFIRM_SIGN_UP = 'confirmSignUp',
}

export default function SignUp() {
  const [step, setStep] = useState<SignUpStep>(SignUpStep.SIGN_UP);

  return (
    <div>
      {step === SignUpStep.SIGN_UP && <SignUpForm goToConfirm={() => setStep(SignUpStep.CONFIRM_SIGN_UP)} />}
      {step === SignUpStep.CONFIRM_SIGN_UP && <ConfirmSignUpForm />}
    </div>
  );
}
