import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Handle CORS preflight from Chrome extension
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// POST /api/leads - Save or Update a scraped lead (Upsert)
export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Safety: Ensure all char fields are strings (not objects) before Prisma call
    const fmt = (val: unknown): string => {
      if (!val) return '';
      if (typeof val === 'object' && val !== null) {
        const v = val as Record<string, unknown>;
        return String(v.city || v.name || v.country || JSON.stringify(val));
      }
      return String(val);
    };

    const linkedinUrl = fmt(data.linkedin_url);
    if (!linkedinUrl) {
      return NextResponse.json({ error: 'LinkedIn URL is required for deduplication.' }, { status: 400 });
    }

    const leadData = {
      name:           fmt(data.name) || 'Unknown',
      company:        fmt(data.company),
      designation:    fmt(data.designation),
      location:       fmt(data.location),
      city:           fmt(data.city),
      email:          fmt(data.email),
      phone:          fmt(data.phone),
      profile_image:  fmt(data.profile_image),
      bio:            fmt(data.bio),
      connectionCount:fmt(data.connectionCount),
      skills:         typeof data.skills === 'string' ? data.skills : JSON.stringify(data.skills || []),
    };

    // Upsert logic: If linkedin_url exists, UPDATE. If not, CREATE.
    const lead = await prisma.lead.upsert({
      where: { linkedin_url: linkedinUrl },
      update: leadData,
      create: { 
        ...leadData,
        linkedin_url: linkedinUrl
      }
    });

    return NextResponse.json({ success: true, lead }, { 
      status: 201,
      headers: { 'Access-Control-Allow-Origin': '*' } 
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error saving lead:', err);
    return NextResponse.json(
      { error: 'Failed to save lead', detail: err?.message ?? String(error) },
      { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
}

// GET /api/leads - Get all leads with optional filtering and search
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';

    const where: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { company: { contains: search } },
        { designation: { contains: search } }
      ];
    }
    if (status) {
      where.status = status;
    }

    const leads = await prisma.lead.findMany({
      where: where as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      orderBy: { saved_at: 'desc' },
    });

    return NextResponse.json({ data: leads }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error: unknown) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}
