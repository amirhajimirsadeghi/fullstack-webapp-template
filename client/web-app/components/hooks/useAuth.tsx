import React, {
  useState, useEffect, useContext, createContext,
} from 'react';
import { Amplify } from 'aws-amplify';
import { defaultStorage } from 'aws-amplify/utils';
import { fetchAuthSession, signUp, confirmSignUp, autoSignIn, signIn, signOut, resetPassword, confirmResetPassword, confirmSignIn, signInWithRedirect } from 'aws-amplify/auth';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { useRouter } from 'next/router';

export const configureAmplify = () => {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID!,
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
        loginWith: {
          oauth: {
            domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!,
            scopes: ['openid', 'email', 'profile'],
            redirectSignIn: [process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN!],
            redirectSignOut: [process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT!],
            responseType: 'code', // Required for Authorization Code Grant
            providers: ['Google'],
          },
          email: true,
        }
      }
    }
  }, { ssr: true });
  cognitoUserPoolsTokenProvider.setKeyValueStorage(defaultStorage);
}

type User = {
  name: string;
  email: string;
  userId: string;
  accessToken: string;
  profilePicture?: string; // Optional: if you want to store profile picture URL
};

export enum SignUpNextSteps {
  CONFIRM_SIGN_UP = 'CONFIRM_SIGN_UP',
  DONE = 'DONE',
}

export enum SignUpError {
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
}

export enum ConfirmSignUpError {
  INCORRECT_CODE = 'Incorrect code',
}

export enum SignInNextSteps {
  CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED = 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
  RESET_PASSWORD = 'RESET_PASSWORD',
  CONFIRM_SIGN_UP = 'CONFIRM_SIGN_UP',
  DONE = 'DONE',
}

export enum SignInError {
  USER_NOT_FOUND = 'User not found',
  INCORRECT_PASSWORD = 'Incorrect password',
}

export enum ForgotPasswordError {
  USER_NOT_FOUND = 'User not found',
  INCORRECT_CODE = 'Incorrect code',
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  handleSignUp: (name: string, email: string, password: string) => Promise<SignUpNextSteps>;
  handleConfirmSignUp: (code: string) => Promise<void>;
  handleSignIn: (email: string, password: string) => Promise<SignInNextSteps>;
  confirmSignInWithNewPassword: (newPassword: string) => Promise<void>;
  handleResetPassword: (email: string) => Promise<void>;
  handleConfirmResetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  handleSignOut: () => Promise<void>;
  handleGoogleSignIn: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function useProvideAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  useEffect(() => {
    refreshUser();
  }, []);

