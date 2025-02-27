import * as React from 'react';

import { ConfirmUserFields } from '$/blocks/confirm-user-fields';
import { SiteLayout } from '$/blocks/layout';
import { Button } from '$/components/button';
import { Heading } from '$/components/heading';
import { Link } from '$/components/link';
import { Text } from '$/components/text';
import { useCurrentUser } from '$/contexts/current-user-context';
import { useCelebration } from '$/hooks/use-celebration';
import { isSSRMode } from '$/utilities/env';
import { hasValidUserProfile } from '$/utilities/user';

// export type WelcomeProps = React.PropsWithChildren<{}>;

export default function Welcome(/*props: WelcomeProps*/): JSX.Element {
  useCelebration('isNewUser');
  const { data, loading } = useCurrentUser();
  const [isFullFilled, setIsFullFilled] = React.useState(isSSRMode ? true : isProfileFullFilled);

  React.useEffect(() => {
    if (loading) return;
    if (!hasValidUserProfile(data)) {
      setIsFullFilled(false);
    } else {
      setIsFullFilled(true);
    }
  }, [data, loading]);
  return (
    <SiteLayout title="Welcome">{isFullFilled ? <FullFilled /> : <NotFullFilled />}</SiteLayout>
  );
}

function FullFilled(): JSX.Element {
  return (
    <section className="flex flex-col items-center justify-center space-y-12">
      <div className="space-y-2 text-center">
        <Heading as="h2" className="!tracking-tight">
          Welcome on board 🎉
        </Heading>
        <Text variant="secondary">
          Feel free to create a project, integrate a widget in your site, or just explore!
        </Text>
      </div>
      <div className="space-x-4">
        <Button variant="solid" color="primary">
          <Link href="/dashboard" variant="plain">
            Dashboard
          </Link>
        </Button>
        <Button color="gray">
          <Link href="/docs/index" variant="plain">
            Docs
          </Link>
        </Button>
      </div>
    </section>
  );
}

function NotFullFilled() {
  return (
    <div className="flex flex-col items-center space-y-8 md:flex-row md:items-center md:space-y-0 md:space-x-8">
      <div className="space-y-3">
        <Heading as="h2" className="!tracking-tight">
          Welcome on board
        </Heading>
        <Text variant="secondary">Just fill this form to get started</Text>
      </div>
      <ConfirmUserFields />
    </div>
  );
}

function isProfileFullFilled(): boolean {
  return !location.search.includes('invalidProfile=true');
}
