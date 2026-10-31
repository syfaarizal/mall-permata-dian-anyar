import { Component, type ReactNode } from 'react'

interface State { failed: boolean }

/** Mencegah layar putih kalau ada error tak terduga di sebuah halaman. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }
  static getDerivedStateFromError(): State {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('Terjadi error di aplikasi:', error)
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-5 text-center">
        <h1 className="text-2xl font-bold text-marun-700">Ada yang tidak beres</h1>
        <p className="text-tinta-lembut">Halaman ini gagal ditampilkan. Coba muat ulang. Kalau masih terjadi, kabari admin.</p>
        <button className="min-h-12 rounded-xl bg-marun-700 px-4 font-bold text-emas-300" onClick={() => window.location.assign('/')}>Muat ulang</button>
      </div>
    )
  }
}
