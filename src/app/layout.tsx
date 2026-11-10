import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import ToastProvider from "@/providers/ToastProvider";
import Navbar from "@/components/navbar/Navbar";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/actions/getCurrentUser";
import RegisterModal from "@/components/modals/RegisterModal";
import LoginModal from "@/components/modals/LoginModal";
import RentModal from "@/components/modals/RentModal";
import EditModal from "@/components/modals/EditModal";
import Footer from "@/components/Footer";
import type { CurrentUser } from "@/actions/getCurrentUser";

const font = Nunito({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tracal",
  description: "Find your next adventure with local hosts.",
  icons: {
    icon: "/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser: CurrentUser | null = await getCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${font.className} antialiased text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ClientOnly>
            <ToastProvider />
            <RegisterModal />
            <LoginModal />
            <RentModal />
            <EditModal />
            <Navbar currentUser={currentUser} />
          </ClientOnly>
          <div className="pb-8 pt-20">
            {children}
          </div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
