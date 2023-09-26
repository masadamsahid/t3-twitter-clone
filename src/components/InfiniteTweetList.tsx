import InfiniteScroll from "react-infinite-scroll-component";
import Link from "next/link";
import ProfileImage from "~/components/ProfileImage";
import { useSession } from "next-auth/react";
import { VscHeart, VscHeartFilled } from "react-icons/vsc";
import IconHoverEffect from "~/components/IconHoverEffect";

type Tweet = {
  id: string;
  content: string;
  createdAt: Date;
  likeCount: number;
  likedByMe: boolean;
  user: { id: string, image: string | null, name: string | null };
}

type InfiniteTweetListProps = {
  isLoading?: boolean;
  isError?: boolean;
  hasMore: boolean;
  fetchNewTweets: () => Promise<unknown>;
  tweets: Tweet[];
}

const InfiniteTweetList = ({ isLoading, isError, hasMore, fetchNewTweets, tweets }: InfiniteTweetListProps) => {
  
  if (isLoading) return <h1>Loading...</h1>;
  if (isError) return <h1>Error...</h1>;
  if (tweets == null || tweets.length === 0) return (
    <h2 className="my-4 text-center text-2xl text-gray-500">
      No Tweets
    </h2>
  );
  
  return (
    <ul>
      <InfiniteScroll
        next={fetchNewTweets}
        hasMore={hasMore}
        loader={"Loading ..."}
        dataLength={tweets.length}
      >
        {tweets.map((tweet) => (
          <TweetCard key={tweet.id} {...tweet}/>
        ))}
      </InfiniteScroll>
    </ul>
  );
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "short" });

const TweetCard = ({id, content, createdAt, likeCount, likedByMe, user}: Tweet) => {
  return (
    <li className="flex gap-4 border-b px-4 py-4">
      <Link href={`/profiles/${user.id}`}>
        <ProfileImage src={user.image} />
      </Link>
      <div className="flex-grow flex flex-col">
        <div className="flex gap-1">
          <Link href={`/profiles/${user.id}`} className="font-bold hover:underline focus:underline">
            {user.name}
          </Link>
          <span className="text-gray-500">-</span>
          <span className="text-gray-500">{dateTimeFormatter.format(createdAt)}</span>
        </div>
        <p className="whitespace-pre-wrap">
          {content}
        </p>
        <HeartButton likeCount={likeCount} likedByMe={likedByMe} />
      </div>
    </li>
  );
}

type HeartButtonProps = {
  likedByMe: boolean;
  likeCount: number;
}

const HeartButton = ({ likedByMe, likeCount }: HeartButtonProps) => {
  const session = useSession();
  const HeartIcon = likedByMe ? VscHeartFilled : VscHeart;
  
  if (session.status !== "authenticated") return (
    <div className="my-1 flex items-center gap-3 self-start text-gray-500">
      <HeartIcon/>
      <span>{likeCount}</span>
    </div>
  );
  
  return (
    <button
      className={`-ml-2 group flex gap-1 items-center self-start transition-colors duration-200 ${
        likedByMe
          ? "text-red-500"
          : "text-gray-500 hover:text-red-500 focus:text-red-500"
      }`}
    >
      <IconHoverEffect red>
        <HeartIcon
          className={`transition duration-200 ${
            likedByMe
              ? "fill-red-500"
              : "fill-gray-500 group-hover:fill-red-500 group-focus-visible:fill-red-500"
          }`}
        />
      </IconHoverEffect>
      <span>{likeCount}</span>
    </button>
  );
}

export default InfiniteTweetList;