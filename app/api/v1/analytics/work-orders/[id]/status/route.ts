import { NextRequest, NextResponse } from 'next/server';
import { updateWorkshopOrderStatusAction } from '@/lib/workshop/workshop-actions';
import { workOrderStatusSchema } from '@/specs/099-mechanic-workshop-queue/contracts/workshop-contracts';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Work order ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parseResult = workOrderStatusSchema.safeParse(body?.status);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid work order status: ${body?.status}. Valid values: QUEUED, IN PROGRESS, PENDING_PARTS, COMPLETED, CANCELLED`,
        },
        { status: 400 }
      );
    }

    const result = await updateWorkshopOrderStatusAction(
      id,
      parseResult.data,
      body?.notes
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        orderId: id,
        status: parseResult.data,
        updatedAt: result.data?.updatedAt ?? new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown server error',
      },
      { status: 500 }
    );
  }
}
