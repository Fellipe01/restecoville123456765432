import CartFab from '@/components/cliente/cart-fab'

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      <CartFab />
    </div>
  )
}
