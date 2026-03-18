import { useState } from 'react';

export type MissionStatus = 'available' | 'taken' | 'delivered';

let statusState: Record<string, MissionStatus> = {};

export function useMissionStatus() {
  const [statusMap, setStatusMap] = useState(statusState);

  const updateMission = (id: string, status: MissionStatus) => {
    statusState = {
      ...statusState,
      [id]: status,
    };

    setStatusMap({ ...statusState });
  };

  const getStatus = (id: string): MissionStatus => {
    return statusMap[id] || 'available';
  };

  return {
    getStatus,
    updateMission,
  };
}