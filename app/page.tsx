"use client"

import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Users,
  Shield,
  Search,
  ArrowRight,
  Sparkles,
  Clock,
  MapPin,
  Package,
} from "lucide-react"
import { CampusOrbitLogoWithTagline, CampusOrbitLogo } from "@/components/campus-orbit-logo"

const features = [
  {
    icon: Package,
    title: "List Anything",
    description: "From textbooks to electronics, bicycles to furniture - list items you want to share with your campus community.",
  },
  {
    icon: Users,
    title: "Campus Community",
    description: "Connect with verified students from your college. Build trust through community ratings and reviews.",
  },
  {
    icon: Shield,
    title: "Safe & Secure",
    description: "Secure messaging, verified profiles, and transparent booking process. Your safety is our priority.",
  },
  {
    icon: Clock,
    title: "Flexible Rentals",
    description: "Hourly, daily, weekly, or monthly rentals. Set your own prices and availability schedule.",
  },
]

const categories = [
  { name: "Electronics", icon: "💻", count: "Items available" },
  { name: "Books", icon: "📚", count: "Items available" },
  { name: "Sports", icon: "🏀", count: "Items available" },
  { name: "Vehicles", icon: "🚲", count: "Items available" },
  { name: "Furniture", icon: "🪑", count: "Items available" },
  { name: "Clothing", icon: "👕", count: "Items available" },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            {/* Logo with Tagline */}
            <div className="mb-8 flex justify-center">
              <CampusOrbitLogoWithTagline size="xl" />
            </div>

            {/* Marathi/Hindi Touch */}
            <p className="mb-4 text-sm text-muted-foreground">
              <span className="mr-3">सामायिक करा, जपा आणि वाढवा</span>
              <span className="text-border">|</span>
              <span className="ml-3">साझा करो, जोड़ो और बढ़ो</span>
            </p>

            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Share, Connect, and Grow with Your{" "}
              <span className="text-primary">Campus Community</span>
            </h1>

            <p className="mt-6 text-pretty text-lg text-muted-foreground sm:text-xl">
              Rent items from fellow students, save money, and reduce waste.
              CampusOrbit makes sharing easy, safe, and rewarding.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild className="btn-glow w-full sm:w-auto">
                <Link href="/items">
                  <Search className="mr-2 h-5 w-5" />
                  Explore Items
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/register">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start Listing
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="border-y border-border bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Browse by Category
            </h2>
            <p className="mt-2 text-muted-foreground">
              Find what you need from a wide variety of categories
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <Link key={category.name} href={`/items?category=${category.name}`}>
                <Card className="card-hover h-full border-border bg-card text-center transition-all">
                  <CardContent className="p-6">
                    <span className="mb-3 block text-4xl">{category.icon}</span>
                    <h3 className="font-semibold text-foreground">{category.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{category.count}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Why CampusOrbit?
            </h2>
            <p className="mt-2 text-muted-foreground">
              Built by students, for students
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title} className="card-hover border-border bg-card">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-y border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              How It Works
            </h2>
            <p className="mt-2 text-muted-foreground">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Create Account",
                description: "Sign up with your college email and verify your identity.",
              },
              {
                step: "02",
                title: "Browse or List",
                description: "Find items you need or list items you want to share.",
              },
              {
                step: "03",
                title: "Connect & Rent",
                description: "Message the owner, agree on terms, and complete the rental.",
              },
            ].map((item, index) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                {index < 2 && (
                  <ArrowRight className="absolute -right-4 top-8 hidden h-6 w-6 text-border md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lost & Found CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="overflow-hidden border-border bg-card">
            <CardContent className="p-0">
              <div className="flex flex-col items-center gap-8 p-8 md:flex-row md:p-12">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                  <MapPin className="h-10 w-10 text-primary" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">
                    Lost Something on Campus?
                  </h3>
                  <p className="text-muted-foreground">
                    Check our Lost & Found section or report your lost item. Help your fellow students find their belongings.
                  </p>
                </div>
                <Button asChild size="lg" variant="outline" className="shrink-0">
                  <Link href="/lost-found">
                    View Lost & Found
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <CampusOrbitLogo size="sm" />
            <p className="text-sm text-muted-foreground">
              Built with care for campus communities
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/items" className="hover:text-foreground">Browse</Link>
              <Link href="/lost-found" className="hover:text-foreground">Lost & Found</Link>
              <Link href="/register" className="hover:text-foreground">Sign Up</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
