import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Notice, inputCls } from '../../components/ui'
import { addCategory, deleteCategory, renameCategory } from './api'
import { friendlyError } from './logic'
import { useCatalogCategories } from '../catalog/hooks'
import type { Category } from '../../lib/types'

function Row({ c, onError, onDone }: { c: Category; onError: (m: string) => void; onDone: () => void }) {
  const [name, setName] = useState(c.name)
  const opts = { onSuccess: onDone, onError: (e: Error) => onError(friendlyError(e.message)) }
  const rename = useMutation({ mutationFn: () => renameCategory(c.id, name.trim()), ...opts })
  const del = useMutation({ mutationFn: () => deleteCategory(c.id), ...opts })
  return (
    <div className="flex items-center gap-2">
      <input className={inputCls} aria-label={`Nama kategori ${c.name}`} value={name} onChange={(e) => setName(e.target.value)} />
      <Button variant="ghost" className="px-3" disabled={rename.isPending || name.trim().length < 2 || name.trim() === c.name} onClick={() => rename.mutate()}>Simpan</Button>
      <Button variant="danger" className="px-3" disabled={del.isPending} onClick={() => window.confirm(`Hapus kategori "${c.name}"?`) && del.mutate()}>Hapus</Button>
    </div>
  )
}

export default function CategoryManager() {
  const { data } = useCatalogCategories()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [parent, setParent] = useState('')
  const [error, setError] = useState('')
  const done = () => { setError(''); void qc.invalidateQueries({ queryKey: ['categories'] }) }
  const add = useMutation({
    mutationFn: () => addCategory(name.trim(), parent ? Number(parent) : null, (data?.length ?? 0) + 1),
    onSuccess: () => { setName(''); done() },
    onError: (e) => setError(friendlyError(e.message)),
  })
  const parents = (data ?? []).filter((c) => c.parent_id === null)
  return (
    <Card>
      <p className="font-bold">Kategori</p>
      {error && <Notice tone="bad">{error}</Notice>}
      {parents.map((p) => (
        <div key={p.id} className="flex flex-col gap-2 rounded-xl bg-krem p-2">
          <Row c={p} onError={setError} onDone={done} />
          <div className="ml-4 flex flex-col gap-2">{(data ?? []).filter((c) => c.parent_id === p.id).map((c) => <Row key={c.id} c={c} onError={setError} onDone={done} />)}</div>
        </div>
      ))}
      <div className="flex flex-col gap-2 border-t border-garis pt-3">
        <input className={inputCls} placeholder="Nama kategori baru" aria-label="Nama kategori baru" value={name} onChange={(e) => setName(e.target.value)} />
        <select className={inputCls} aria-label="Induk kategori" value={parent} onChange={(e) => setParent(e.target.value)}>
          <option value="">Kategori utama (tanpa induk)</option>
          {parents.map((p) => <option key={p.id} value={p.id}>Di dalam: {p.name}</option>)}
        </select>
        <Button disabled={add.isPending || name.trim().length < 2} onClick={() => add.mutate()}>Tambah kategori</Button>
      </div>
    </Card>
  )
}
