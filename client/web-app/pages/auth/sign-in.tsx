import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
import { useAuth, SignInNextSteps, SignInError, ForgotPasswordError, ConfirmSignUpError } from '@/components/hooks/useAuth';
import { useRouter } from 'next/router';
import { ArrowLeftIcon } from 'lucide-react';


const signInFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
function SignInForm({ goToNewPassword, goToForgotPassword, goToConfirmSignUp }: { goToNewPassword: () => void, goToForgotPassword: () => void, goToConfirmSignUp: () => void }) {
  const auth = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof signInFormSchema>>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // when federated sign in fails, we get an error in the query param of the root url which we redirect to
  // this as a hack to handle the error
  useEffect(() => {
    console.log(JSON.stringify(router.query));
    if (router.query.error && router.query.error === "EMAIL_EXISTS_EXCEPTION") {
      form.setError("root", { type: "server", message: "An account with this email already exists" })
    }
  }, [router.query, form]);

  const onSubmit = async (values: z.infer<typeof signInFormSchema>) => {
    form.clearErrors();
    setIsLoading(true);
    if (!auth) {
      form.setError("root", { type: "server", message: "Error occurred" })
      console.error('No auth provider found');
      setIsLoading(false);
      return;
    }
    try {
      const nextStep = await auth.handleSignIn(values.email, values.password);
      switch (nextStep) {
        case SignInNextSteps.CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED:
          goToNewPassword();
          break;
        case SignInNextSteps.RESET_PASSWORD:
          goToNewPassword();
          break;
        case SignInNextSteps.CONFIRM_SIGN_UP:
          goToConfirmSignUp();
          break;
        case SignInNextSteps.DONE:
          router.push('/');
          break;
        default:
          form.setError("root", { type: "server", message: "Error occurred" })
          console.error(`Unknown sign in step: ${nextStep}`);
          break;
      }
    } catch (error) {
      if (error === SignInError.USER_NOT_FOUND) {
        form.setError("root", { type: "server", message: "User not found" })
      } else if (error === SignInError.INCORRECT_PASSWORD) {
        form.setError("root", { type: "server", message: "Incorrect password" })
      } else {
        console.error('Error during sign in', error);
        form.setError("root", { type: "server", message: "Error occurred" })
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
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your email and password to sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormRootError />
            <Button type='button' variant="ghost" className="w-full mb-4 border" disabled={isLoading} onClick={handleGoogleSignIn}>
              <img src="/icons/google.png" alt="Google" className="w-4 h-4 mr-2" />
              Sign in with Google
            </Button>
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Submit'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <Button variant="link" onClick={goToForgotPassword}>Forgot password?</Button>
      </CardFooter>
    </Card>
  )
}

const forgotPasswordFormSchema = z.object({
  email: z.string().email(),
})
function ForgotPasswordForm({ goToConfirmResetPassword, goBack }: { goToConfirmResetPassword: () => void, goBack: () => void }): React.ReactNode {
  const auth = useAuth();
  const form = useForm<z.infer<typeof forgotPasswordFormSchema>>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof forgotPasswordFormSchema>) => {
    form.clearErrors();
    if (!auth) {
      form.setError("root", { type: "server", message: "Error occurred" })
      console.error('No auth provider found');
      return;
    }
    try {
      await auth.handleResetPassword(values.email);
      goToConfirmResetPassword();
    } catch (error) {
      if (error === ForgotPasswordError.USER_NOT_FOUND) {
        form.setError("root", { type: "server", message: "User not found" })
      } else {
        form.setError("root", { type: "server", message: "Error occurred" })
        console.error('Error occurred', error);
      }
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
          <CardTitle>Forgot Password</CardTitle>
        </div>
        <CardDescription>Enter your email to reset your password</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormRootError />
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
            <Button type="submit">Submit</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

const confirmResetPasswordFormSchema = z.object({
  code: z.string().length(6).regex(/^\d+$/, "Code must be a number"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one symbol"),
})
function ConfirmResetPasswordForm(): React.ReactNode {
  const auth = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof confirmResetPasswordFormSchema>>({
    resolver: zodResolver(confirmResetPasswordFormSchema),
    defaultValues: {
      code: '',
      newPassword: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof confirmResetPasswordFormSchema>) => {
    form.clearErrors();
    setIsLoading(true);
    if (!auth) {
      form.setError("root", { type: "server", message: "Error occurred" })
      console.error('No auth provider found');
      setIsLoading(false);
      return;
    }
    if (!auth.user) {
      form.setError("root", { type: "server", message: "Error occurred" })
      console.error('No user found');
      return;
    }
    try {
      await auth.handleConfirmResetPassword(auth.user.email, values.code, values.newPassword);
      router.push('/');
    } catch (error) {
      if (error === ForgotPasswordError.INCORRECT_CODE) {
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
        <CardTitle>Confirm Reset Password</CardTitle>
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
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
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
  )
}

const newPasswordFormSchema = z.object({
  newPassword: z.string().min(8),
})
function NewPasswordForm(): React.ReactNode {
  const auth = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof newPasswordFormSchema>>({
    resolver: zodResolver(newPasswordFormSchema),
    defaultValues: {
      newPassword: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof newPasswordFormSchema>) => {
    form.clearErrors();
    setIsLoading(true);
    if (!auth) {
      form.setError("root", { type: "server", message: "Error occurred" })
      console.error('No auth provider found');
      setIsLoading(false);
      return;
    }
    if (!auth.user) {
      form.setError("root", { type: "server", message: "Error occurred" })
      console.error('No user found');
      return;
    }
    try {
      await auth.confirmSignInWithNewPassword(values.newPassword);
      router.push('/');
    } catch (error) {
      form.setError("root", { type: "server", message: "Error occurred" })
      console.error('Error occurred', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>New Password</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
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
  )
}

const confirmSignUpFormSchema = z.object({
  code: z.string().length(6).regex(/^\d+$/, "Code must be a number"),
})

function ConfirmSignUpForm({ goToSignIn }: { goToSignIn: () => void }) {
  const auth = useAuth();
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
      form.setError("root", { type: "server", message: "Error occurred" })
      console.error('No auth provider found');
      setIsLoading(false);
      return;
    }
    try {
      await auth.handleConfirmSignUp(values.code);
      goToSignIn();
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
        <CardTitle>Finish Sign Up First</CardTitle>
        <CardDescription>Enter the code sent to your email to finish signing up</CardDescription>
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

enum SignInStep {
  SIGN_IN = 'signIn',
  FORGOT_PASSWORD = 'forgotPassword',
  CONFIRM_RESET_PASSWORD = 'confirmResetPassword',
  NEW_PASSWORD = 'newPassword',
  CONFIRM_SIGN_UP = 'confirmSignUp',
}

export default function SignIn() {
  const [step, setStep] = useState<SignInStep>(SignInStep.SIGN_IN);

  return (
    <div>
      {step === SignInStep.SIGN_IN && <SignInForm goToNewPassword={() => setStep(SignInStep.NEW_PASSWORD)} goToForgotPassword={() => setStep(SignInStep.FORGOT_PASSWORD)} goToConfirmSignUp={() => setStep(SignInStep.CONFIRM_SIGN_UP)} />}
      {step === SignInStep.FORGOT_PASSWORD && <ForgotPasswordForm goToConfirmResetPassword={() => setStep(SignInStep.CONFIRM_RESET_PASSWORD)} goBack={() => setStep(SignInStep.SIGN_IN)} />}
      {step === SignInStep.CONFIRM_RESET_PASSWORD && <ConfirmResetPasswordForm />}
      {step === SignInStep.NEW_PASSWORD && <NewPasswordForm />}
      {step === SignInStep.CONFIRM_SIGN_UP && <ConfirmSignUpForm goToSignIn={() => setStep(SignInStep.SIGN_IN)} />}
    </div>
  )
}
