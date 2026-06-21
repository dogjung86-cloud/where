import {
  Camera,
  CircleDollarSign,
  Globe2,
  ImagePlus,
  MapPin,
  RefreshCcw,
  ShieldCheck,
  Stamp,
  Wallet,
} from "lucide-react";

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
    city: "Osaka",
    country: "Japan",
    time: "4 hr ago",
    image: "/samples/sample-04.webp",
  },
  {
    city: "Vienna",
    country: "Austria",
    time: "4 hr ago",
    image: "/samples/sample-24.webp",
  },
];

const cityLog = [
  ["Tokyo", "Japan"],
  ["Lisbon", "Portugal"],
  ["Auckland", "New Zealand"],
  ["Sao Paulo", "Brazil"],
  ["Copenhagen", "Denmark"],
  ["Marrakesh", "Morocco"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f3ec] text-[#171717]">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-6 px-4 py-4 md:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex min-h-[calc(100vh-2rem)] flex-col gap-6">
          <header className="flex items-start justify-between gap-4 border-b border-[#d8d0c2] pb-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-[#171717] text-white">
                <MapPin size={20} strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#776e62]">Somewhere</p>
                <h1 className="text-2xl font-semibold">World photo exchange</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#5f574f]">
                  Send one photo from your day and receive a random moment from
                  another city. Collect places, discover ordinary lives, and use
                  $WHERE to open more arrivals.
                </p>
              </div>
            </div>
            <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#171717] bg-[#171717] px-3 text-sm font-semibold text-white">
              <Wallet size={17} strokeWidth={2} />
              Connect
            </button>
          </header>

          <section className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-[0.82fr_1.18fr]">
            <div className="flex flex-col justify-between rounded-lg border border-[#d8d0c2] bg-[#fffaf1] p-5">
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#776e62]">Send</p>
                    <h2 className="text-xl font-semibold">One moment</h2>
                  </div>
                  <Camera size={24} strokeWidth={1.8} />
                </div>

                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-[#b9ad9b] bg-white text-center">
                  <span className="grid size-14 place-items-center rounded-lg bg-[#e2f4ee] text-[#0d6b4f]">
                    <ImagePlus size={27} strokeWidth={1.8} />
                  </span>
                  <span className="max-w-[12rem] text-base font-semibold">
                    Drop a photo from right now
                  </span>
                  <input className="sr-only" type="file" accept="image/*" />
                </label>
                <p className="mt-3 rounded-lg bg-[#171717] px-3 py-2 text-sm font-medium text-white">
                  Send to receive. Rerolls unlock after your photo lands.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white p-3">
                  <p className="text-lg font-semibold">1</p>
                  <p className="text-xs text-[#776e62]">outgoing</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-lg font-semibold">3</p>
                  <p className="text-xs text-[#776e62]">queued</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-lg font-semibold">42</p>
                  <p className="text-xs text-[#776e62]">cities</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-lg border border-[#d8d0c2] bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#776e62]">Inbox</p>
                    <h2 className="text-xl font-semibold">Arrived moments</h2>
                    <p className="mt-1 text-sm text-[#776e62]">
                      Shy selfies, travel snaps, and quiet ordinary days.
                    </p>
                  </div>
                  <button className="grid size-10 place-items-center rounded-lg border border-[#d8d0c2] text-[#171717]">
                    <RefreshCcw size={17} strokeWidth={2} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {receivedMoments.map((moment) => (
                    <article
                      className="overflow-hidden rounded-lg border border-[#e2dbd0] bg-[#f7f3ec]"
                      key={`${moment.city}-${moment.country}`}
                    >
                      <div
                        aria-label={`${moment.city}, ${moment.country}`}
                        className="aspect-[4/5] bg-cover bg-center"
                        style={{ backgroundImage: `url(${moment.image})` }}
                      />
                      <div className="p-3">
                        <p className="text-sm font-semibold">{moment.city}</p>
                        <p className="text-xs text-[#776e62]">
                          {moment.country} - {moment.time}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-[#d8d0c2] bg-[#17231f] p-5 text-white">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#b9d3c8]">
                        Passport
                      </p>
                      <h2 className="text-xl font-semibold">Collected cities</h2>
                    </div>
                    <Globe2 size={24} strokeWidth={1.8} />
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2">
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
                </div>

                <div className="rounded-lg border border-[#d8d0c2] bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#776e62]">
                        $WHERE
                      </p>
                      <h2 className="text-xl font-semibold">Unlocks</h2>
                    </div>
                    <CircleDollarSign size={24} strokeWidth={1.8} />
                  </div>
                  <div className="space-y-3">
                    {WHERE_TIERS.map((tier) => (
                      <div className="rounded-lg bg-[#f7f3ec] p-3" key={tier.name}>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-4">{tier.name}</p>
                          <p className="text-xs text-[#776e62]">
                            {tier.requiredBalance.toLocaleString()} $WHERE
                          </p>
                        </div>
                        <span className="mt-2 block text-sm font-semibold">
                          {tier.receiveCount} photos
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="grid min-h-[calc(100vh-2rem)] grid-rows-[auto_1fr_auto] gap-6 rounded-lg bg-[#171717] p-5 text-white">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-sm font-medium text-[#cfc6b8]">Control room</p>
              <h2 className="text-2xl font-semibold">MVP launch stack</h2>
            </div>
            <ShieldCheck size={26} strokeWidth={1.8} />
          </div>

          <div className="grid content-start gap-4">
            <section className="rounded-lg bg-white p-5 text-[#171717]">
              <div className="mb-4 flex items-center gap-3">
                <Stamp size={21} strokeWidth={1.8} />
                <h3 className="text-lg font-semibold">Token spend split</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-[#f7f3ec] p-3">
                  <p className="text-xl font-semibold">60%</p>
                  <p className="text-xs text-[#776e62]">burn</p>
                </div>
                <div className="rounded-lg bg-[#f7f3ec] p-3">
                  <p className="text-xl font-semibold">30%</p>
                  <p className="text-xs text-[#776e62]">treasury</p>
                </div>
                <div className="rounded-lg bg-[#f7f3ec] p-3">
                  <p className="text-xl font-semibold">10%</p>
                  <p className="text-xs text-[#776e62]">rewards</p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-white/[0.08] p-5">
              <h3 className="mb-4 text-lg font-semibold">Utility prices</h3>
              <div className="space-y-3">
                {WHERE_UTILITY_PRICES.map((utility) => (
                  <div
                    className="flex items-center justify-between border-b border-white/10 pb-3 last:border-b-0 last:pb-0"
                    key={utility.key}
                  >
                    <div>
                      <p className="text-sm font-semibold">{utility.label}</p>
                      <p className="text-xs text-[#cfc6b8]">{utility.detail}</p>
                    </div>
                    <span className="text-sm font-semibold">
                      {utility.cost.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

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
        </aside>
      </section>
    </main>
  );
}
