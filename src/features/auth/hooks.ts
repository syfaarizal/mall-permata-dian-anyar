import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { PublicSettings } from '../../lib/types'

export function usePublicSettings() {
  return useQuery({
    queryKey: ['public-settings'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<PublicSettings> => {
      const { data, error } = await supabase.rpc('get_public_settings')
      if (error) throw error
      return (data as PublicSettings[])[0]
    },
  })
}
