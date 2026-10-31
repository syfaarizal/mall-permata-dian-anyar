import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export interface SellerContact { name: string; wa_number: string }

/** Kontak konfirmasi penjual = Admin Operasional yang aktif. Cadangan: nomor admin di Pengaturan. */
export function useSellerContacts(fallbackWa: string | null): SellerContact[] {
  const { data } = useQuery({
    queryKey: ['seller-contacts'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_seller_contacts')
      if (error) throw error
      return data as SellerContact[]
    },
  })
  if (data && data.length > 0) return data
  return fallbackWa ? [{ name: 'Admin', wa_number: fallbackWa }] : []
}
