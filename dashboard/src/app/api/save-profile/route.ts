import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║ LeadVault API — Standardized Save Profile Endpoint              ║
 * ║ Endpoint: POST /api/save-profile                               ║
 * ║ Authentication: x-api-key                                      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get('x-api-key');
    // Maintain strict unauthorized check as per leads route
    if (!apiKey || apiKey !== 'lv-shk-sec-2024') {
      return NextResponse.json({ error: 'Unauthorized: Invalid API Key.' }, { status: 401 });
    }

    const data = await req.json();

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
      headline:       fmt(data.headline),
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

    const lead = await prisma.lead.upsert({
      where: { linkedin_url: linkedinUrl },
      update: leadData,
      create: { 
        ...leadData,
        linkedin_url: linkedinUrl
      }
    });

    console.log(`[LeadVault API] Lead saved: ${lead.name} (${lead.linkedin_url})`);

    return NextResponse.json({ success: true, lead }, { 
      status: 201,
      headers: { 'Access-Control-Allow-Origin': '*' } 
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error saving lead:', err);
    return NextResponse.json(
      { error: 'Failed to save lead', detail: err?.message },
      { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
}
