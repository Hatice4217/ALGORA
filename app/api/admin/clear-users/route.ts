import { NextResponse } from 'next/server';

// DELETE /api/admin/clear-users - Clear all users (DEV ONLY!)
export async function DELETE() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials missing' },
        { status: 500 }
      );
    }

    // Get all users
    const usersResponse = await fetch(`${supabaseUrl}/auth/v1/users`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!usersResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    const users = (await usersResponse.json()) as { users?: { id: string }[] };
    const userIds = users.users?.map((user) => user.id) || [];

    // Delete all users
    const deletePromises = userIds.map((userId: string) =>
      fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      })
    );

    await Promise.all(deletePromises);

    return NextResponse.json({
      success: true,
      message: `Deleted ${userIds.length} users`,
      deletedCount: userIds.length,
    });

  } catch (error) {
    console.error('Clear users error:', error);
    return NextResponse.json(
      { error: 'Failed to clear users' },
      { status: 500 }
    );
  }
}
