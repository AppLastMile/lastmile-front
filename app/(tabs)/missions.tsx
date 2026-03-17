import { Redirect } from "expo-router";
import { useAuthSession } from "@/modules/auth";
import { DonorCampaignsScreen } from "@/modules/donor";
import { MissionsScreen } from "@/modules/missions";

export default function MissionsRoute() {
  const { currentUser } = useAuthSession();

  if (!currentUser) {
    return <Redirect href="/(auth)/login" />;
  }

  if (currentUser.role === "donor") {
    return <DonorCampaignsScreen />;
  }

  return <MissionsScreen />;
}