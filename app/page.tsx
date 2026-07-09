import { Landing } from "@/components/Landing";
import { MaintenancePage } from "@/components/MaintenancePage";
import { MAINTENANCE_MODE } from "@/lib/maintenance";

export default function Home() {
  return MAINTENANCE_MODE ? <MaintenancePage /> : <Landing />;
}
