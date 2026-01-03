import type { ThreadView } from "../useProposalDetail";

export function buildProposalJsonLd(thread: ThreadView) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://foresight.market";
  const url = `${baseUrl}/proposals/${thread.id}`;
  const title = thread.title || "Foresight Proposal";
  const rawBody =
    thread.content ||
    "Governance or prediction market proposal discussion in the Foresight Proposals Square, used to collaboratively design and evaluate new markets.";
  const body = rawBody.length > 480 ? rawBody.slice(0, 477) + "..." : rawBody;
  const commentsCount = Array.isArray(thread.comments) ? thread.comments.length : 0;
  const createdAt = thread.created_at;
  const updatedAt = (thread as any).updated_at || createdAt;
  const json: any = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: title,
    articleBody: body,
    datePublished: createdAt,
    ...(updatedAt ? { dateModified: updatedAt } : {}),
    url,
    mainEntityOfPage: url,
    inLanguage: "en",
    author: {
      "@type": "Person",
      name: thread.user_id ? String(thread.user_id) : "Foresight user",
    },
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: commentsCount,
    },
  };
  if (thread.category) {
    json.about = thread.category;
  }
  if (thread.created_prediction_id) {
    json.isBasedOn = `${baseUrl}/prediction/${thread.created_prediction_id}`;
  }
  return json;
}

export function buildProposalBreadcrumbJsonLd(thread: ThreadView) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://foresight.market";
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl + "/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Proposals Square",
        item: baseUrl + "/proposals",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: thread.title || "Proposal details",
        item: `${baseUrl}/proposals/${thread.id}`,
      },
    ],
  };
}
