import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Critical Microbiology Alert - รพ.ธรรมศาสตร์ฯ',
  description: 'ระบบแจ้งและยืนยันผลตรวจวิกฤตทางจุลชีววิทยาและเชื้อดื้อยาแบบ Real-time งานจุลชีววิทยา รพ.ธรรมศาสตร์เฉลิมพระเกียรติ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-slate-50 antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}
