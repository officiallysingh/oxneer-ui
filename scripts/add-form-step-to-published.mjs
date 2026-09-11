#!/usr/bin/env node

/**
 * add-form-step-to-published.mjs
 *
 * Deletes all published auctions and recreates them with a FORM_STEP
 * inserted into their workflow.
 *
 * Usage:
 *   node scripts/add-form-step-to-published.mjs
 *   FORM_TYPE_ID=xxx node scripts/add-form-step-to-published.mjs
 */

const BASE_URL = process.env.OXNEER_BASE_URL || 'http://localhost:8090';
const API = `${BASE_URL}/api/v1`;
const FORM_TYPE_ID = process.env.FORM_TYPE_ID || '6aa1fc2273c02a0f0317aa51';
const LISTING_ID = process.env.LISTING_ID || '6a9ffcc3fd9147889996fc52';
const SUBCATEGORY_ID = '6a9e7e9ebd15b29506b3567d';
const FORM_STEP_NAME = 'Product Details';
const FORM_STEP_DESC = 'Provide additional product information';

const info = (msg) => console.log(`\x1b[1;34m[INFO]\x1b[0m  ${msg}`);
const ok = (msg) => console.log(`\x1b[1;32m[OK]\x1b[0m    ${msg}`);
const warn = (msg) => console.log(`\x1b[1;33m[WARN]\x1b[0m  ${msg}`);
const fail = (msg) => { console.error(`\x1b[1;31m[FAIL]\x1b[0m  ${msg}`); process.exit(1); };

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, data: json };
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║    Add FORM_STEP to Published Auctions (delete & recreate) ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  info(`Form type: ${FORM_TYPE_ID} (${FORM_STEP_NAME})`);
  info(`Listing: ${LISTING_ID}`);
  console.log('');

  // Health check
  info('Checking server...');
  try {
    const res = await fetch(`${BASE_URL}/swagger-ui/index.html`);
    if (!res.ok && res.status !== 302) fail(`Server not reachable (${res.status})`);
    ok('Server is reachable');
  } catch { fail('Server not reachable'); }

  // Fetch all auctions
  info('Fetching all auctions...');
  const { data: auctionsRes } = await api('GET', '/auctions');
  const auctions = auctionsRes.content || [];
  info(`Found ${auctions.length} auction(s)`);

  const newIds = [];
  for (let i = 0; i < auctions.length; i++) {
    const auction = auctions[i];
    const id = auction.id;
    const title = auction.title || '?';
    const idx = `[${i + 1}/${auctions.length}]`;

    console.log('');
    info(`${idx} Processing: ${title} (${id})`);

    // Fetch workflow
    const { data: workflow } = await api('GET', `/auctions/${id}/workflow`);
    const steps = Array.isArray(workflow) ? workflow : [];

    // Check if FORM_STEP already exists with correct typeId
    const formStep = steps.find(s => {
      const t = typeof s.type === 'object' ? Object.keys(s.type)[0] : s.type;
      return t === 'FORM_STEP';
    });
    const formTypeId = formStep ? (typeof formStep.typeId === 'object' ? Object.keys(formStep.typeId)[0] : formStep.typeId) : null;
    if (formStep && formTypeId === FORM_TYPE_ID) {
      ok('  Already has FORM_STEP with correct typeId, skipping');
      continue;
    }
    if (formStep && formTypeId !== FORM_TYPE_ID) {
      warn(`  FORM_STEP has wrong typeId ${formTypeId}, will fix`);
    }

    // Build new workflow: filter out existing FORM_STEP, insert correct one at order 1
    // API returns type/phase as objects {"TNC_FORM_STEP":"..."}, but set workflow needs plain strings
    const normalizeVal = (v) => (typeof v === 'object' && v !== null ? Object.keys(v)[0] : v);
    const nonFormSteps = steps.filter(s => {
      const t = typeof s.type === 'object' ? Object.keys(s.type)[0] : s.type;
      return t !== 'FORM_STEP';
    });
    const newWorkflow = nonFormSteps.map((s, idx) => {
      const step = {
        type: normalizeVal(s.type),
        name: s.name,
        description: s.description,
        order: idx + 2, // shift by 1 to make room for FORM_STEP at position 1
        phase: normalizeVal(s.phase),
      };
      // Copy step-type-specific fields
      if (s.tncText) step.tncText = s.tncText;
      if (s.typeId) step.typeId = normalizeVal(s.typeId);
      if (s.mode) step.mode = normalizeVal(s.mode);
      if (s.offset) step.offset = s.offset;
      if (s.heads) step.heads = s.heads.map(h => ({
        ...h,
        basis: normalizeVal(h.basis),
      }));
      if (s.manualApproval !== undefined) step.manualApproval = s.manualApproval;
      if (s.preStartDeadlineDuration) step.preStartDeadlineDuration = s.preStartDeadlineDuration;
      if (s.prePayment !== undefined) step.prePayment = s.prePayment;
      if (s.postPayment !== undefined) step.postPayment = s.postPayment;
      if (s.tncBlobId) step.tncBlobId = s.tncBlobId;
      return step;
    });
    // Insert FORM_STEP at the beginning (order 1) with correct typeId
    newWorkflow.unshift({
      type: 'FORM_STEP',
      name: FORM_STEP_NAME,
      description: FORM_STEP_DESC,
      order: 1,
      phase: 'PRE_AUCTION',
      typeId: FORM_TYPE_ID,
    });

    // Delete the auction
    info('  Deleting...');
    const delRes = await api('DELETE', `/auctions/${id}`);
    if (delRes.status >= 300) {
      warn(`  Failed to delete (HTTP ${delRes.status}): ${JSON.stringify(delRes.data)}`);
      continue;
    }
    ok('  Deleted');

    // Extract config for recreation
    const protocol = {};
    if (auction.protocol) {
      for (const [key, val] of Object.entries(auction.protocol)) {
        protocol[key] = typeof val === 'object' ? Object.keys(val)[0] : val;
      }
    }

    // Ensure description meets min length
    const description = (auction.description && auction.description.length >= 5)
      ? auction.description
      : (auction.description || title + ' - auction');

    // Create auction
    info('  Creating...');
    const createPayload = {
      type: 'OFFER_BASE_STEP_PRICED_ATOMIC_UNIT_AUCTION',
      format: 'SIMPLE',
      protocol: {
        accessibility: protocol.accessibility || 'PUBLIC',
        direction: protocol.direction || 'FORWARD',
        dimension: protocol.dimension || 'ONE_DIMENSIONAL',
        participantVisibility: protocol.participantVisibility || 'ALIAS',
        offerVisibility: protocol.offerVisibility || 'RANK',
      },
      title: title,
      description: description,
      referenceId: auction.referenceId || '',
      monetaryOptions: {
        currencyUnit: auction.monetaryOptions?.currencyUnit || 'INR',
        precision: auction.monetaryOptions?.precision || 2,
        roundingMode: auction.monetaryOptions?.roundingMode || 'HALF_UP',
      },
      tags: auction.tags || [],
      subCategories: auction.subCategories?.map(s => typeof s === 'object' ? s.id : s) || [SUBCATEGORY_ID],
      unit: {
        type: 'SINGLE_UNIT',
        item: { id: LISTING_ID, name: title, description: description, quantity: 1 },
        openingPrice: 10000,
        standingPrice: 10000,
      },
    };

    const createRes = await api('POST', '/auctions', createPayload);
    if (createRes.status >= 300) {
      warn(`  Failed to create (HTTP ${createRes.status}): ${JSON.stringify(createRes.data)}`);
      continue;
    }

    const newId = createRes.data?.id ||
      (typeof createRes.data === 'string' ? createRes.data.match(/[0-9a-f]{24}/)?.[0] : null);
    if (!newId) {
      warn('  Could not extract new auction ID');
      continue;
    }
    ok(`  Created: ${newId}`);

    // Set workflow
    info('  Setting workflow...');
    const wfRes = await api('POST', `/auctions/${newId}/workflow`, newWorkflow);
    if (wfRes.status >= 300) {
      warn(`  Failed to set workflow (HTTP ${wfRes.status}): ${JSON.stringify(wfRes.data)}`);
    } else {
      ok('  Workflow set');
    }

    // Schedule and publish
    info('  Scheduling & publishing...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(12, 0, 0, 0);

    const schedPayload = {
      startTime: tomorrow.toISOString().replace('Z', '+05:30'),
      endTime: tomorrowEnd.toISOString().replace('Z', '+05:30'),
      publish: true,
    };
    const schedRes = await api('PUT', `/auctions/${newId}/schedule`, schedPayload);
    if (schedRes.status >= 300) {
      warn(`  Failed to schedule (HTTP ${schedRes.status}): ${JSON.stringify(schedRes.data)}`);
    } else {
      ok('  Scheduled & published');
    }

    newIds.push(newId);
  }

  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Done! Recreated ${newIds.length} auction(s) with FORM_STEP`);
  if (newIds.length) {
    console.log('');
    console.log('  New auction IDs:');
    newIds.forEach((id, i) => console.log(`    ${i + 1}. ${id}`));
  }
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
}

main().catch(err => fail(err.message));
