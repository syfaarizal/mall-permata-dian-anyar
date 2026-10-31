import { useQuery } from '@tanstack/react-query'
import { fetchAdminStores, fetchAdminUsers, fetchSettings } from './api'

export const useAdminStores = () => useQuery({ queryKey: ['admin-stores'], queryFn: fetchAdminStores })
export const useAdminUsers = () => useQuery({ queryKey: ['admin-users'], queryFn: fetchAdminUsers })
export const useAdminSettings = () => useQuery({ queryKey: ['admin-settings'], queryFn: fetchSettings })
