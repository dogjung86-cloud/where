import {
  Archive,
  Camera,
  CircleDollarSign,
  Coins,
  Globe2,
  ImagePlus,
  Images,
  MapPin,
  RefreshCcw,
  Send,
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

const vaultUtilities = WHERE_UTILITY_PRICES.filter((utility) =>
  utility.key.startsWith("vault_"),
);

const momentUtilities = WHERE_UTILITY_PRICES.filter(
  (utility) => !utility.key.startsWith("vault_"),
);

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f3ec] text-[#171717]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-4 md:px-6">
        <header className="flex items-center justify-between border-b border-[#d8d0c2] pb-4">
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
          <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#171717] bg-[#171717] px-3 text-sm font-semibold text-white">
            <Wallet size={17} strokeWidth={2} />
            Connect
          </button>
        </header>

        <section className="grid min-h-[calc(100vh-7rem)] grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <p className="mb-3 inline-flex rounded-lg bg-[#17231f] px-3 py-2 text-sm font-semibold text-white">
                Private world photo exchange
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[0.95] text-[#171717] sm:text-6xl md:text-7xl">
                SomeWhere
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5f574f]">
                Send one real photo from your day and receive a stranger&apos;s
                moment from another city. No feed, no followers, no score. Just
                a quiet little trade with someone, somewhere.
              </p>
            </div>

            <section className="rounded-lg border border-[#d8d0c2] bg-white p-4 lg:hidden">
              <p className="text-sm font-medium text-[#776e62]">$WHERE</p>
              <h2 className="text-xl font-semibold">
                Hold tokens, receive more photos
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-[#f7f3ec] p-3">
                  <p className="text-sm font-semibold">Free</p>
                  <p className="mt-1 text-2xl font-semibold">1</p>
                  <p className="text-xs text-[#776e62]">send 1, receive 1</p>
                </div>
                {WHERE_TIERS.map((tier) => (
                  <div className="rounded-lg bg-[#f7f3ec] p-3" key={tier.name}>
                    <p className="text-sm font-semibold">{tier.name}</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {tier.receiveCount}
                    </p>
                    <p className="text-xs text-[#0d6b4f]">
                      Hold {tier.requiredBalance.toLocaleString()} $WHERE
                    </p>
                  </div>
                ))}
              </div>
            </section>

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

            <div className="rounded-lg border border-[#d8d0c2] bg-[#fffaf1] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#776e62]">Exchange</p>
                  <h2 className="text-2xl font-semibold">Send one moment</h2>
                </div>
                <ImagePlus size={24} strokeWidth={1.8} />
              </div>

              <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-[#b9ad9b] bg-white text-center">
                <span className="grid size-14 place-items-center rounded-lg bg-[#e2f4ee] text-[#0d6b4f]">
                  <ImagePlus size={27} strokeWidth={1.8} />
                </span>
                <span className="max-w-[16rem] text-base font-semibold">
                  Drop a current photo to open your next arrival
                </span>
                <input className="sr-only" type="file" accept="image/*" />
              </label>

              <p className="mt-3 rounded-lg bg-[#171717] px-3 py-2 text-sm font-medium text-white">
                Extra arrivals unlock only after your own photo lands.
              </p>
            </div>
          </div>

          <div className="grid content-start gap-4">
            <section className="rounded-lg border border-[#d8d0c2] bg-white p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#776e62]">$WHERE</p>
                  <h2 className="text-2xl font-semibold">
                    Hold tokens, receive more photos
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#776e62]">
                    The free loop stays simple: send 1 photo, receive 1 photo.
                    Holding $WHERE increases how many arrivals open after your
                    photo is accepted into the exchange queue.
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
                    Temporary inbox only. Permanent saves use vault space.
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
                      Includes {tier.vaultSlots} permanent vault slots.
                    </p>
                  </article>
                ))}
              </div>
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
                  Received photos are tiny artifacts from strangers. $WHERE
                  lets collectors expand a permanent vault, so favorite arrivals
                  can become a real inventory instead of disappearing from the
                  temporary inbox.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {vaultUtilities.map((utility) => (
                    <div
                      className="rounded-lg border border-white/10 bg-white/[0.08] p-3"
                      key={utility.key}
                    >
                      <p className="text-sm font-semibold">{utility.label}</p>
                      <p className="mt-1 text-xs text-[#b9d3c8]">
                        {utility.cost.toLocaleString()} $WHERE
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-lg border border-[#d8d0c2] bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#776e62]">
                      Token Utility
                    </p>
                    <h2 className="text-2xl font-semibold">
                      What $WHERE unlocks
                    </h2>
                  </div>
                  <CircleDollarSign size={24} strokeWidth={1.8} />
                </div>
                <div className="space-y-3">
                  {momentUtilities.map((utility) => (
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
              </article>
            </section>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.58fr]">
          <div className="rounded-lg border border-[#d8d0c2] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#776e62]">Inbox</p>
                <h2 className="text-2xl font-semibold">Arrived moments</h2>
                <p className="mt-1 text-sm text-[#776e62]">
                  Shy selfies, travel snaps, family moments, and quiet ordinary
                  days from other cities.
                </p>
              </div>
              <button className="grid size-10 place-items-center rounded-lg border border-[#d8d0c2] text-[#171717]">
                <RefreshCcw size={17} strokeWidth={2} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
