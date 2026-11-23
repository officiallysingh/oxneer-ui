const steps = [
  {
    title: 'Browse auctions',
    description: 'Explore live and upcoming auctions filtered by category and schedule.',
  },
  {
    title: 'Join and qualify',
    description: 'Sign in, accept invitations, and complete any required participation steps.',
  },
  {
    title: 'Bid with confidence',
    description: 'Follow the workflow, place bids, and track status through to award.',
  },
];

/** The three steps from discovery to award. Numbered because the order matters. */
export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-border bg-card py-20">
      <div className="container mx-auto grid gap-12 px-6 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground text-balance md:text-4xl">
            How it works
          </h2>
          <p className="mt-3 max-w-sm text-muted-foreground">
            A clear path from discovery to participation on Oxneer auctions.
          </p>
        </div>

        <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <li key={step.title} className="border-t-2 border-primary pt-5">
              <span className="font-display text-sm font-semibold tabular-nums text-primary">
                {index + 1}
              </span>
              <h3 className="mt-2 font-display text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
