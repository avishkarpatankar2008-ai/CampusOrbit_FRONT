"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { Navbar } from "@/components/navbar"
import { ItemCard, ItemCardSkeleton } from "@/components/item-card"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getItems, type Item, type ItemFilters } from "@/lib/api"
import { Search, SlidersHorizontal, X, Package } from "lucide-react"

// Values must match backend ItemCategory enum exactly
const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "books", label: "Books" },
  { value: "electronics", label: "Electronics" },
  { value: "lab_equipment", label: "Lab Equipment" },
  { value: "instruments", label: "Instruments" },
  { value: "sports", label: "Sports" },
  { value: "stationery", label: "Stationery" },
  { value: "other", label: "Other" },
]

// Values must match backend ItemCondition enum exactly (underscores, not hyphens)
const CONDITIONS = [
  { value: "all", label: "Any Condition" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "acceptable", label: "Acceptable" },
]

// Sort values must match backend sort_map keys exactly
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
]

// FIX: Shadcn <Select> requires a non-empty string value. Use a sentinel that
//      api.ts already strips before sending to the backend (see getItems()).
const ALL_CATEGORIES_SENTINEL = "__all"

async function fetcher(
  key: string
): Promise<{ items: Item[]; total: number; pages: number }> {
  const filters: ItemFilters = JSON.parse(key)
  const result = await getItems(filters)
  return result.data ?? { items: [], total: 0, pages: 0 }
}

export default function ItemsPageContent() {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get("category") || ""

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  // FIX: Internal state uses the real value ("" for all). The Select value is
  //      derived separately using the sentinel only for the Shadcn component.
  const [category, setCategory] = useState(initialCategory)
  const [condition, setCondition] = useState("all")
  const [sort, setSort] = useState("newest")
  const [showFilters, setShowFilters] = useState(false)
  const [searchTimer, setSearchTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null)

  const filters: ItemFilters = {
    search: debouncedSearch || undefined,
    // FIX: Pass the real category value ("" is fine — getItems() ignores it).
    category: category || undefined,
    condition: condition !== "all" ? condition : undefined,
    sort,
    limit: 20,
  }

  const filterKey = JSON.stringify(filters)
  const { data, isLoading } = useSWR(filterKey, fetcher, {
    keepPreviousData: true,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0

  const hasFilters =
    !!debouncedSearch || !!category || condition !== "all" || sort !== "newest"

  const clearFilters = () => {
    setSearch("")
    setDebouncedSearch("")
    setCategory("")
    setCondition("all")
    setSort("newest")
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearch(val)
    if (searchTimer) clearTimeout(searchTimer)
    setSearchTimer(setTimeout(() => setDebouncedSearch(val), 400))
  }

  // FIX: Convert between sentinel and real state so Shadcn Select is happy
  //      (it requires a non-empty string) without sending garbage to the backend.
  const handleCategoryChange = (val: string) => {
    setCategory(val === ALL_CATEGORIES_SENTINEL ? "" : val)
  }

  const categorySelectValue = category || ALL_CATEGORIES_SENTINEL

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Browse Items
          </h1>
          <p className="mt-1 text-muted-foreground">
            Find items to rent from fellow students
          </p>
        </div>

        {/* Search + Filter bar */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={search}
                onChange={handleSearchChange}
                className="pl-9"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters((v) => !v)}
              className="shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            {hasFilters && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFilters}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {showFilters && (
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Category
                    </label>
                    {/* FIX: Use sentinel as the "all" value so Shadcn Select
                        doesn't treat empty-string as uncontrolled. */}
                    <Select
                      value={categorySelectValue}
                      onValueChange={handleCategoryChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem
                            key={c.value || ALL_CATEGORIES_SENTINEL}
                            value={c.value || ALL_CATEGORIES_SENTINEL}
                          >
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Condition
                    </label>
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any Condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Sort By
                    </label>
                    <Select value={sort} onValueChange={setSort}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!isLoading && (
            <p className="text-sm text-muted-foreground">
              {total} item{total !== 1 ? "s" : ""} found
              {hasFilters && " matching your filters"}
            </p>
          )}
        </div>

        {/* Items Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ItemCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Package className="h-8 w-8 text-muted-foreground" />}
            title="No items found"
            description={
              hasFilters
                ? "Try adjusting your filters or search terms."
                : "No items have been listed yet. Be the first to list something!"
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
