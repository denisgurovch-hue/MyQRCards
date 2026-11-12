export type PublicCard = {
  slug: string;
  displayName: string;
  jobTitle: string | null;
  companyName: string | null;
  summary: string | null;
  photoUrl: string | null;
  coverColor: string | null;
  coverImageUrl: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  links: Array<{
    type: string | null;
    label: string | null;
    url: string;
  }>;
};
