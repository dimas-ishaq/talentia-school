type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
}

type ConfirmState = ConfirmOptions & { open: boolean }

let resolver: ((confirmed: boolean) => void) | null = null

export function useConfirm() {
  const state = useState<ConfirmState>('confirm-dialog', () => ({ open: false, message: '', title: 'Konfirmasi' }))

  function confirm(options: ConfirmOptions | string): Promise<boolean> {
    if (resolver) resolver(false)
    const value = typeof options === 'string' ? { message: options } : options
    state.value = { open: true, title: 'Konfirmasi', confirmLabel: 'Ya, lanjutkan', cancelLabel: 'Batal', tone: 'primary', ...value }
    return new Promise((resolve) => { resolver = resolve })
  }

  function close(confirmed: boolean) {
    state.value.open = false
    resolver?.(confirmed)
    resolver = null
  }

  return { state, confirm, close }
}
