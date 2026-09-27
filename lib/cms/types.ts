import type { Locale } from "@/lib/i18n";

export type ContentType =
  | "page"
  | "project"
  | "publication"
  | "news"
  | "domain"
  | "team";

export type PublicationStatus = "draft" | "published" | "archived";

export type LocalizedText = Record<Locale, string>;

export type CmsContent = {
  id: string;
  type: ContentType;
  slug: string;
  status: PublicationStatus;
  domain?: string | null;
  coverKey?: string | null;
  metadata?: Record<string, unknown>;
  title: LocalizedText;
  summary: LocalizedText;
  body: LocalizedText;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
};

export type CmsMedia = {
  id: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  alt: LocalizedText;
  createdAt: string;
};