  const refreshUser = async () => {
    if (isSignedIn) {
      return;
    }
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      if (!session.tokens || !session.tokens.idToken) {
        return;
      }
      const user: User = {
        email: session.tokens.idToken.payload.email!.toString(),
        name: session.tokens.idToken.payload.name!.toString(),
        userId: session.tokens.idToken.payload.sub!,
        accessToken: session.tokens.idToken.toString()!,
        profilePicture: session.tokens.idToken.payload.picture?.toString(),
      };

      setUser(user);
      setIsSignedIn(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSignUp = async (name: string, email: string, password: string): Promise<SignUpNextSteps> => {
    try {
      const { nextStep, userId } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name,
          },
          autoSignIn: true
        }
      });
      setUser({
        email,
        name,
        userId: userId ?? "",
        accessToken: "",
      });
      switch (nextStep.signUpStep) {
        case 'CONFIRM_SIGN_UP':
          return SignUpNextSteps.CONFIRM_SIGN_UP;
        case 'DONE':
          await refreshUser();
          return SignUpNextSteps.DONE;
        default:
          throw new Error(`Unknown sign up step: ${nextStep.signUpStep}`);
      }
    } catch (err) {
      if (err instanceof Error && err.toString().startsWith("UsernameExistsException")) {
        throw SignUpError.USER_ALREADY_EXISTS;
      }
      // This is a custom error from the Cognito trigger b/c cognito doesn't handle
      // enforcing unique email addresses in the user pool for federated and normal sign ups
      if (err instanceof Error && err.toString().includes("EMAIL_EXISTS_EXCEPTION")) {
        throw SignUpError.USER_ALREADY_EXISTS;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  const handleConfirmSignUp = async (code: string) => {
    try {
      const { nextStep } = await confirmSignUp({
        username: user!.email,
        confirmationCode: code,
      });
      switch (nextStep.signUpStep) {
        case 'DONE':
          return await refreshUser();
        case 'COMPLETE_AUTO_SIGN_IN':
          await autoSignIn();
          await refreshUser();
          return
        default:
          throw new Error(`Unknown sign up step: ${nextStep.signUpStep}`);
      }
    } catch (err) {
      if (err instanceof Error && err.toString().startsWith("CodeMismatchException")) {
        throw ConfirmSignUpError.INCORRECT_CODE;
      }
      throw err;
    }
  }

  const handleSignIn = async (email: string, password: string): Promise<SignInNextSteps> => {
    try {
      const { nextStep } = await signIn({
        username: email,
        password,
      })
      setUser({
        email,
        name: "",
        userId: "",
        accessToken: "",
      });
      switch (nextStep.signInStep) {
        case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
          return SignInNextSteps.CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED;
        case 'RESET_PASSWORD':
          return SignInNextSteps.RESET_PASSWORD;
        case 'CONFIRM_SIGN_UP':
          return SignInNextSteps.CONFIRM_SIGN_UP;
        case 'DONE':
          await refreshUser();
          return SignInNextSteps.DONE;
        default:
          throw new Error(`Unknown sign in step: ${nextStep.signInStep}`);
      }
    } catch (err) {
      if (err instanceof Error && err.toString().startsWith("NotAuthorizedException")) {
        throw SignInError.INCORRECT_PASSWORD;
      } else if (err instanceof Error && err.toString().startsWith("UserNotFoundException")) {
        throw SignInError.USER_NOT_FOUND;
      }
      throw err;
    }
  }

  const confirmSignInWithNewPassword = async (newPassword: string) => {
    await confirmSignIn({
      challengeResponse: newPassword
    });
    await autoSignIn();
    return await refreshUser();
  }

  const handleResetPassword = async (email: string) => {
    try {
      await resetPassword({
        username: email,
      });
      setUser({
        email,
        name: "",
        userId: "",
        accessToken: "",
      });
    } catch (err) {
      if (err instanceof Error && err.toString().startsWith("UserNotFoundException")) {
        throw ForgotPasswordError.USER_NOT_FOUND;
      }
      throw err;
    }
  }

  const handleConfirmResetPassword = async (email: string, code: string, newPassword: string) => {
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      });
      await signIn({
        username: email,
        password: newPassword,
      });
      return await refreshUser();
    } catch (err) {
      if (err instanceof Error && err.toString().startsWith("CodeMismatchException")) {
        throw ForgotPasswordError.INCORRECT_CODE;
      }
      throw err;
    }
  }


  // New function for Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithRedirect({
        provider: 'Google',
      })
    } catch (err) {
      console.error('Error during Google sign in:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setIsSignedIn(false);
  }

  return {
    isLoading,
    user,
    isSignedIn: isSignedIn,
    handleSignUp,
    handleConfirmSignUp,
    handleSignIn,
    confirmSignInWithNewPassword,
    handleResetPassword,
    handleConfirmResetPassword,
    handleGoogleSignIn,
    handleSignOut,
  };
}

// Wrap your app with <ProvideAuth />
export function ProvideAuth({ children }: { children: React.ReactNode }) {
  const auth = useProvideAuth();
  const router = useRouter();
  useEffect(() => {
    // Don't do anything if still loading
    if (auth.isLoading) {
      return;
    }
    // If done loading and signed in, redirect to home only if on auth page
    if (auth.isSignedIn && !auth.isLoading) {
      if (router.pathname === "/auth") {
        router.push("/");
      }
      return;
    }

    // At this point, we know the user is not signed in
    // Handle errors from Cognito
    const queryParams = new URLSearchParams(location.search);
    const errorDesc = queryParams.get('error_description');
    if (errorDesc?.includes("EMAIL_EXISTS_EXCEPTION")) {
      router.push("/auth?error=EMAIL_EXISTS_EXCEPTION");
      return;
    }
    // If not on auth page, redirect to auth
    if (router.pathname !== "/auth") {
      router.push("/auth");
    }

  }, [router, auth]);
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// Access auth values and functions with custom useAuth hook
export const useAuth = () => useContext(AuthContext);
