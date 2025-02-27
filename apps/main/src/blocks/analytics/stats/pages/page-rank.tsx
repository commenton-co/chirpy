import clsx from 'clsx';
import * as React from 'react';
import FlipMove from 'react-flip-move';

import { IconMessageSquare, IconFile, IconExternalLink } from '$/components/icons';
import { Link } from '$/components/link';
import { usePrevious } from '$/hooks/use-previous';
import { ANALYTICS_DOMAIN, WIDGET_COMMENT_PATH } from '$/lib/constants';

import * as api from '../../analytics-api';
import styles from '../../analytics.module.scss';
import FadeIn from '../../fade-in';
import LazyLoader from '../../lazy-loader';
import numberFormatter from '../../number-formatter';
import { Timer } from '../../timer';
import { Props } from '../../type';
import * as url from '../../url';
import Bar from '../bar';
import { EmptyState } from '../empty-state';
import { ViewNumber } from '../fine-components';
import MoreLink from '../more-link';

export interface Page {
  name: string;
  count: number;
  unique_entrances: number;
  conversion_rate: number;
  unique_exits: number;
  visitors: number;
  total_visitors: number;
  total_entrances: number;
  visit_duration: number;
  bounce_rate: number;
}

export interface PageRankProps extends Props {
  timer?: Timer;
  apiPath: 'entry-pages' | 'exit-pages' | 'pages';
}

export function PageRank(props: PageRankProps) {
  const [loading, setLoading] = React.useState(false);
  const [pages, setPages] = React.useState<Page[]>([]);

  const fetchPages = () => {
    api
      .getStats(`/api/stats/${ANALYTICS_DOMAIN}/${props.apiPath}`, props.site, props.query)
      .then((res) => {
        setPages(res);
        setLoading(false);
      });
  };
  const prevQuery = usePrevious(props.query);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (prevQuery !== props.query) {
      setLoading(true);
      setPages([]);
      fetchPages();
    }
  });
  const onVisible = () => {
    fetchPages();
    props.timer?.onTick(fetchPages);
  };

  return (
    <LazyLoader onVisible={onVisible} className="flex flex-grow flex-col">
      {loading && (
        <div className={clsx('mx-auto mt-44', styles.loading)}>
          <div></div>
        </div>
      )}
      <FadeIn show={!loading} className="flex-grow">
        <List pages={pages} query={props.query} apiPath={props.apiPath} site={props.site} />
      </FadeIn>
      {!loading && <MoreLink site={props.site} list={pages!} endpoint="pages" />}
    </LazyLoader>
  );
}

type ListProps = {
  pages: Page[];
} & Pick<PageRankProps, 'query' | 'apiPath' | 'site'>;

function List(props: ListProps) {
  const label = () => {
    if (props.query.period === 'realtime') {
      return 'Current visitors';
    }

    if (showConversionRate()) {
      return 'Conversions';
    }
    switch (props.apiPath) {
      case 'entry-pages':
        return 'Unique Entrances';
      case 'exit-pages':
        return 'Unique Exits';
      case 'pages':
        return 'Visitors';
    }
  };
  const showConversionRate = () => {
    return !!props.query.filters.goal;
  };
  if (props.pages?.length > 0) {
    return (
      <>
        <div className="mt-3 mb-2 flex items-center justify-between text-xs font-bold tracking-wide text-gray-1100">
          <span>Page url</span>
          <div className="text-right">
            <span className="w-30 inline-block">{label()}</span>
            {showConversionRate() && <span className="inline-block w-20">CR</span>}
          </div>
        </div>

        <FlipMove>
          <div>
            {props.pages?.map((page) => (
              <Page
                key={page.name}
                page={page}
                showConversionRate={showConversionRate()}
                pages={props.pages}
                site={props.site}
                query={props.query}
              />
            ))}
          </div>
        </FlipMove>
      </>
    );
  }
  return <EmptyState />;
}

type PageProps = Props & {
  showConversionRate: boolean;
  page: Page;
  pages: Page[];
};

function Page({ page, site, pages, showConversionRate }: PageProps) {
  const externalLink = url.externalLinkForPage(site.domain, page.name);
  const maxWidthDeduction = showConversionRate ? '10rem' : '5rem';

  return (
    <div className="my-1 flex items-center justify-between text-sm" key={page.name}>
      <Bar count={page.count} all={pages} color="orange" maxWidthDeduction={maxWidthDeduction}>
        <PageLink name={page.name} externalLink={externalLink} />
      </Bar>
      <ViewNumber>{numberFormatter(page.count)}</ViewNumber>
      {showConversionRate && <ViewNumber>{numberFormatter(page.conversion_rate)}%</ViewNumber>}
    </div>
  );
}

function PageLink({ name, externalLink }: { name: string; externalLink: string }): JSX.Element {
  const isCommentWidget = name.startsWith(WIDGET_COMMENT_PATH);
  return (
    <span className="group relative flex items-center space-x-1 break-all px-2 py-1.5">
      <span
        {...(isCommentWidget && {
          tooltip: 'This page contains a comment widget',
        })}
      >
        <Link
          href={url.setQuery('entry_page', name)}
          className=" inline-flex items-center space-x-1 text-gray-1200 hover:underline"
          variant="plain"
        >
          {isCommentWidget ? <IconMessageSquare size={14} /> : <IconFile size={14} />}
          <span className="max-w-sm md:truncate">
            {isCommentWidget ? name.slice(WIDGET_COMMENT_PATH.length) : name}
          </span>
        </Link>
      </span>
      <Link
        href={externalLink}
        className="invisible text-gray-1200 group-hover:visible"
        variant="plain"
        tooltip="Click to open in a new tab"
      >
        <IconExternalLink size={16} />
      </Link>
    </span>
  );
}
