import * as React from 'react';

import { SiteLayout } from '$/blocks/layout';
import { PageTitle } from '$/blocks/page-title';
import { Avatar } from '$/components/avatar';
import { Button } from '$/components/button';
import { Heading } from '$/components/heading';
import { IconEdit2, IconLink2, IconSave, IconTrash2, IconTwitter } from '$/components/icons';
import { Link } from '$/components/link';
import { Popover } from '$/components/popover';
import { Spinner } from '$/components/spinner';
import { Text } from '$/components/text';
import { TextArea } from '$/components/text-area';
import { TextField } from '$/components/text-field';
import { useToast } from '$/components/toast';
import { useCurrentUser } from '$/contexts/current-user-context';
import { useUpdateUserByPkMutation } from '$/graphql/generated/user';
import { useForm } from '$/hooks/use-form';

type FormFields = {
  name: string;
  bio: string;
  website: string;
  twitter: string;
};

export default function Profile(): JSX.Element {
  const {
    isSignIn,
    loading,
    data: { id, avatar, name, username, bio, website, twitterUserName },
    refetchData,
  } = useCurrentUser();

  const [isEditMode, setIsEditMode] = React.useState(false);
  const [{}, updateUserByPk] = useUpdateUserByPkMutation();

  const { register, errors, handleSubmit } = useForm<FormFields>({
    defaultValues: {
      name: name || '',
      bio: bio || '',
      website: website || '',
      twitter: twitterUserName || '',
    },
  });
  const { showToast } = useToast();
  const handleClickButton = handleSubmit(async (fields) => {
    if (isEditMode) {
      try {
        await updateUserByPk({
          id: id || '-1',
          name: fields.name,
          bio: fields.bio,
          website: fields.website,
          twitterUserName: fields.twitter,
        });
        refetchData?.();
        showToast({
          type: 'success',
          title: 'Profile saved!',
        });
        setIsEditMode(false);
      } catch (error) {
        console.error(error);
        showToast({
          type: 'error',
          title: 'Sorry, something wrong happened in our side, please try again later.',
        });
      }
    } else {
      setIsEditMode(true);
    }
  });

  const handleClickDiscard = () => {
    setIsEditMode(false);
  };

  if (!isSignIn && loading) {
    return (
      <ProfileContainer>
        <Spinner className="mt-20 justify-center" />
      </ProfileContainer>
    );
  }

  return (
    <SiteLayout title={name || 'Profile'}>
      <ProfileContainer className="space-y-7">
        <PageTitle>Profile</PageTitle>
        <section className="space-y-6">
          <div className="relative mt-1 flex h-40 w-full items-end justify-center rounded-t bg-gradient-to-r from-primary-900 to-plum-900">
            {avatar && (
              <Avatar
                src={avatar}
                size="xl"
                className="absolute translate-y-1/2"
                alt={`Avatar of ${name}`}
              />
            )}
          </div>
          <div className="flex flex-row items-start justify-between pt-4">
            <div>
              {isEditMode ? (
                <TextField
                  {...register('name', {
                    required: { value: true, message: 'Name is required' },
                  })}
                  label="Name"
                  errorMessage={errors.name}
                />
              ) : (
                name && <Heading as="h4">{name}</Heading>
              )}
              {username && <Text title="Username, can't edit">@{username}</Text>}
            </div>
            <div className="flex flex-row space-x-2">
              {isEditMode && (
                <Popover
                  content={
                    <div className="flex flex-row items-center space-x-2">
                      <Text className="w-max">Your unsaved content will lost, are you sure?</Text>
                      <Button size="sm" onClick={handleClickDiscard}>
                        Confirm
                      </Button>
                    </div>
                  }
                >
                  <IconTrash2 size={16} />
                  <span className="ml-1">Discard</span>
                </Popover>
              )}
              <Button
                className="space-x-1"
                onClick={handleClickButton}
                variant="solid"
                color="primary"
                aria-label={`${isEditMode ? 'Save' : 'Edit'} profile`}
              >
                {isEditMode ? <IconSave size={16} /> : <IconEdit2 size={16} />}
                <span>{isEditMode ? 'Save' : 'Edit'}</span>
              </Button>
            </div>
          </div>
          {isEditMode ? <TextArea {...register('bio')} label="Bio" /> : bio && <Text>{bio}</Text>}
          {isEditMode ? (
            <TextField {...register('website')} label="Website" prefixNode="https://" />
          ) : (
            website && (
              <Link variant="solid" href={website} className="flex w-fit flex-row space-x-2">
                <IconLink2 />
                <span>{website}</span>
              </Link>
            )
          )}
          {isEditMode ? (
            <TextField {...register('twitter')} label="Twitter" prefixNode="https://twitter.com/" />
          ) : (
            twitterUserName && (
              <Link
                variant="solid"
                href={`https://twitter.com/${twitterUserName}`}
                className="flex w-fit flex-row items-center space-x-2"
              >
                <IconTwitter size={22} />
                <span>@{twitterUserName}</span>
              </Link>
            )
          )}
        </section>
      </ProfileContainer>
    </SiteLayout>
  );
}

function ProfileContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return <section className={className}>{children}</section>;
}
