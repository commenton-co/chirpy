import {
  GetStaticProps,
  InferGetStaticPropsType,
  GetStaticPropsResult,
  GetStaticPropsContext,
  GetStaticPaths,
} from 'next';
import * as React from 'react';
import superjson from 'superjson';
import { OperationResult } from 'urql';
import { pipe, subscribe } from 'wonka';

import { CommentTrees } from '$/blocks/comment-trees';
import { WidgetLayout } from '$/blocks/layout';
import { PoweredBy } from '$/blocks/powered-by';
import { CommentContextProvider } from '$/contexts/comment-context';
import {
  CommentTreeDocument,
  CommentTreeSubscription,
  useCommentTreeSubscription,
} from '$/graphql/generated/comment';
import { ThemeOfPageDocument, ThemeOfPageQuery } from '$/graphql/generated/page';
import { getAdminGqlClient } from '$/lib/admin-gql-client';
import {
  PageByUrlOnlyDocument,
  PageByUrlOnlyQuery,
  PagesDocument,
  PagesQuery,
} from '$/server/graphql/generated/page';
import { CommonWidgetProps } from '$/types/page.type';
import { Theme } from '$/types/theme.type';
import { CommentLeafType } from '$/types/widget';
import { isSSRMode } from '$/utilities/env';

export type PageCommentProps = InferGetStaticPropsType<typeof getStaticProps>;

/**
 * Comment tree widget for a page
 * @param props
 */
export default function CommentWidgetPage(props: PageCommentProps): JSX.Element {
  let error = '';
  let pageId = '';
  let pageURL = '';

  if (isStaticError(props)) {
    error = props.error;
  } else {
    pageId = props.pageId;
    pageURL = props.pageURL;
  }
  const [{ data }] = useCommentTreeSubscription({
    variables: { pageURL },
    pause: isSSRMode,
  });
  const comments = data?.comments || (isStaticError(props) ? [] : props.comments || []);

  if (error) {
    return <p>{error}</p>;
  }
  // TODO: resolve this comments undefined error
  if (isStaticError(props)) {
    return <p>Wrong page.</p>;
  }

  return (
    <WidgetLayout widgetTheme={props.theme} title="Comment">
      <CommentContextProvider projectId={props.projectId} pageId={pageId}>
        <div className="pt-1">
          <CommentTrees comments={comments} />
        </div>
        <PoweredBy />
      </CommentContextProvider>
    </WidgetLayout>
  );
}

type PathParams = {
  pageURL: string;
};

// Get all project then prerender all their page comments
export const getStaticPaths: GetStaticPaths<PathParams> = async () => {
  const client = getAdminGqlClient();
  const { data } = await client.query<PagesQuery>(PagesDocument).toPromise();

  const paths: { params: PathParams }[] =
    data?.pages.map(({ url }) => {
      return {
        params: {
          pageURL: url,
        },
      };
    }) || [];

  // We'll pre-render only these paths at build time.
  // { fallback: false } means other routes should 404.
  return { paths, fallback: true };
};

type StaticProps = PathParams &
  CommonWidgetProps & {
    comments: CommentLeafType[];
    pageId: string;
  };
type StaticError = {
  error: string;
};

export const getStaticProps: GetStaticProps<StaticProps | StaticError, PathParams> = async ({
  params,
}: GetStaticPropsContext<PathParams>): Promise<GetStaticPropsResult<StaticProps | StaticError>> => {
  if (!params?.pageURL) {
    return { notFound: true };
  }
  const { pageURL } = params;
  const client = getAdminGqlClient();
  const pageQuery = await client
    .query<PageByUrlOnlyQuery>(PageByUrlOnlyDocument, { url: pageURL })
    .toPromise();
  const pageId = pageQuery.data?.pages?.[0]?.id;
  if (!pageId) {
    return { notFound: true };
  }

  try {
    const { data } = await new Promise<OperationResult<CommentTreeSubscription>>(
      (resolve /*reject*/) => {
        // @ts-ignore
        /*const { unsubscribe } = */ pipe<OperationResult<CommentTreeSubscription>>(
          client.subscription(CommentTreeDocument, { pageURL }),
          subscribe((result) => {
            // console.log(result);
            resolve(result);
          }),
        );
      },
    );

    if (!data?.comments) {
      return { notFound: true };
    }
    const { comments } = data;
    const themeResult = await client
      .query<ThemeOfPageQuery>(ThemeOfPageDocument, {
        pageId,
      })
      .toPromise();
    if (!themeResult?.data?.pageByPk) {
      console.error(`Can't find theme info`);
      return { notFound: true };
    }
    return {
      props: {
        comments,
        pageURL,
        pageId,
        projectId: themeResult.data.pageByPk.project.id,
        theme: (themeResult.data.pageByPk.project.theme as Theme) || null,
        isWidget: true,
      },
    };
  } catch (error) {
    console.error(superjson.stringify(error));
    return { notFound: true };
  }
};

function isStaticError(props: $TsAny): props is StaticError {
  return !!props.error;
}
