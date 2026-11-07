/** 가이드 글 목록 (빌드 전용) */
import { getCollection, type CollectionEntry } from 'astro:content';
import type { TrackId } from './tracks.ts';

export type GuideEntry = CollectionEntry<'guides'>;

export async function getGuides(track?: TrackId): Promise<GuideEntry[]> {
  const all = await getCollection('guides');
  return all
    .filter((g) => !track || g.data.tracks.includes(track))
    .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title, 'ko'));
}

export const guideHref = (g: GuideEntry) => `/guides/${g.id}/`;
