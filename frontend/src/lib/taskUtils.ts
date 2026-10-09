import { ITask, ITaskLink } from '@/types';

export interface INormalizedLink {
  id: string;
  title: string;
  url: string;
  category: 'drive' | 'docs' | 'figma' | 'youtube' | 'github' | 'loom' | 'notion' | 'dropbox' | 'general';
  iconLabel: string;
}

/**
 * Pure non-UI action: Sanitizes and standardizes URLs
 */
export function sanitizeTaskUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url) && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
    url = 'https://' + url;
  }
  return url;
}

/**
 * Pure non-UI action: Validates if string is a reasonably valid URL
 */
export function isValidWebUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (trimmed.length < 3) return false;
  try {
    const testUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(testUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Pure non-UI action: Detects service brand category for custom branding badges
 */
export function detectLinkCategory(rawUrl: string): {
  category: INormalizedLink['category'];
  iconLabel: string;
} {
  const url = (rawUrl || '').toLowerCase();
  if (url.includes('drive.google.com') || url.includes('drive.app.goo.gl')) {
    return { category: 'drive', iconLabel: 'Google Drive' };
  }
  if (url.includes('docs.google.com') || url.includes('sheets.google.com') || url.includes('slides.google.com')) {
    return { category: 'docs', iconLabel: 'Google Doc' };
  }
  if (url.includes('figma.com')) {
    return { category: 'figma', iconLabel: 'Figma' };
  }
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return { category: 'youtube', iconLabel: 'YouTube' };
  }
  if (url.includes('github.com') || url.includes('gitlab.com')) {
    return { category: 'github', iconLabel: 'Repository' };
  }
  if (url.includes('loom.com')) {
    return { category: 'loom', iconLabel: 'Loom' };
  }
  if (url.includes('notion.so') || url.includes('notion.site')) {
    return { category: 'notion', iconLabel: 'Notion' };
  }
  if (url.includes('dropbox.com')) {
    return { category: 'dropbox', iconLabel: 'Dropbox' };
  }
  return { category: 'general', iconLabel: 'Link' };
}

/**
 * Pure non-UI action: Extracts, dedupes, and normalizes all links from a task object
 * Merges legacy `outputUrl`, `driveLink`, `docLink` and multiple `links` array seamlessly.
 */
export function normalizeTaskLinks(task: Partial<ITask> | null | undefined): INormalizedLink[] {
  if (!task) return [];
  const linkMap = new Map<string, INormalizedLink>();

  // 1. Process explicit links array
  if (Array.isArray(task.links)) {
    task.links.forEach((l, idx) => {
      if (!l) return;
      const rawUrl = typeof l === 'string' ? l : l.url;
      const title = (typeof l === 'object' && l.title) ? l.title.trim() : '';
      const cleanUrl = sanitizeTaskUrl(rawUrl);
      if (!cleanUrl) return;

      const { category, iconLabel } = detectLinkCategory(cleanUrl);
      const displayTitle = title || iconLabel || 'External Link';
      const key = cleanUrl.toLowerCase();

      if (!linkMap.has(key)) {
        linkMap.set(key, {
          id: (typeof l === 'object' && (l._id || l.id)) ? String(l._id || l.id) : `link-${idx}-${key}`,
          title: displayTitle,
          url: cleanUrl,
          category,
          iconLabel,
        });
      }
    });
  }

  // 2. Process legacy driveLink
  if (task.driveLink) {
    const cleanUrl = sanitizeTaskUrl(task.driveLink);
    const key = cleanUrl.toLowerCase();
    if (cleanUrl && !linkMap.has(key)) {
      const { category, iconLabel } = detectLinkCategory(cleanUrl);
      linkMap.set(key, {
        id: `legacy-drive-${task._id || 'temp'}`,
        title: 'Google Drive Asset',
        url: cleanUrl,
        category: category === 'general' ? 'drive' : category,
        iconLabel,
      });
    }
  }

  // 3. Process legacy docLink
  if (task.docLink) {
    const cleanUrl = sanitizeTaskUrl(task.docLink);
    const key = cleanUrl.toLowerCase();
    if (cleanUrl && !linkMap.has(key)) {
      const { category, iconLabel } = detectLinkCategory(cleanUrl);
      linkMap.set(key, {
        id: `legacy-doc-${task._id || 'temp'}`,
        title: 'Script / Document',
        url: cleanUrl,
        category: category === 'general' ? 'docs' : category,
        iconLabel,
      });
    }
  }

  // 4. Process legacy outputUrl
  if (task.outputUrl) {
    const cleanUrl = sanitizeTaskUrl(task.outputUrl);
    const key = cleanUrl.toLowerCase();
    if (cleanUrl && !linkMap.has(key)) {
      const { category, iconLabel } = detectLinkCategory(cleanUrl);
      linkMap.set(key, {
        id: `legacy-out-${task._id || 'temp'}`,
        title: 'Deliverable Output',
        url: cleanUrl,
        category,
        iconLabel,
      });
    }
  }

  return Array.from(linkMap.values());
}

/**
 * Pure non-UI filtering and search function
 */
export function filterTasksList<T extends Partial<ITask>>(
  tasks: T[],
  filters: {
    query?: string;
    status?: string;
    assigneeId?: string;
    projectId?: string;
  }
): T[] {
  const query = (filters.query || '').trim().toLowerCase();
  const status = filters.status || 'ALL';
  const assigneeId = filters.assigneeId || 'ALL';
  const projectId = filters.projectId || 'ALL';

  return tasks.filter((task) => {
    if (!task) return false;

    // Status filter
    if (status !== 'ALL' && task.status !== status) {
      return false;
    }

    // Assignee filter
    if (assigneeId !== 'ALL') {
      const currentAssignee = String(
        (typeof task.assignedTo === 'object' ? task.assignedTo?._id : task.assignedTo) ||
        (task as any).assigneeId?._id ||
        (task as any).assigneeId ||
        ''
      );
      if (assigneeId === 'unassigned' && currentAssignee !== '') {
        return false;
      }
      if (assigneeId !== 'unassigned' && currentAssignee !== assigneeId) {
        return false;
      }
    }

    // Project filter
    if (projectId !== 'ALL') {
      const currentProj = String(
        (typeof task.projectId === 'object' ? task.projectId?._id : task.projectId) || ''
      );
      if (currentProj !== projectId) {
        return false;
      }
    }

    // Search query filter
    if (query) {
      const title = (task.title || '').toLowerCase();
      const desc = (task.description || '').toLowerCase();
      const taskId = (task.taskId || '').toLowerCase();
      const notes = (task.notes || '').toLowerCase();
      const assigneeName = (
        (typeof task.assignedTo === 'object' ? task.assignedTo?.name : task.assignedToName) || ''
      ).toLowerCase();
      const projTitle = (
        (typeof task.projectId === 'object' ? (task.projectId as any)?.title || (task.projectId as any)?.name : '') || ''
      ).toLowerCase();

      const matches =
        title.includes(query) ||
        desc.includes(query) ||
        taskId.includes(query) ||
        notes.includes(query) ||
        assigneeName.includes(query) ||
        projTitle.includes(query);

      if (!matches) return false;
    }

    return true;
  });
}
