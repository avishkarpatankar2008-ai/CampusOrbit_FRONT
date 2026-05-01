import { Suspense } from "react"
import ItemsPageContent from "./items-content"

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <ItemsPageContent />
    </Suspense>
  )
}
