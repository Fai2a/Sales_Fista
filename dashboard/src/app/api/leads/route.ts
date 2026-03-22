import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/leads - Save a newly scraped lead
export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Check if lead already exists based on URL or profile URL. In full app, better de-duping needed.
    const newLead = await prisma.lead.create({
      data: {
        name: data.name,
        designation: data.designation,
        company: data.company,
        location: data.location,
        email: data.email,
        phone: data.phone,
        profileUrl: data.profileUrl,
        photoUrl: data.photoUrl,
        bio: data.bio,
        connectionCount: data.connectionCount,
      }
    });

    return NextResponse.json({ success: true, lead: newLead }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving lead:', error);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }
}

// GET /api/leads - Get all leads with optional filtering and search
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const sort = searchParams.get('sort') || 'savedAt:desc';

    const [sortField, sortOrder] = sort.split(':');

    const where: any = {};
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
      where,
      orderBy: { [sortField]: sortOrder },
    });

    return NextResponse.json({ data: leads });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
