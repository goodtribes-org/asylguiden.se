import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bookmarks });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { strapiArticleId } = await request.json();

  if (!strapiArticleId) {
    return NextResponse.json({ error: "Article ID required" }, { status: 400 });
  }

  const bookmark = await prisma.bookmark.create({
    data: {
      userId: session.user.id,
      strapiArticleId,
    },
  });

  return NextResponse.json({ bookmark }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const strapiArticleId = searchParams.get("articleId");

  if (!strapiArticleId) {
    return NextResponse.json({ error: "Article ID required" }, { status: 400 });
  }

  await prisma.bookmark.deleteMany({
    where: {
      userId: session.user.id,
      strapiArticleId: parseInt(strapiArticleId),
    },
  });

  return NextResponse.json({ success: true });
}
