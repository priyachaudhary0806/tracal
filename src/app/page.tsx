import Container from "@/components/Container";
import ClientOnly from "@/components/ClientOnly";
import getListings, { IListingsParams } from "@/actions/getListings";
import getCurrentUser from "@/actions/getCurrentUser";
import ListingCard from "@/components/listings/ListingCard";
import Image from "next/image";
import Link from "next/link";

interface HomeProps {
  searchParams: Promise<IListingsParams>;
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = await searchParams;
  const listings = await getListings(resolvedSearchParams);
  const currentUser = await getCurrentUser();

  return (
    <ClientOnly>

      {/* ────────────────────────────────────────────────────────────
          DUAL HERO — Traveler view (left) + Host view (right)
      ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[55vh]">

        {/* ── Traveler Panel ── */}
        <div className="relative overflow-hidden min-h-[300px]">
          <Image
            src="https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=2070&auto=format&fit=crop"
            alt="Travel India"
            fill
            className="object-cover brightness-60"
            priority
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/60 to-black/50" />

          <div className="relative z-10 flex flex-col justify-center items-start h-full px-8 md:px-14 py-16 gap-5">
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              For Travellers
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight drop-shadow">
              Find Your Next<br />Adventure
            </h1>
            <p className="text-white/90 text-base md:text-lg font-medium max-w-sm">
              Discover authentic homestays across India — beaches, mountains, cities and villages.
            </p>
            <a
              href="#listings"
              className="mt-2 bg-white text-[var(--primary)] font-bold px-7 py-3 rounded-full hover:bg-orange-50 transition shadow-lg text-sm"
            >
              Explore Homestays →
            </a>
          </div>
        </div>

        {/* ── Host Panel ── */}
        <div className="relative overflow-hidden min-h-[300px]">
          <Image
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop"
            alt="Host your home"
            fill
            className="object-cover brightness-60"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--secondary)]/70 to-black/50" />

          <div className="relative z-10 flex flex-col justify-center items-start h-full px-8 md:px-14 py-16 gap-5">
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              For Hosts
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight drop-shadow">
              Earn From Your<br />Empty Rooms
            </h1>
            <p className="text-white/90 text-base md:text-lg font-medium max-w-sm">
              List your property for free and start welcoming guests from across India. You set the price in ₹.
            </p>
            <Link
              href="/host"
              className="mt-2 bg-white text-[var(--secondary)] font-bold px-7 py-3 rounded-full hover:bg-teal-50 transition shadow-lg text-sm"
            >
              Start Hosting →
            </Link>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          TRAVELLER SEARCH BAR
      ──────────────────────────────────────────────────────────── */}
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <form
            method="GET"
            action="/"
            className="bg-white dark:bg-slate-800 p-3 rounded-2xl md:rounded-full shadow-md w-full flex flex-col md:flex-row items-center gap-3"
          >
            <input
              name="locationValue"
              type="text"
              placeholder="📍 Where to? (e.g. Goa, Manali)"
              defaultValue={(resolvedSearchParams as any).locationValue || ""}
              className="w-full md:flex-1 bg-transparent border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 outline-none px-4 py-2 text-sm dark:text-white"
            />
            <input
              name="maxPrice"
              type="number"
              placeholder="Max Price (₹)"
              defaultValue={(resolvedSearchParams as any).maxPrice || ""}
              className="w-full md:w-36 bg-transparent border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 px-4 py-2 outline-none text-sm dark:text-white"
            />
            <input
              name="guestCount"
              type="number"
              placeholder="Guests"
              defaultValue={(resolvedSearchParams as any).guestCount || ""}
              className="w-full md:w-24 bg-transparent px-4 py-2 outline-none text-sm dark:text-white"
            />
            <button
              type="submit"
              className="w-full md:w-auto rounded-full px-8 py-2.5 bg-[var(--primary)] text-white hover:bg-orange-600 transition font-semibold text-sm"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <Container>

        {/* ────────────────────────────────────────────────────────────
            CATEGORIES
        ──────────────────────────────────────────────────────────── */}
        <div className="py-12">
          <h2 className="text-2xl font-bold mb-6 text-[var(--secondary)]">Explore by Category</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Beach",    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80" },
              { name: "Mountain", src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80" },
              { name: "City",     src: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80" },
              { name: "Village",  src: "https://images.unsplash.com/photo-1542361345-89e58247f2d5?w=800&q=80" },
            ].map((cat) => (
              <a
                href={`/?category=${cat.name}`}
                key={cat.name}
                className="group relative rounded-xl h-36 overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition"
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition z-10" />
                <img
                  src={cat.src}
                  alt={cat.name}
                  className="object-cover w-full h-full group-hover:scale-110 transition duration-500"
                />
                <div className="absolute bottom-3 left-4 z-20 text-white font-bold text-lg">{cat.name}</div>
              </a>
            ))}
          </div>
        </div>

        {/* ── AI Travel Assistant Callout Banner ── */}
        <div className="my-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-teal-500/10 border border-orange-200 dark:border-orange-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
              ✨
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/50 px-2.5 py-0.5 rounded-full">
                New Free Feature
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                TRACAL AI Travel Assistant
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 max-w-2xl">
                Smart Trip Budget Planner with real homestay rates, interactive AI Travel Personality quiz, and Local Explorer attraction guides.
              </p>
            </div>
          </div>
          <Link
            href="/travel-assistant"
            className="btn-primary px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap shadow-md self-start md:self-auto cursor-pointer"
          >
            Launch Assistant &rarr;
          </Link>
        </div>

        {/* ────────────────────────────────────────────────────────────
            LISTINGS GRID
        ──────────────────────────────────────────────────────────── */}
        <div id="listings" className="py-8 pb-24 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-6 text-[var(--secondary)]">
            {(resolvedSearchParams as any).category
              ? `${(resolvedSearchParams as any).category} Homestays`
              : (resolvedSearchParams as any).locationValue
              ? `Results for "${(resolvedSearchParams as any).locationValue}"`
              : "Featured Homestays"}
          </h2>

          {listings.length === 0 ? (
            <div className="h-[20vh] flex flex-col gap-2 justify-center items-center bg-slate-50 dark:bg-slate-900 rounded-xl">
              <div className="text-xl text-slate-800 dark:text-slate-200 font-bold">No matches found</div>
              <div className="font-light text-neutral-500">Try changing your search criteria.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {listings.map((listing: any) => (
                <ListingCard
                  key={listing.id || listing._id}
                  data={listing}
                  currentUser={currentUser}
                />
              ))}
            </div>
          )}
        </div>

      </Container>
    </ClientOnly>
  );
}
