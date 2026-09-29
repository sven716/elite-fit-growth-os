import { SectionHeading } from "@/components/SectionHeading";
import {
  captionTitle,
  formatMetric,
  isSyncStale,
  type InstagramMediaPerformance,
} from "@/lib/growth-dashboard";
import { getGrowthDashboardData } from "@/lib/queries";
import { getWebsiteDashboardData } from "@/lib/platform-queries";

function Metric({ label, value, hint }: { label: string; value: number | null; hint?: string }) {
  return (
    <div className="ef-card p-4">
      <p className="text-[10px] font-bold tracking-[0.16em] text-light/40 uppercase">{label}</p>
      <p className="mt-2 text-3xl font-black text-light">{formatMetric(value)}</p>
      {hint ? <p className="mt-1 text-xs text-light/40">{hint}</p> : null}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "Nog niet gesynchroniseerd";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function PostMetric({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <p className="text-[9px] tracking-[0.12em] text-light/35 uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-light/85">{formatMetric(value)}</p>
    </div>
  );
}

function PostCard({ post }: { post: InstagramMediaPerformance }) {
  return (
    <article className="ef-card overflow-hidden">
      <div className="flex gap-4 p-4">
        {post.thumbnail_url ? (
          // De Instagram-CDN levert wisselende hosts; een gewone img voorkomt een breekbare allowlist.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.thumbnail_url}
            alt=""
            className="h-20 w-20 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="h-20 w-20 shrink-0 rounded-xl bg-light/5" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-light/40">{formatDate(post.published_at)}</p>
              <h3 className="mt-1 line-clamp-2 font-bold text-light">{captionTitle(post.caption)}</h3>
            </div>
            {post.permalink ? (
              <a
                href={post.permalink}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs font-bold text-terra hover:text-terra-light"
              >
                Open
              </a>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold tracking-wide uppercase">
            <span className="rounded-full bg-light/5 px-2 py-1 text-light/45">
              {post.media_product_type ?? post.media_type ?? "post"}
            </span>
            {post.trigger_key ? (
              <span className="rounded-full bg-terra/12 px-2 py-1 text-terra">{post.trigger_key}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-x-3 gap-y-4 border-t border-light/8 px-4 py-4">
        <PostMetric label="Views" value={post.views} />
        <PostMetric label="Bereik" value={post.reach} />
        <PostMetric label="Likes" value={post.likes} />
        <PostMetric label="Reacties" value={post.comments} />
        <PostMetric label="Saves" value={post.saved} />
        <PostMetric label="Shares" value={post.shares} />
        <PostMetric label="Interacties" value={post.total_interactions} />
        <PostMetric label="Leads" value={post.leads} />
      </div>

      <div className="grid grid-cols-4 gap-3 border-t border-light/8 bg-black/10 px-4 py-3">
        <PostMetric label="E-mails" value={post.email_leads} />
        <PostMetric label="Geboekt" value={post.booked_calls} />
        <PostMetric label="Gevoerd" value={post.held_calls} />
        <PostMetric label="Klanten" value={post.won_customers} />
      </div>

      {post.media_product_type?.includes("STOR") ? (
        <div className="grid grid-cols-3 gap-3 border-t border-light/8 px-4 py-3">
          <PostMetric label="Antwoorden" value={post.replies} />
          <PostMetric label="Volgers" value={post.follows} />
          <PostMetric label="Profielbezoek" value={post.profile_visits} />
        </div>
      ) : null}
    </article>
  );
}

export default async function GroeiPage() {
  const [data, website] = await Promise.all([
    getGrowthDashboardData(),
    getWebsiteDashboardData(),
  ]);
  const { totals, funnel } = data;
  const stale = isSyncStale(data.lastSyncedAt);
  const attributionRate = funnel?.opportunities_total
    ? Math.round((funnel.attributed_opportunities / funnel.opportunities_total) * 100)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading eyebrow="Instagram + GHL" accent="data">
          Groei
        </SectionHeading>
        <p className="mt-2 text-sm text-light/45">
          Laatste synchronisatie: {formatDateTime(data.lastSyncedAt)}
        </p>
      </div>

      {data.errors.length > 0 || stale ? (
        <section className="rounded-2xl border border-terra/30 bg-terra/10 p-4">
          <p className="font-bold text-light">Data vraagt aandacht</p>
          <p className="mt-1 text-sm leading-relaxed text-light/60">
            {data.errors[0] ?? "De laatste volledige synchronisatie is ouder dan 48 uur."}
          </p>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          Instagram, geladen periode
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Posts" value={totals.posts} />
          <Metric label="Views" value={totals.views} />
          <Metric label="Bereik" value={totals.reach} />
          <Metric label="Interacties" value={totals.interactions} />
          <Metric label="Likes" value={totals.likes} />
          <Metric label="Reacties" value={totals.comments} />
          <Metric label="Saves" value={totals.saved} />
          <Metric label="Shares" value={totals.shares} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          GHL-funnel
        </h2>
        {funnel ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Contacten" value={funnel.contacts_total} hint="Meetperiode" />
              <Metric label="Met e-mail" value={funnel.contacts_with_email} />
              <Metric label="Kansen" value={funnel.opportunities_total} />
              <Metric label="Gewonnen" value={funnel.won_opportunities} />
              <Metric label="Geboekt" value={funnel.booked_calls} />
              <Metric label="Gevoerd" value={funnel.held_calls} />
              <Metric label="Klantstarts" value={funnel.confirmed_customer_starts} />
              <Metric
                label="Attributie"
                value={attributionRate}
                hint={attributionRate === null ? "Nog niet meetbaar" : "% van kansen"}
              />
            </div>
            <div className="ef-card mt-3 p-4 text-sm text-light/55">
              Periode {formatDate(funnel.period_start)} tot {formatDate(funnel.period_end)}. {" "}
              {funnel.unattributed_opportunities > 0
                ? `${funnel.unattributed_opportunities} kansen missen nog een bruikbare bron.`
                : "Alle geladen kansen hebben een bruikbare bron."}
            </div>
          </>
        ) : (
          <div className="ef-card p-5 text-sm text-light/45">
            Nog geen GHL-meting geladen.
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          Website
        </h2>
        {website.snapshot ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Sessies" value={website.snapshot.sessions} />
              <Metric label="Bezoekers" value={website.snapshot.active_users} />
              <Metric label="Paginaweergaven" value={website.snapshot.page_views} />
              <Metric label="Leads" value={website.snapshot.generate_leads} />
              <Metric label="CTA-klikken" value={website.snapshot.cta_clicks} />
              <Metric label="Betrokken sessies" value={website.snapshot.engaged_sessions} />
            </div>
            {website.channels.length > 0 ? (
              <div className="ef-card mt-3 overflow-hidden">
                {website.channels.slice(0, 6).map((channel) => (
                  <div key={channel.id} className="flex items-center justify-between border-b border-light/8 px-4 py-3 last:border-0">
                    <span className="text-sm font-bold text-light/75">{channel.dimension_value}</span>
                    <span className="text-sm text-light/45">{formatMetric(channel.sessions)} sessies</span>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="ef-card p-5 text-sm text-light/45">Nog geen websitegegevens geladen.</div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
              Per post
            </h2>
            <p className="mt-1 text-xs text-light/35">
              Een streepje betekent dat de bronkoppeling ontbreekt, niet dat de waarde nul is.
            </p>
          </div>
          <p className="text-xs text-light/35">{totals.attributedPosts}/{totals.posts} gekoppeld</p>
        </div>

        {data.posts.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="ef-card p-5 text-sm text-light/45">
            Nog geen Instagram-posts gesynchroniseerd.
          </div>
        )}
      </section>
    </div>
  );
}
