import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Geist } from 'next/font/google';
import { configureAmplify, ProvideAuth } from '@/components/hooks/useAuth';
import { Toaster } from "@/components/ui/sonner";
const geist = Geist({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-sans',
});

configureAmplify()

export default function App({ Component, pageProps }: AppProps) {

  return (
    <main className={`${geist.variable}`}>
      <ProvideAuth>
        <Component {...pageProps} />
      </ProvideAuth>
      <Toaster richColors theme='light' closeButton />
    </main>
  );
}
