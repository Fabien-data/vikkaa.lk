import { requireStaff } from '@/server/auth-guard';
export default async function StudioHome() {
  await requireStaff();
  return <h1 className="text-2xl font-semibold">Welcome to Vikkaa Studio</h1>;
}
