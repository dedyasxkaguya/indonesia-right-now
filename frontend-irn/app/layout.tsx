import type { Metadata } from 'next';
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import { AppChrome } from '@/components/layout/AppChrome';
import { CommandPaletteProvider } from '@/components/layout/CommandPaletteProvider';
import { DrawerProvider } from '@/components/layout/DrawerProvider';
import { ExplainProvider } from '@/components/features/explain';
import { EasterEggProvider } from '@/components/layout/EasterEggProvider';
import { Footer } from '@/components/layout/Footer';
import { KeyboardShortcutProvider } from '@/components/layout/KeyboardShortcutProvider';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { SidebarProvider } from '@/components/layout/SidebarProvider';
import { ContentWrapper } from '@/components/layout/ContentWrapper';
import { A11yPanel } from '@/components/layout/A11yPanel';
import { StorageProvider } from '@/components/layout/StorageProvider';
import { RootShell } from '@/components/layout/RootShell';
import './globals.css';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-sans', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'indonesia-right-now', template: '%s · indonesia-right-now' },
  description: 'Pantau aliran berita Indonesia melalui data dari sumber yang tersedia.',
  icons: { icon: '/favicon-irn.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <head>
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{var r=document.documentElement;if(localStorage.getItem('irn:theme')==='dark'){r.classList.add('dark');}var p=JSON.parse(localStorage.getItem('irn:a11y:v1')||'{}');var f=p.fontScale||100;var c=p.contrast===true;var m=p.reduceMotion===true;if(new URLSearchParams(location.search).get('calm')==='1'){m=true;c=false;}r.style.fontSize=f+'%';r.setAttribute('data-a11y-contrast',String(c));r.setAttribute('data-a11y-motion',m?'reduce':'default');}catch(e){}})();" }} />
      </head>
      <body className={`${sans.variable} ${mono.variable}`}>
        <StorageProvider>
          <SidebarProvider>
            <RootShell>
              <EasterEggProvider>
                <DrawerProvider>
                  <CommandPaletteProvider>
                  <AppChrome>
                    <Sidebar />
                    <MobileSidebar />
                    <Navbar />
                  </AppChrome>
                  <ExplainProvider>
                    <KeyboardShortcutProvider>
                      <ContentWrapper>{children}</ContentWrapper>
                    </KeyboardShortcutProvider>
                  </ExplainProvider>
                  <AppChrome>
                    <Footer />
                    <A11yPanel />
                  </AppChrome>
                  <Toaster position="bottom-right" richColors />
                  </CommandPaletteProvider>
                </DrawerProvider>
              </EasterEggProvider>
            </RootShell>
          </SidebarProvider>
        </StorageProvider>
      </body>
    </html>
  );
}
