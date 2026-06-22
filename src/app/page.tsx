import {
  Archive,
  Camera,
  CircleDollarSign,
  Coins,
  Globe2,
  Images,
  MapPin,
  Send,
  ShieldCheck,
  Stamp,
} from "lucide-react";

import { ArrivedMomentsSection } from "@/components/arrived-moments-section";
import { AuthActions } from "@/components/auth-actions";
import { LocationMapCard } from "@/components/location-map-card";
import { PhotoUploadPanel } from "@/components/photo-upload-panel";
import { WHERE_TIERS, WHERE_UTILITY_PRICES } from "@/lib/where/tiers";

const receivedMoments = [
  {
    city: "Seoul",
    country: "South Korea",
    time: "2 min ago",
    image: "/samples/sample-01.webp",
  },
  {
    city: "Madrid",
    country: "Spain",
    time: "18 min ago",
    image: "/samples/sample-11.webp",
  },
  {
    city: "Portland",
    country: "United States",
    time: "42 min ago",
    image: "/samples/sample-18.webp",
  },
  {
    city: "Reykjavik",
    country: "Iceland",
    time: "1 hr ago",
    image: "/samples/sample-02.webp",
  },
  {
    city: "Krakow",
    country: "Poland",
    time: "1 hr ago",
    image: "/samples/sample-22.webp",
  },
  {
    city: "Dublin",
    country: "Ireland",
    time: "2 hr ago",
    image: "/samples/sample-19.webp",
  },
  {
    city: "Buenos Aires",
    country: "Argentina",
    time: "2 hr ago",
    image: "/samples/sample-03.webp",
  },
  {
    city: "Busan",
    country: "South Korea",
    time: "3 hr ago",
    image: "/samples/sample-14.webp",
  },
  {
    city: "Prague",
    country: "Czech Republic",
    time: "3 hr ago",
    image: "/samples/sample-23.webp",
  },
  {
    city: "Mendoza",
    country: "Argentina",
    time: "4 hr ago",
    image: "/samples/campfire-night.webp",
  },
];

const cityMapPoints: Record<
  string,
  {
    detailMap: string;
    map: string;
    region: string;
  }
> = {
  Seoul: {
    detailMap: "/maps/simple/seoul.svg",
    map: "/maps/simple/seoul.svg",
    region: "East Asia",
  },
  Madrid: {
    detailMap: "/maps/simple/madrid.svg",
    map: "/maps/simple/madrid.svg",
    region: "Iberia",
  },
  Portland: {
    detailMap: "/maps/simple/portland.svg",
    map: "/maps/simple/portland.svg",
    region: "Pacific NW",
  },
  Reykjavik: {
    detailMap: "/maps/simple/reykjavik.svg",
    map: "/maps/simple/reykjavik.svg",
    region: "North Atlantic",
  },
  Krakow: {
    detailMap: "/maps/simple/krakow.svg",
    map: "/maps/simple/krakow.svg",
    region: "Central Europe",
  },
  Dublin: {
    detailMap: "/maps/simple/dublin.svg",
    map: "/maps/simple/dublin.svg",
    region: "Ireland",
  },
  "Buenos Aires": {
    detailMap: "/maps/simple/buenos-aires.svg",
    map: "/maps/simple/buenos-aires.svg",
    region: "Rio de la Plata",
  },
  Busan: {
    detailMap: "/maps/simple/busan.svg",
    map: "/maps/simple/busan.svg",
    region: "Korea Strait",
  },
  Prague: {
    detailMap: "/maps/simple/prague.svg",
    map: "/maps/simple/prague.svg",
    region: "Bohemia",
  },
  Mendoza: {
    detailMap: "/maps/simple/mendoza.svg",
    map: "/maps/simple/mendoza.svg",
    region: "Andes foothills",
  },
};

const cityLog = [
  ["Tokyo", "Japan"],
  ["Lisbon", "Portugal"],
  ["Auckland", "New Zealand"],
  ["Sao Paulo", "Brazil"],
  ["Copenhagen", "Denmark"],
  ["Marrakesh", "Morocco"],
];

const inventoryStats = [
  {
    label: "Inbox",
    value: "12",
    detail: "arrived after sending photos",
    icon: Images,
  },
  {
    label: "Sent",
    value: "4",
    detail: "accepted into the exchange",
    icon: Send,
  },
  {
    label: "Vault",
    value: "7",
    detail: "saved as permanent inventory",
    icon: Archive,
  },
  {
    label: "Cities",
    value: "9",
    detail: "collected in your passport",
    icon: Globe2,
  },
];

