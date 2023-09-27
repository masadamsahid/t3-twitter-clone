import { z } from "zod";

import {
  createTRPCContext,
  createTRPCRouter,
  protectedProcedure, publicProcedure,
} from "~/server/api/trpc";
import { Prisma } from "@prisma/client";
import { inferAsyncReturnType } from "@trpc/server";

export const tweetRouter = createTRPCRouter({
  infiniteFeed: publicProcedure
    .input(z.object({
      onlyFollowing: z.boolean().optional(),
      limit: z.number().optional(),
      cursor: z.object({
        id: z.string(),
        createdAt: z.date(),
      }).optional(),
    }))
    .query(async ({ input: { onlyFollowing = false, limit = 10, cursor }, ctx }) => {
      const currentUserId = ctx.session?.user.id;
      return await getInfiniteTweets({
        limit,
        ctx,
        cursor,
        whereClause: currentUserId == null || !onlyFollowing
          ? undefined
          : ({
            user: {
              followers: { some: { id: currentUserId } }
            },
          })
        ,
      });
    }),
  create: protectedProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ input: { content }, ctx }) => {
      const tweet = await ctx.db.tweet.create({
        data: { content, userId: ctx.session.user.id }
      });
      
      return tweet;
    }),
  toggleLike: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input: { id }, ctx }) => {
      const data = { tweetId: id, userId: ctx.session.user.id }
      const existedLike = await ctx.db.like.findUnique({
        where: { userId_tweetId: data }
      });
      
      if (existedLike == null) {
        await ctx.db.like.create({ data });
        return { addedLike: true };
      } else {
        await ctx.db.like.delete({ where: { userId_tweetId: data } });
        return { addedLike: false };
      }
    }),
});


const getInfiniteTweets = async (
  {
    whereClause, ctx, limit, cursor
  }: {
    whereClause?: Prisma.TweetWhereInput,
    ctx: inferAsyncReturnType<typeof createTRPCContext>,
    limit: number,
    cursor: {id: string, createdAt: Date} | undefined
  }
) => {
  const currentUserId = ctx.session?.user.id;
  
  const data = await ctx.db.tweet.findMany({
    take: limit + 1,
    cursor: cursor ? { createdAt_id: cursor } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    where: whereClause,
    select: {
      id: true,
      content: true,
      createdAt: true,
      _count: true,
      likes: currentUserId == null ? false : { where: { userId: currentUserId } },
      user: {
        select: { name: true, id: true, image: true },
      },
    },
  });
  
  let nextCursor: typeof cursor | undefined;
  if (data.length > limit) {
    const nextItem = data.pop();
    if (nextItem != null){
      nextCursor = { id: nextItem.id, createdAt: nextItem.createdAt };
    }
  }
  
  return {
    tweets: data.map(({ likes, _count, ...tweet }) => ({
      ...tweet,
      likeCount: _count.likes,
      likedByMe: likes.length > 0,
    })),
    nextCursor
  };
}