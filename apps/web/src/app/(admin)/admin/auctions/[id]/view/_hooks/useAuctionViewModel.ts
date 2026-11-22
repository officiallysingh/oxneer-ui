'use client';

import { useMemo } from 'react';
import type { InviteCounts, ParticipantView } from '../../../_components/wizard/invite/invite';
import { buildTimeline } from '../../../_components/wizard/review/timeline';
import { auctionChips, glossaryFor, keyAmounts, plainSummary } from '../_lib/facts';
import { comingUp, nowSentence } from '../_lib/now';
import { attentionItems, peopleCounts, readinessFunnel } from '../_lib/people';
import { ruleCards } from '../_lib/rules';
import {
  auctionStage,
  auctionTimes,
  countdownFor,
  progressSteps,
  registrationEndsAt,
} from '../_lib/stage';
import { countRows, publishedRow, stepProgress, stepSections } from '../_lib/steps';
import type { AuctionViewData } from './useAuctionView';

interface ParticipantsSlice {
  views: ParticipantView[];
  counts: InviteCounts;
}

/** Derives every section of the view page from the loaded data. Stage and
 *  countdown move with `now`; the rest only changes when the data does. */
export function useAuctionViewModel(
  data: AuctionViewData,
  participants: ParticipantsSlice,
  now: Date,
) {
  const { auction, state, preSteps, postSteps } = data;
  const { views } = participants;

  const times = useMemo(() => auctionTimes(auction), [auction]);
  const stage = auctionStage(auction, now);
  const countdown = countdownFor(stage, times, now);
  const registrationEnds = useMemo(
    () => registrationEndsAt(preSteps, times.start),
    [preSteps, times.start],
  );

  const people = useMemo(() => {
    const counts = peopleCounts(views);
    return {
      counts,
      funnel: readinessFunnel(views),
      attention: attentionItems(counts),
      progress: stepProgress(views),
    };
  }, [views]);

  const progress = useMemo(
    () =>
      progressSteps({
        stage,
        times,
        registrationEnds,
        createdAt: auction.createdAt,
        hasPreSteps: preSteps.length > 0,
        hasPostSteps: postSteps.length > 0,
      }),
    [stage, times, registrationEnds, auction.createdAt, preSteps.length, postSteps.length],
  );

  const facts = useMemo(
    () => ({
      chips: auctionChips(state),
      amounts: keyAmounts(state, preSteps),
      summary: plainSummary(state, preSteps),
      glossary: glossaryFor(state, preSteps),
    }),
    [state, preSteps],
  );

  const rules = useMemo(
    () => ruleCards({ auction, state, preSteps, postSteps, readyCount: people.counts.ready }),
    [auction, state, preSteps, postSteps, people.counts.ready],
  );

  const nowMinute = Math.floor(now.getTime() / 60_000);
  const overview = useMemo(
    () => ({
      sentence: nowSentence({ stage, state, preSteps, times, registrationEnds }),
      comingUp: comingUp({
        state,
        preSteps,
        postSteps,
        times,
        registrationEnds,
        now: new Date(nowMinute * 60_000),
      }),
    }),
    [stage, state, preSteps, postSteps, times, registrationEnds, nowMinute],
  );

  const timeline = useMemo(
    () => buildTimeline(state, preSteps, postSteps),
    [state, preSteps, postSteps],
  );

  const steps = useMemo(() => {
    const sections = stepSections(timeline, stage, people.progress);
    const invited = people.counts.all - people.counts.out;
    return { published: publishedRow(stage, invited), sections, count: countRows(sections) };
  }, [timeline, stage, people]);

  return {
    stage,
    times,
    countdown,
    registrationEnds,
    progress,
    overview,
    facts,
    rules,
    steps,
    people,
  };
}

export type AuctionViewModel = ReturnType<typeof useAuctionViewModel>;