const inventoryItems = [
  {
    label: "Sent photo",
    city: "Seoul",
    country: "South Korea",
    status: "Ready",
    image: "/samples/sample-01.webp",
  },
  {
    label: "New arrival",
    city: "Madrid",
    country: "Spain",
    status: "Inbox",
    image: "/samples/sample-11.webp",
  },
  {
    label: "Saved moment",
    city: "Buenos Aires",
    country: "Argentina",
    status: "Vault",
    image: "/samples/sample-03.webp",
  },
];

const exchangeRules = [
  {
    label: "Send to receive",
    text: "One current photo from you opens one or more arrivals from somewhere else.",
    icon: Send,
  },
  {
    label: "No social score",
    text: "No likes, comments, followers, public profiles, or popularity pressure.",
    icon: Camera,
  },
  {
    label: "City, not exact GPS",
    text: "Show the city and country. Strip private image metadata.",
    icon: MapPin,
  },
];

function getCityMapPoint(city: string, country: string) {
  return (
    cityMapPoints[city] ?? {
      detailMap: "/maps/simple/buenos-aires.svg",
      map: "/maps/simple/buenos-aires.svg",
      region: country,
    }
  );
}

function InventoryPhotoCards({ className = "" }: { className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-3 ${className}`}>
      {inventoryItems.map((item) => {
        const mapPoint = getCityMapPoint(item.city, item.country);

        return (
          <article
            className="overflow-hidden rounded-lg border border-[#e2dbd0] bg-[#f7f3ec]"
            key={`${item.label}-${item.city}`}
          >
            <div
              aria-label={`${item.label}: ${item.city}, ${item.country}`}
              className="aspect-[4/5] bg-cover bg-center"
              style={{ backgroundImage: `url(${item.image})` }}
            />
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{item.label}</p>
                <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-[#0d6b4f]">
                  {item.status}
                </span>
              </div>
              <LocationMapCard
                city={item.city}
                country={item.country}
                detailMap={mapPoint.detailMap}
                map={mapPoint.map}
                region={mapPoint.region}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f3ec] text-[#171717]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-4 md:px-6">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#d8d0c2] pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-[#171717] text-white">
              <MapPin size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#776e62]">SomeWhere</p>
              <p className="text-lg font-semibold">
                Send here. Receive somewhere.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              aria-label="SomeWhere on X"
              className="grid size-10 place-items-center rounded-lg border border-[#d8d0c2] bg-white text-sm font-black text-[#171717] transition hover:border-[#171717]"
              href="https://x.com/SomeWheredev"
              rel="noreferrer"
              target="_blank"
              title="X"
            >
              X
            </a>
            <a
              aria-label="SomeWhere on Telegram"
              className="grid size-10 place-items-center rounded-lg border border-[#d8d0c2] bg-white text-[#171717] transition hover:border-[#171717]"
              href="https://t.me/somewherewall"
              rel="noreferrer"
              target="_blank"
              title="Telegram"
            >
              <Send size={17} strokeWidth={2} />
            </a>
            <AuthActions compact />
          </div>
        </header>

        <section className="grid min-h-[calc(100vh-7rem)] grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-3 inline-flex rounded-lg bg-[#17231f] px-3 py-2 text-sm font-semibold text-white">
                Photo-first world exchange
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[0.95] text-[#171717] sm:text-6xl md:text-7xl">
                SomeWhere
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5f574f]">
                Send one real photo from your day and build an inventory of
                moments from other cities. No feed, no followers, no score. Just
                a quiet little trade with someone, somewhere.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {exchangeRules.map((rule) => {
                const Icon = rule.icon;

                return (
                  <article
                    className="rounded-lg border border-[#d8d0c2] bg-white p-4"
                    key={rule.label}
                  >
                    <Icon className="mb-4 text-[#0d6b4f]" size={22} />
                    <h2 className="text-base font-semibold">{rule.label}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#776e62]">
                      {rule.text}
                    </p>
                  </article>
                );
              })}
            </div>

            <PhotoUploadPanel />

            <section className="rounded-lg border border-[#d8d0c2] bg-white p-4 lg:hidden">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#776e62]">
                    Your inventory
                  </p>
                  <h2 className="text-xl font-semibold">
                    Photos you sent and received
                  </h2>
                </div>
                <Images size={22} strokeWidth={1.8} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {inventoryStats.map((item) => {
                  const Icon = item.icon;

                  return (
                    <article className="rounded-lg bg-[#f7f3ec] p-3" key={item.label}>
                      <Icon className="mb-2 text-[#0d6b4f]" size={18} />
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-1 text-2xl font-semibold">{item.value}</p>
                      <p className="text-xs leading-5 text-[#776e62]">
                        {item.detail}
                      </p>
                    </article>
                  );
                })}
              </div>

              <InventoryPhotoCards className="mt-3" />
            </section>

          </div>

          <div className="hidden content-start gap-4 lg:grid">
            <section className="rounded-lg border border-[#d8d0c2] bg-white p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#776e62]">
                    Your inventory
                  </p>
                  <h2 className="text-2xl font-semibold">
                    Photos you sent and received
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#776e62]">
                    The main account view starts with the things a sender owns:
                    photos waiting in the inbox, saved vault moments, and the
                    city passport built from real exchanges.
                  </p>
                </div>
                <Images size={25} strokeWidth={1.8} />
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {inventoryStats.map((item) => {
                  const Icon = item.icon;

                  return (
                    <article className="rounded-lg bg-[#f7f3ec] p-4" key={item.label}>
                      <Icon className="mb-3 text-[#0d6b4f]" size={20} />
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-2 text-3xl font-semibold">{item.value}</p>
                      <p className="mt-1 text-xs leading-5 text-[#776e62]">
                        {item.detail}
                      </p>
                    </article>
                  );
                })}
              </div>

              <InventoryPhotoCards className="mt-4" />
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <article className="rounded-lg border border-[#d8d0c2] bg-[#17231f] p-5 text-white">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#b9d3c8]">
                      Permanent Vault
                    </p>
                    <h2 className="text-2xl font-semibold">
                      Save-photo inventory
                    </h2>
                  </div>
                  <Archive size={24} strokeWidth={1.8} />
                </div>
                <p className="text-sm leading-6 text-[#cfe1d8]">
                  Received photos are tiny artifacts from strangers. Favorite
                  arrivals can become a real inventory instead of disappearing
                  from the temporary inbox.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {["Inbox", "Vault", "Passport", "New city"].map((label) => (
                    <div
                      className="rounded-lg border border-white/10 bg-white/[0.08] p-3"
                      key={label}
                    >
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="mt-1 text-xs text-[#b9d3c8]">Private</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-lg border border-[#d8d0c2] bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#776e62]">
                      Passport
                    </p>
                    <h2 className="text-2xl font-semibold">
                      Collected cities
                    </h2>
                  </div>
                  <Globe2 size={24} strokeWidth={1.8} />
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
                  {cityLog.map(([city, country]) => (
                    <div
                      className="min-w-0 rounded-lg bg-[#f7f3ec] p-3"
                      key={`${city}-${country}`}
                    >
                      <p className="text-sm font-semibold leading-4">{city}</p>
                      <p className="text-xs text-[#776e62]">{country}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.58fr]">
          <ArrivedMomentsSection
            moments={receivedMoments.map((moment) => {
              const mapPoint = getCityMapPoint(moment.city, moment.country);

              return {
                ...moment,
                detailMap: mapPoint.detailMap,
                map: mapPoint.map,
                region: mapPoint.region,
              };
            })}
          />

          <div className="grid gap-4">
            <section className="rounded-lg border border-[#d8d0c2] bg-[#17231f] p-5 text-white">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#b9d3c8]">Passport</p>
                  <h2 className="text-2xl font-semibold">Collected cities</h2>
                </div>
                <Globe2 size={24} strokeWidth={1.8} />
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
                {cityLog.map(([city, country]) => (
                  <div
                    className="min-w-0 rounded-lg border border-white/10 bg-white/[0.08] p-3"
                    key={`${city}-${country}`}
                  >
                    <p className="text-sm font-semibold leading-4">{city}</p>
                    <p className="text-xs text-[#b9d3c8]">{country}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[#d8d0c2] bg-[#fffaf1] p-5">
              <div className="mb-4 flex items-center gap-3">
                <Images size={21} strokeWidth={1.8} />
                <h2 className="text-xl font-semibold">Why storage matters</h2>
              </div>
              <p className="text-sm leading-6 text-[#776e62]">
                Random photos are more fun when they can become a collection.
                Free users can receive and browse, while $WHERE holders can
                build a larger permanent inventory of saved moments.
              </p>
            </section>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.8fr]">
          <section className="rounded-lg border border-[#d8d0c2] bg-white p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#776e62]">$WHERE</p>
                <h2 className="text-2xl font-semibold">
                  Token support comes after the photo loop
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#776e62]">
                  The free loop stays simple: send 1 photo, receive 1 photo.
                  The default inbox holds 10 arrivals. Holding $WHERE can
                  increase both arrivals per accepted photo and your inbox
                  capacity.
                </p>
              </div>
              <Coins size={25} strokeWidth={1.8} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <article className="rounded-lg bg-[#f7f3ec] p-4">
                <p className="text-sm font-semibold">Free</p>
                <p className="mt-2 text-3xl font-semibold">1</p>
                <p className="mt-1 text-sm text-[#776e62]">
                  arrival after sending 1 photo
                </p>
                <p className="mt-3 text-xs leading-5 text-[#776e62]">
                  Default inbox limit is 10 arrivals.
                </p>
              </article>

              {WHERE_TIERS.map((tier) => (
                <article className="rounded-lg bg-[#f7f3ec] p-4" key={tier.name}>
                  <p className="text-sm font-semibold">{tier.name}</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {tier.receiveCount}
                  </p>
                  <p className="mt-1 text-sm text-[#776e62]">
                    arrivals per accepted photo
                  </p>
                  <p className="mt-3 text-xs font-semibold text-[#0d6b4f]">
                    Hold {tier.requiredBalance.toLocaleString()} $WHERE
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#776e62]">
                    {tier.detail}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#776e62]">
                    Inbox limit: {tier.inboxLimit.toLocaleString()} arrivals.
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#d8d0c2] bg-[#fffaf1] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#776e62]">
                  $WHERE Actions
                </p>
                <h2 className="text-2xl font-semibold">One-time $WHERE uses</h2>
              </div>
              <CircleDollarSign size={24} strokeWidth={1.8} />
            </div>
            <div className="space-y-3">
              {WHERE_UTILITY_PRICES.map((utility) => (
                <div
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[#e2dbd0] pb-3 last:border-b-0 last:pb-0"
                  key={utility.key}
                >
                  <div>
                    <p className="text-sm font-semibold">{utility.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[#776e62]">
                      {utility.detail}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {utility.cost.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="rounded-lg bg-[#171717] p-5 text-white">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-sm font-medium text-[#cfc6b8]">Control room</p>
              <h2 className="text-2xl font-semibold">MVP launch stack</h2>
            </div>
            <ShieldCheck size={26} strokeWidth={1.8} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[0.7fr_1fr_0.7fr]">
            <section className="rounded-lg bg-white p-5 text-[#171717]">
              <div className="mb-4 flex items-center gap-3">
                <Stamp size={21} strokeWidth={1.8} />
                <h3 className="text-lg font-semibold">Token spend split</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-[#f7f3ec] p-3">
                  <p className="text-xl font-semibold">50%</p>
                  <p className="text-xs text-[#776e62]">burn</p>
                </div>
                <div className="rounded-lg bg-[#f7f3ec] p-3">
                  <p className="text-xl font-semibold">50%</p>
                  <p className="text-xs text-[#776e62]">treasury</p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-white/[0.08] p-5">
              <h3 className="mb-4 text-lg font-semibold">Launch rules</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <p className="rounded-lg border border-white/10 p-3 text-sm leading-6 text-[#cfc6b8]">
                  A photo is the ticket to another photo. The exchange should
                  always feel earned.
                </p>
                <p className="rounded-lg border border-white/10 p-3 text-sm leading-6 text-[#cfc6b8]">
                  The reward is location and surprise, not social approval.
                </p>
                <p className="rounded-lg border border-white/10 p-3 text-sm leading-6 text-[#cfc6b8]">
                  Keep it anonymous, lightweight, and private by default.
                </p>
              </div>
            </section>

            <footer className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[#f0c36a] p-4 text-[#171717]">
                <p className="text-2xl font-semibold">98%</p>
                <p className="text-sm font-medium">EXIF stripped</p>
              </div>
              <div className="rounded-lg bg-[#a8d8c1] p-4 text-[#171717]">
                <p className="text-2xl font-semibold">City</p>
                <p className="text-sm font-medium">not exact GPS</p>
              </div>
            </footer>
          </div>
        </section>
      </section>
    </main>
  );
}
