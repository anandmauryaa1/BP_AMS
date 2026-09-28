import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

/**
 * Cache revalidation endpoint.
 * POST /api/revalidate?tag=projects&secret=<REVALIDATE_SECRET>
 * POST /api/revalidate?path=/admin/dashboard
 */
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.REVALIDATE_SECRET || 'bp_revalidate_2026';

  if (secret !== expectedSecret) {
    return NextResponse.json({ success: false, error: 'Invalid secret' }, { status: 401 });
  }

  const tag = req.nextUrl.searchParams.get('tag');
  const path = req.nextUrl.searchParams.get('path');

  try {
    if (tag) {
      revalidateTag(tag);
      return NextResponse.json({ success: true, revalidated: true, tag });
    }
    if (path) {
      revalidatePath(path);
      return NextResponse.json({ success: true, revalidated: true, path });
    }
    // Revalidate all major tags
    const allTags = ['projects', 'deliverables', 'tasks', 'employees', 'channels', 'leaves', 'calendar'];
    allTags.forEach(revalidateTag);
    return NextResponse.json({ success: true, revalidated: true, tags: allTags });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
