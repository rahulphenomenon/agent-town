import { useQuery } from "@tanstack/react-query";
import { paperclipApi } from "@/api/paperclip";
import type { OfficeSnapshot } from "@/types/office";

export function useOfficeWorldData(companyId: string | null | undefined) {
  return useQuery<OfficeSnapshot>({
    queryKey: ["office-snapshot", companyId],
    queryFn: ({ signal }) => {
      if (!companyId) {
        throw new Error("Company id is required to load office world data.");
      }

      return paperclipApi.loadOfficeSnapshot(companyId, signal);
    },
    enabled: Boolean(companyId),
    refetchInterval: 1500,
    staleTime: 1000,
  });
}
