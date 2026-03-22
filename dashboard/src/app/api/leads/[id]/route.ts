import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/leads/[id] - Get a single lead by ID
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ data: lead });
  } catch (error: any) {
    console.error('Error fetching lead:', error);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}

// PATCH /api/leads/[id] - Update a lead
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json();

    const updatedLead = await prisma.lead.update({
      where: { id: params.id },
      data: {
        status: data.status,
        notes: data.notes,
        tags: data.tags,
      },
    });

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

// DELETE /api/leads/[id] - Delete a lead
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.lead.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
