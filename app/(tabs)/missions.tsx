import { MissionsScreen } from '@/modules/missions/screens/MissionsScreen';
import { DonorCampaignsScreen } from '@/modules/campaigns/screens/DonorCampaignsScreen';

export default function MissionsRoute() {
  const fakeUser = { role: 'volunteer' };

  if (fakeUser.role === 'donor') {
    return <DonorCampaignsScreen />;
  }

  return <MissionsScreen />;
}