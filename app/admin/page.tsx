import { redirect } from 'next/navigation';

export default function AdminRootPage() {
  // Redirige automáticamente al dashboard
  redirect('/admin/dashboard');
}