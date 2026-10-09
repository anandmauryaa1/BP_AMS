import { describe, it, expect } from 'vitest';
import {
  normalizeTaskLinks,
  sanitizeTaskUrl,
  isValidWebUrl,
  detectLinkCategory,
  filterTasksList,
} from '@/lib/taskUtils';
import { ITask } from '@/types';

describe('Task Multiple Links & Performance Utilities', () => {
  describe('URL Sanitization & Validation (Pure Non-UI Actions)', () => {
    it('should prepend https:// to bare domain urls', () => {
      expect(sanitizeTaskUrl('drive.google.com/folder/123')).toBe('https://drive.google.com/folder/123');
      expect(sanitizeTaskUrl('https://figma.com/file/xyz')).toBe('https://figma.com/file/xyz');
      expect(sanitizeTaskUrl('   docs.google.com/document/d/abc   ')).toBe('https://docs.google.com/document/d/abc');
    });

    it('should validate valid web URLs and reject invalid ones', () => {
      expect(isValidWebUrl('https://youtube.com/watch?v=123')).toBe(true);
      expect(isValidWebUrl('drive.google.com/open?id=abc')).toBe(true);
      expect(isValidWebUrl('')).toBe(false);
      expect(isValidWebUrl('   ')).toBe(false);
      expect(isValidWebUrl('not a url %%%')).toBe(false);
    });

    it('should detect category branding correctly', () => {
      expect(detectLinkCategory('https://drive.google.com/drive/folders/123').category).toBe('drive');
      expect(detectLinkCategory('https://docs.google.com/document/d/abc').category).toBe('docs');
      expect(detectLinkCategory('https://figma.com/design/xyz').category).toBe('figma');
      expect(detectLinkCategory('https://youtube.com/watch?v=456').category).toBe('youtube');
      expect(detectLinkCategory('https://github.com/org/repo').category).toBe('github');
      expect(detectLinkCategory('https://example.com/asset.zip').category).toBe('general');
    });
  });

  describe('Multiple Links Normalization & Backward Compatibility', () => {
    it('should merge links array and legacy fields without duplicates', () => {
      const mockTask: Partial<ITask> = {
        _id: 'task-1',
        title: 'Video Edit 4K',
        driveLink: 'https://drive.google.com/drive/folders/111',
        docLink: 'https://docs.google.com/document/d/222',
        outputUrl: 'https://youtube.com/watch?v=333',
        links: [
          { title: 'Drive Assets', url: 'https://drive.google.com/drive/folders/111' },
          { title: 'Figma Storyboard', url: 'https://figma.com/file/storyboard' },
        ],
      };

      const links = normalizeTaskLinks(mockTask);
      expect(links.length).toBe(4);
      expect(links.some((l) => l.url === 'https://drive.google.com/drive/folders/111')).toBe(true);
      expect(links.some((l) => l.url === 'https://figma.com/file/storyboard')).toBe(true);
      expect(links.some((l) => l.url === 'https://docs.google.com/document/d/222')).toBe(true);
      expect(links.some((l) => l.url === 'https://youtube.com/watch?v=333')).toBe(true);
    });

    it('should handle empty or null task safely', () => {
      expect(normalizeTaskLinks(null)).toEqual([]);
      expect(normalizeTaskLinks(undefined)).toEqual([]);
      expect(normalizeTaskLinks({})).toEqual([]);
    });
  });

  describe('Pure Task Filtering & Sorting', () => {
    const mockTasks = [
      {
        _id: 't-1',
        taskId: 'TSK-1',
        title: 'Color Grade 4K',
        status: 'TODO',
        assignedTo: 'emp-1',
        projectId: 'proj-1',
      },
      {
        _id: 't-2',
        taskId: 'TSK-2',
        title: 'Design Thumbnail',
        status: 'IN_PROGRESS',
        assignedTo: 'emp-2',
        projectId: 'proj-1',
      },
      {
        _id: 't-3',
        taskId: 'TSK-3',
        title: 'Write Script',
        status: 'COMPLETED',
        assignedTo: '',
        projectId: 'proj-2',
      },
    ] as unknown as ITask[];

    it('should filter by query across title and taskId', () => {
      const results = filterTasksList(mockTasks, { query: 'Thumbnail' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Design Thumbnail');
    });

    it('should filter by status', () => {
      const results = filterTasksList(mockTasks, { status: 'TODO' });
      expect(results).toHaveLength(1);
      expect(results[0].taskId).toBe('TSK-1');
    });

    it('should filter unassigned tasks', () => {
      const results = filterTasksList(mockTasks, { assigneeId: 'unassigned' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Write Script');
    });
  });
});
