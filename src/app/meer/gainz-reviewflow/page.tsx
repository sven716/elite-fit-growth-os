import { SectionHeading } from "@/components/SectionHeading";
import { GainzReviewflowClient } from "@/components/GainzReviewflowClient";
import { createClient } from "@/lib/supabase/server";

export default async function GainzReviewflowPage() {
  const supabase = await createClient();

  const [{ data: clientsData }, { data: reviewsData }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, status")
      .order("status")
      .order("name"),
    supabase
      .from("gainz_reviews")
      .select(
        "id, week_label, uitvoerbaarheid, resultaat, adherence, tevredenheid, een_op_een, verlenging, referral, hoofdgewoonte, bottleneck, next_step, intern_advies, created_at, clients(name)",
      )
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const clients = (clientsData ?? []).map((client) => ({
    id: client.id,
    name: client.name,
    status: client.status,
  }));

  const reviews = (reviewsData ?? []).map((review) => ({
    id: review.id,
    client_name:
      Array.isArray(review.clients) && review.clients[0]?.name
        ? review.clients[0].name
        : typeof review.clients === "object" && review.clients && "name" in review.clients
          ? String(review.clients.name)
          : "Onbekende klant",
    week_label: review.week_label,
    uitvoerbaarheid: review.uitvoerbaarheid,
    resultaat: review.resultaat,
    adherence: review.adherence,
    tevredenheid: review.tevredenheid,
    een_op_een: review.een_op_een,
    verlenging: review.verlenging,
    referral: review.referral,
    hoofdgewoonte: review.hoofdgewoonte,
    bottleneck: review.bottleneck,
    next_step: review.next_step,
    intern_advies: review.intern_advies,
    created_at: review.created_at,
  }));

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Coaching" accent="Reviewflow">
        Gainz
      </SectionHeading>

      <GainzReviewflowClient clients={clients} reviews={reviews} />
    </div>
  );
}
