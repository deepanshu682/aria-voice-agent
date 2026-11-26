import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AetherCloud Voice SDR | Autonomous AI Sales Voice Assistant',
  description:
    'Autonomous AI Sales Voice and Chat Assistant powered by Gemini Live API (gemini-3.8-live), Hybrid RAG grounding, BANT qualification, and automated CRM and calendar booking.',
  openGraph: {
    title: 'AetherCloud Voice SDR | Autonomous AI Sales Voice Assistant',
    description:
      'Real-time bidirectional voice and chat sales assistant with sub-50ms barge-in, multilingual EN/HI/Hinglish support, Hybrid RAG guardrails, and live CRM and calendar booking.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AetherCloud Voice SDR',
    description:
      'Autonomous AI Sales Voice and Chat Assistant with Simple User Mode, Developer Mode controls, and Gemini Live API.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="bg-[#FAF8F5] text-stone-900 font-sans antialiased selection:bg-orange-500/15 selection:text-orange-950"
      >
        {children}
      </body>
    </html>
  );
}
