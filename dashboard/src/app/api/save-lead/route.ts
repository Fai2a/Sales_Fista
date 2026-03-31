import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║ LeadVault API — Standardized Save Lead Endpoint                 ║
 * ║ Endpoint: POST /api/save-lead                                  ║
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
    if (!apiKey || apiKey !== 'lv-shk-sec-2024') {
      return NextResponse.json({ error: 'Unauthorized: Invalid API Key.' }, { status: 401 });
    }

    const data = await req.json();
    
    // Explicit Audit Log for debugging as requested
    console.log('[LeadVault API] POST /api/save-lead | Payload:', JSON.stringify(data, null, 2));

    const fmt = (val: unknown): string => {
      if (!val) return '';
      if (typeof val === 'object' && val !== null) {
        const v = val as Record<string, unknown>;
        return String(v.city || v.name || v.country || JSON.stringify(val));
      }
      return String(val);
    };

    // Mandatory Field: linkedin_url (Accept both snake_case and camelCase)
    const linkedinUrl = fmt(data.linkedin_url || data.linkedinUrl);
    if (!linkedinUrl) {
      console.error('[LeadVault API] 400 Bad Request: Missing linkedin_url');
      return NextResponse.json({ 
        error: 'LinkedIn URL is required for deduplication.',
        received: data 
      }, { status: 400 });
    }

    // Mandatory Field: email
    const email = fmt(data.email);
    if (!email) {
      console.error('[LeadVault API] 400 Bad Request: Missing email address.');
      return NextResponse.json({ 
        error: 'Email address is required for lead archiving.',
        received: data 
      }, { status: 400 });
    }

    const leadData = {
      name:           fmt(data.name) || 'Unknown',
      headline:       fmt(data.headline),
      company:        fmt(data.company),
      designation:    fmt(data.designation),
      location:       fmt(data.location),
      city:           fmt(data.city),
      email:          email,
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

    console.log(`[LeadVault API] Lead saved/updated: ${lead.name} (${lead.linkedin_url})`);

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
