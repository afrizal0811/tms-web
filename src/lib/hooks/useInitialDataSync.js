import { useEffect } from 'react';
import { getHubs, syncHubsData } from '@/lib/api';

export const useInitialDataSync = (
  setIsLoading,
  setAllHubsList,
  setCurrentHubListView,
  setPageError
) => {
  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      try {
        setIsLoading(true);
        let localHubs = await getHubs();
        if (!localHubs || localHubs.length === 0) {
          try {
            await syncHubsData();
            localHubs = await getHubs();
          } catch (err) {
            console.error('Error saat silent sync Hubs:', err);
          }
        }

        if (isMounted) {
          setAllHubsList(localHubs || []);
          setCurrentHubListView(localHubs || []);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setPageError(error.message);
          setIsLoading(false);
        }
      }
    };

    initData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
