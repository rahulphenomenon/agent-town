import { useQuery } from "@tanstack/react-query";
import { paperclipApi } from "@/api/paperclip";
import type { OfficeSnapshot } from "@/types/office";

export function useOfficeWorldData(companyId: string | null | undefined) {
  return useQuery<OfficeSnapshot>({
    queryKey: ["office-snapshot", companyId],
    queryFn: () => paperclipApi.loadOfficeSnapshot(companyId!),
    enabled: Boolean(companyId),
    refetchInterval: 1500,
    staleTime: 1000,
  });
}
