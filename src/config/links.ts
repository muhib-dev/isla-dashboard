const ISLA_SITE =
  process.env.NEXT_PUBLIC_ISLA_SITE_URL ?? "https://theisla.org";

export const externalLinks = {
  site: ISLA_SITE,
  jobPortal: `${ISLA_SITE}/jobs/`,
  store: `${ISLA_SITE}/shop/`,
  membership: `${ISLA_SITE}/membership/`,
  research: `${ISLA_SITE}/`,
} as const;
