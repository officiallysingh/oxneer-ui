'use client';

import { motion } from 'framer-motion';
import { Search, UserPlus, Gavel } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: 'Browse auctions',
    description: 'Explore live and upcoming auctions filtered by category and schedule.',
  },
  {
    icon: UserPlus,
    title: 'Join & qualify',
    description: 'Sign in, accept invitations, and complete any required participation steps.',
  },
  {
    icon: Gavel,
    title: 'Bid with confidence',
    description: 'Follow the workflow, place bids, and track status through to award.',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-y border-border bg-muted/20 py-16">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-lg mx-auto"
        >
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            How it <span className="text-gradient-gold">works</span>
          </h2>
          <p className="mt-3 font-body text-muted-foreground">
            A clear path from discovery to participation on Oxneer auctions.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="text-center md:text-left"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <step.icon className="h-5 w-5" aria-hidden />
              </div>
              <p className="font-body text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                Step {index + 1}
              </p>
              <h3 className="font-display text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 font-body text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
