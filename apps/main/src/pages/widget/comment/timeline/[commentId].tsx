import dayjs from 'dayjs';
import {
  GetStaticProps,
  GetStaticPropsContext,
  GetStaticPaths,
  InferGetStaticPropsType,
  GetStaticPropsResult,
} from 'next';
import * as React from 'react';
import superjson from 'superjson';
import { OperationResult } from 'urql';
import { pipe, subscribe } from 'wonka';

import { CommentTimeline } from '$/blocks/comment-timeline';
import { WidgetLayout } from '$/blocks/layout';
import { PoweredBy } from '$/blocks/powered-by';
import { UserMenu } from '$/blocks/user-menu';
import { IconButton } from '$/components/button';
import { Heading } from '$/components/heading';
import { IconArrowLeft } from '$/components/icons';
import { Link } from '$/components/link';
import { CommentContextProvider } from '$/contexts/comment-context';
import {
  CommentTimelineDocument,
  CommentTimelineSubscription,
  useCommentTimelineSubscription,
} from '$/graphql/generated/comment';
import { ThemeOfPageDocument, ThemeOfPageQuery } from '$/graphql/generated/page';
import { getAdminGqlClient } from '$/lib/admin-gql-client';
import { CommentsDocument, CommentsQuery } from '$/server/graphql/generated/comment';
import { CommonWidgetProps } from '$/types/page.type';
import { Theme } from '$/types/theme.type';
import { CommentTimelineNode } from '$/types/widget';
import { isSSRMode } from '$/utilities/env';

export default function CommentTimelineWidget(
  props: InferGetStaticPropsType<typeof getStaticProps>,
): JSX.Element {
  const [{ data }] = useCommentTimelineSubscription({
    variables: { id: props.commentId },
    pause: isSSRMode,
  });

  const comment = data?.commentByPk || props.comment;

  return (
    <WidgetLayout widgetTheme={props.theme} title="Comment timeline">
      <CommentContextProvider projectId={props.projectId} pageId={comment?.pageId || ''}>
        <div className="mb-4 flex flex-row items-center justify-between">
          {/* Can't use history.back() here in case user open this page individual */}
          <Link href={`/widget/comment/${encodeURIComponent(props.pageURL)}`} variant="plain">
            <IconButton className="translate-x-1">
              <IconArrowLeft size={20} />
            </IconButton>
          </Link>
          <Heading as="h4">
            <span className="font-bold">{comment?.user.name}</span>
            <span>{`'s comment timeline`}</span>
          </Heading>
          <UserMenu variant="Widget" />
        </div>
        {comment?.id && <CommentTimeline key={comment.id} comment={comment} />}
        <PoweredBy />
      </CommentContextProvider>
    </WidgetLayout>
  );
}
type PathParams = {
  commentId: string;
};

type StaticProps = PathParams &
  CommonWidgetProps & {
    comment: CommentTimelineNode;
    pageURL: string;
  };

export const getStaticPaths: GetStaticPaths<PathParams> = async () => {
  const client = getAdminGqlClient();
  const { data, error } = await client
    .query<CommentsQuery>(CommentsDocument, {
      newerThan: dayjs().subtract(1, 'day').toISOString(),
    })
    .toPromise();
  if (error) {
    console.error(`Can't find the comments, error: ${error}`);
  }
  const paths =
    data?.comments.map(({ id }) => ({
      params: {
        commentId: id,
      },
    })) || [];
  return {
    paths,
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<StaticProps, PathParams> = async ({
  params,
}: GetStaticPropsContext<PathParams>): Promise<GetStaticPropsResult<StaticProps>> => {
  if (!params?.commentId) {
    return { notFound: true };
  }
  const { commentId } = params;
  const client = getAdminGqlClient();

  try {
    const { data } = await new Promise<OperationResult<CommentTimelineSubscription>>(
      (resolve /*reject*/) => {
        // @ts-ignore
        /*const { unsubscribe } = */ pipe<OperationResult<CommentTimelineSubscription>>(
          client.subscription(CommentTimelineDocument, { id: commentId }),
          subscribe((result) => {
            // console.log(result);
            resolve(result);
          }),
        );
      },
    );

    if (!data?.commentByPk) {
      return { notFound: true };
    }

    const themeResult = await client
      .query<ThemeOfPageQuery>(ThemeOfPageDocument, {
        pageId: data.commentByPk.pageId,
      })
      .toPromise();
    if (!themeResult.data?.pageByPk) {
      console.error(`Can't find page info`);
      return { notFound: true };
    }

    return {
      props: {
        projectId: themeResult.data.pageByPk.project.id,
        comment: data.commentByPk,
        commentId,
        pageURL: themeResult.data.pageByPk.url,
        theme: (themeResult.data.pageByPk.project.theme as Theme) || null,
        isWidget: true,
      },
      revalidate: 600,
    };
  } catch (error) {
    console.error(superjson.stringify(error));
    return { notFound: true };
  }
};
