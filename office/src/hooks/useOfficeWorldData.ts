import { useQuery } from "@tanstack/react-query";
import { paperclipApi } from "@/api/paperclip";
import type { OfficeSnapshot } from "@/types/office";

export function useOfficeWorldData() {
  return useQuery<OfficeSnapshot>({
    queryKey: ["office", "world-data"],
    queryFn: () => paperclipApi.loadOfficeSnapshot(),
    refetchInterval: 1500,
    staleTime: 1000,
  });
}
