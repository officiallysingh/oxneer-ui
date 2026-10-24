'use client';

import { InviteAuctionProvider, useAuctionWizard } from '../../_context';
import { isSetupStep } from '../../_lib/wizard/steps';
import { endTimeFor, latestCloseFor } from '../../_lib/wizard/summary';
import { AuctionWizardShell } from './shell/AuctionWizardShell';
import { StepFooter } from './shell/StepFooter';
import { StepNotices } from './shell/StepNotices';
import { Step1BasicsUnit } from './steps/Step1BasicsUnit';
import { Step2OfferRules } from './steps/Step2OfferRules';
import { Step3Schedule } from './steps/Step3Schedule';
import { Step4Participation } from './steps/Step4Participation';
import { Step5Award } from './steps/Step5Award';
import { Step6Review } from './steps/Step6Review';
import { Step7Invite } from './steps/Step7Invite';

/** Steps 1–5 are plain form editors: they get their slice of state and a patch
 *  function, so they stay reusable and easy to test. This adapter is the only
 *  place that maps wizard context onto their props. */
function SetupStep() {
  const wizard = useAuctionWizard();
  const { step, state, errors, auctionId } = wizard;
  const { basics, offer, schedule } = state;

  switch (step) {
    case 1:
      return <Step1BasicsUnit form={basics} onChange={wizard.patchBasics} errors={errors} />;
    case 2:
      return (
        <Step2OfferRules
          form={offer}
          onChange={wizard.patchOffer}
          schedule={schedule}
          direction={basics.direction}
          openingPrice={basics.openingPrice}
          currencyUnit={basics.currencyUnit}
          roundingModes={wizard.roundingModes}
          roundingMode={basics.roundingMode}
          onRoundingModeChange={(roundingMode) => wizard.patchBasics({ roundingMode })}
          errors={errors}
        />
      );
    case 3:
      return (
        <Step3Schedule
          form={schedule}
          onChange={wizard.patchSchedule}
          clockMechanism={offer.mechanism === 'CLOCK'}
          errors={errors}
        />
      );
    case 4:
      return auctionId ? (
        <Step4Participation
          auctionId={auctionId}
          form={state.participation}
          onChange={wizard.patchParticipation}
          isPrivate={wizard.isPrivate}
          startTime={schedule.startTime}
          onWorkflowCountChange={wizard.setWorkflowCount}
        />
      ) : null;
    case 5:
      return auctionId ? (
        <Step5Award
          auctionId={auctionId}
          form={state.award}
          onChange={wizard.patchAward}
          direction={basics.direction}
          mechanism={offer.mechanism}
          offerVisibility={offer.offerVisibility}
          reserveEnabled={basics.reserveEnabled}
          openingPrice={basics.openingPrice}
          currencyUnit={basics.currencyUnit}
          endTime={endTimeFor(schedule)}
          latestClose={latestCloseFor(schedule)}
          onGoToBasics={() => wizard.goToStep(1)}
          onPostWorkflowCountChange={wizard.setPostWorkflowCount}
        />
      ) : null;
    default:
      return null;
  }
}

function InviteStep() {
  const wizard = useAuctionWizard();
  if (!wizard.auctionId) return null;
  return (
    <InviteAuctionProvider
      value={{
        auctionId: wizard.auctionId,
        isPublic: !wizard.isPrivate,
        published: wizard.published,
        readyToPublish: wizard.progress.ready,
        startTime: wizard.startTime,
        participation: wizard.state.participation,
      }}
    >
      <Step7Invite
        onChangeAccess={() => wizard.goToStep(1)}
        onBack={() => wizard.goToStep(6)}
        onFinish={wizard.finish}
        onStatsChange={wizard.setInviteStats}
      />
    </InviteAuctionProvider>
  );
}

/** The seven-step simple-auction wizard. Used as is by both the create and the
 *  edit route; they differ only in the provider's config. */
export function AuctionWizard() {
  const { step, locked } = useAuctionWizard();

  return (
    <AuctionWizardShell>
      <StepNotices />
      {isSetupStep(step) ? (
        // A disabled fieldset turns every control inside read-only once published.
        <fieldset disabled={locked} className="m-0 min-w-0 space-y-4 border-0 p-0">
          <SetupStep />
        </fieldset>
      ) : step === 6 ? (
        <Step6Review />
      ) : (
        <InviteStep />
      )}
      <StepFooter />
    </AuctionWizardShell>
  );
}
