import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/leads/[id] - Fetch a single lead by ID
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { 
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    return NextResponse.json({ data: lead }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error: unknown) {
    console.error('Error fetching lead:', error);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}

// DELETE /api/leads/[id] - Remove a lead by ID
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { 
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    await prisma.lead.delete({
      where: { id }
    });

    return NextResponse.json({ success: true }, { 
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error: unknown) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}
