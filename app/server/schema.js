// Single source of truth for site content: the editor form, validation and the default copy
// are all derived from these descriptors.
const text = (k, label, d = '', o = {}) => ({ k, label, t: 'text', d, ...o });
const area = (k, label, d = '', o = {}) => ({ k, label, t: 'area', d, ...o });
const img = (k, label, d = '', o = {}) => ({ k, label, t: 'image', d, ...o });
const url = (k, label, d = '', o = {}) => ({ k, label, t: 'url', d, ...o });
const toggle = (k, label, d = true, o = {}) => ({ k, label, t: 'toggle', d, ...o });
const group = (k, label, fields, o = {}) => ({ k, label, t: 'group', fields, ...o });
const list = (k, label, fields, items, o = {}) => ({ k, label, t: 'list', fields, d: items, ...o });

const meta = (title, description) => group('meta', 'Search and sharing', [
  text('title', 'Page title', title, { max: 70, help: 'Shown in the browser tab and in search results.' }),
  area('description', 'Description', description, { max: 200, rows: 3, help: 'One or two sentences for search results and link previews.' }),
]);

const head = (title, lead, image, caption) => group('head', 'Page heading', [
  text('title', 'Heading', title, { max: 120 }),
  area('lead', 'Introduction', lead, { rows: 3, max: 500 }),
  img('image', 'Heading image', image),
  text('caption', 'Image caption', caption, { max: 140 }),
]);

export const PAGES = [
  {
    id: 'site', title: 'Company and contact', path: null,
    blurb: 'Name, address, phone, email, social links and footer text used across every page.',
    fields: [
      group('company', 'Company', [
        text('name', 'Company name', 'DC Consulting', { max: 60, help: 'Used in the header, footer, titles and page text.' }),
        text('tagline', 'Descriptor under the name', 'Sourcing, documentation & logistics', { max: 80 }),
        text('registered', 'Registered entity and number', '', { max: 160, help: 'Shown in the footer and Firm page once filled in.' }),
        text('region', 'Operating region', 'West and Central Africa, with delivery to international ports and vaults', { max: 160 }),
      ]),
      group('contact', 'Contact details', [
        text('email', 'Public email', 'enquiries@example.com', { max: 120, help: 'Also the address enquiries are sent to by default.' }),
        text('phone', 'Telephone', '222-1111-3333', { max: 40 }),
        area('address', 'Office address', '', { rows: 3, max: 300, help: 'Leave empty to keep the address off the website. One line per row.' }),
        text('hours', 'Office hours', '', { max: 120 }),
        text('response', 'Reply time promise', '', { max: 120, help: 'For example: "Within two working days". Leave empty to omit.' }),
      ]),
      group('social', 'Social links', [
        url('linkedin', 'LinkedIn', ''), url('x', 'X', ''), url('facebook', 'Facebook', ''), url('instagram', 'Instagram', ''),
      ], { help: 'Only links that are filled in appear on the website.' }),
      group('seo', 'Site address and sharing', [
        url('domain', 'Website address', 'https://www.example.com', { help: 'Used for search engines and link previews.' }),
        img('share', 'Link preview image', 'pit-terraces', { help: 'Shown when a page is shared on social media or messaging.' }),
      ]),
      group('footer', 'Footer', [
        area('blurb', 'Footer statement', 'We source, process, document and ship rare earth minerals, crude oil and gemstones for procurement firms, corporations and institutions.', { rows: 3, max: 260 }),
        text('legal', 'Footer legal line', 'All rights reserved.', { max: 120 }),
      ]),
      group('form', 'Enquiry form', [
        url('endpoint', 'Form service URL', '', { help: 'Optional. Enquiries are always stored in the staff inbox; this forwards a copy to another service.' }),
        text('success', 'Confirmation message', 'Thank you. Your enquiry has reached us and a named person will reply.', { max: 200 }),
      ]),
    ],
  },
  {
    id: 'home', title: 'Home', path: '/',
    blurb: 'The first page visitors see.',
    fields: [
      meta('DC Consulting | Sourcing, documentation and logistics for strategic commodities', 'We source, process, document and ship rare earth minerals, crude oil and gemstones for procurement firms, corporations and institutions.'),
      group('hero', 'Opening', [
        text('folio', 'Line above the headline', 'Ground execution for physical commodity contracts', { max: 90 }),
        text('headline', 'Headline', 'We turn procurement mandates into *delivered cargo.*', { max: 120, help: 'Wrap words in asterisks to set them in gold.' }),
        area('lead', 'Introduction', 'DC Consulting sources, processes, documents and ships rare earth minerals, crude oil and gemstones. We work with procurement firms and directly with corporations and institutions.', { rows: 4, max: 400 }),
        text('primary', 'Main button', 'Submit a quote', { max: 30 }),
        text('secondary', 'Second button', 'See how we work', { max: 30 }),
        img('image', 'Opening photograph 1', 'pit-terraces', { help: 'The opening section cycles slowly through three full-width photographs.' }),
        img('image2', 'Opening photograph 2', 'refinery-dusk'),
        img('image3', 'Opening photograph 3', 'container-ship'),
        text('caption', 'Photograph caption', 'Terraced workings at origin', { max: 100 }),
      ]),
      list('route', 'Route strip', [text('title', 'Title', '', { max: 50 }), area('text', 'Text', '', { rows: 2, max: 160 })], [
        { title: 'Direct origin access', text: 'Producer, concession and terminal supply, verified before you commit.' },
        { title: 'Specification-grade processing', text: 'Refined, graded or blended to the buyer’s technical sheet.' },
        { title: 'Chain-of-custody dossier', text: 'Permits, assays and provenance records on every shipment.' },
        { title: 'Secured global logistics', text: 'Tanker, container and armoured air transport, insured.' },
      ], { max: 4, itemLabel: 'title', help: 'Four short statements shown along the route line.' }),
      group('gap', 'The gap between a contract and a cargo', [
        text('title', 'Heading', 'The gap between a contract and a cargo', { max: 100 }),
        area('lead', 'Introduction', 'Large buyers often hand sourcing to procurement firms. Those firms then need someone on the ground who can find material, prepare it, clear it and deliver it. That is our role.', { rows: 4, max: 400 }),
        list('items', 'Principles', [text('title', 'Title', '', { max: 60 }), area('text', 'Text', '', { rows: 3, max: 260 })], [
          { title: 'One point of accountability', text: 'Instead of coordinating miners, laboratories, brokers and carriers separately, you work with one contractor under one agreement.' },
          { title: 'Verification you control', text: 'Your appointed independent inspector can sample and test before release. We do not ask you to trust our word alone.' },
          { title: 'Your client stays yours', text: 'When you subcontract to us, we agree in writing not to approach your end buyer. Confidentiality terms are available before you share details.' },
        ], { max: 5, itemLabel: 'title' }),
      ]),
      group('commodities', 'Commodity areas', [
        text('title', 'Heading', 'Three core commodity areas', { max: 100 }),
        list('items', 'Areas', [text('title', 'Title', '', { max: 60 }), area('text', 'Text', '', { rows: 3, max: 200 }), img('image', 'Photograph', ''), text('href', 'Link', '/commodities#rare-earths', { max: 120 })], [
          { title: 'Rare earths & critical minerals', text: 'Concentrates and separated oxides for magnets, optics, electronics and alloys.', image: 'strata-cut', href: '/commodities#rare-earths' },
          { title: 'Crude oil & products', text: 'Spot and term cargoes, terminal lifting, blending, inspection and tanker coordination.', image: 'tank-farm', href: '/commodities#crude-oil' },
          { title: 'Gemstones', text: 'Rough and cut stones, sorting and cutting, certification and insured transport.', image: 'amethyst', href: '/commodities#gems' },
        ], { max: 4, itemLabel: 'title' }),
        text('noteTitle', 'Other-materials heading', 'Something else, such as copper, gold doré or platinum group metals?', { max: 120 }),
        text('noteText', 'Other-materials text', 'Send the specification and we will tell you whether we can execute it.', { max: 160 }),
        text('noteButton', 'Other-materials button', 'Ask about other materials', { max: 40 }),
      ]),
      group('method', 'How an engagement runs', [
        text('title', 'Heading', 'A documented path from origin to delivery', { max: 100 }),
        area('lead', 'Introduction', 'Every mandate follows the same four stages. Engage us for the full chain or for a single stage. Choose a stage to see how it differs by commodity.', { rows: 3, max: 300 }),
        list('stages', 'Stages', [
          text('title', 'Title', '', { max: 60 }), area('text', 'Text', '', { rows: 3, max: 260 }), img('image', 'Photograph', ''),
          list('rows', 'By commodity', [text('label', 'Label', '', { max: 40 }), area('text', 'Text', '', { rows: 2, max: 200 })], [], { max: 4, itemLabel: 'label' }),
          text('linkLabel', 'Link label', 'Read the full detail', { max: 40 }), text('link', 'Link', '/capabilities', { max: 120 }),
        ], [
          { title: 'Sourcing and verification of supply', text: 'Origin allocation, ownership checks and baseline sampling, so the material and the right to sell it are real before you commit.', image: 'road-to-origin', linkLabel: 'Read the full detail', link: '/capabilities#sourcing',
            rows: [{ label: 'Rare earths', text: 'Off-take from licensed operations, with baseline sampling at source.' }, { label: 'Crude oil', text: 'Allocation lifting from producers, terminals and tank farms.' }, { label: 'Gemstones', text: 'Rough parcels from licensed producers and tenders, sealed and recorded.' }] },
          { title: 'Processing to specification', text: 'Beneficiation, refining, blending, sorting or cutting to the buyer’s technical requirements before export.', image: 'refinery-dusk', linkLabel: 'Read the full detail', link: '/capabilities#processing',
            rows: [{ label: 'Rare earths', text: 'Crushing, milling, separation and chemical processing through partner plants.' }, { label: 'Crude oil', text: 'Terminal blending, water and sediment treatment, gravity and sulphur alignment.' }, { label: 'Gemstones', text: 'Cleaning, sorting, grading, sawing, cutting and polishing.' }] },
          { title: 'Documentation and compliance', text: 'Permits, assay reports, provenance records and banking documents, assembled so cargo can be cleared and financed.', image: 'dossier-stacks', linkLabel: 'See the document set', link: '/assurance',
            rows: [{ label: 'Origin and permits', text: 'Certificates of origin, export licences, royalty and tax clearance.' }, { label: 'Inspection', text: 'Assay, quality and quantity reports from the surveyor you appoint.' }, { label: 'Provenance and banking', text: 'Chain-of-custody records, invoices, packing lists and bills of lading.' }] },
          { title: 'Logistics and delivery', text: 'Chartering, containers or secured air transport, with insurance, and the chain of custody kept intact until handover.', image: 'quay-cranes', linkLabel: 'Read the full detail', link: '/capabilities#delivery',
            rows: [{ label: 'Crude oil', text: 'Vessel chartering support, ship-to-ship coordination and discharge management.' }, { label: 'Rare earths and bulk', text: 'Sealed drums and bulk bags in containers, with hazardous-goods clearance where needed.' }, { label: 'Gemstones', text: 'Courier or vault-to-vault secured air transport, with insurance.' }] },
        ], { max: 4, itemLabel: 'title' }),
      ]),
      group('process', 'From first message to handover', [
        text('title', 'Heading', 'From first message to handover', { max: 100 }),
        area('lead', 'Introduction', 'The commercial path of a mandate. Each step ends with something you can review before the next one starts.', { rows: 2, max: 300 }),
        list('items', 'Steps', [text('title', 'Title', '', { max: 60 }), area('text', 'Text', '', { rows: 3, max: 260 })], [
          { title: 'Enquiry and confidentiality', text: 'You describe the requirement. If end-buyer details are involved, a mutual confidentiality and non-circumvention agreement is signed first.' },
          { title: 'Specification and feasibility', text: 'We confirm the technical sheet, quantity, delivery terms and timing, and tell you plainly what we can and cannot do.' },
          { title: 'Verification of supply', text: 'Origin, ownership, licences and baseline samples are checked before any commitment is made to you.' },
          { title: 'Terms and documents', text: 'Scope, inspection access, payment structure and the document set are agreed in writing.' },
          { title: 'Execution', text: 'Processing, inspection, export clearance, transport and insurance are carried out and reported against the plan.' },
          { title: 'Handover and records', text: 'Cargo is delivered on the agreed terms and the full chain-of-custody dossier is handed over with it.' },
        ], { max: 8, itemLabel: 'title' }),
      ]),
      group('faq', 'Frequently asked questions', [
        text('title', 'Heading', 'Questions we are usually asked', { max: 100 }),
        area('lead', 'Introduction', 'Short answers before you write to us.', { rows: 2, max: 300 }),
        list('items', 'Questions', [text('q', 'Question', '', { max: 140 }), area('a', 'Answer', '', { rows: 4, max: 700 })], [
          { q: 'Are you a trader or a broker?', a: 'No. We are a contractor. Our job is to execute the physical delivery of a contract that someone else holds. We do not trade for our own account and we do not go around the layers above us.' },
          { q: 'Who do you work with?', a: 'Procurement firms and mandate holders, corporations and manufacturers, government institutions, and trading houses and refiners that need physical lifting, blending or shipping support.' },
          { q: 'Can you work from a technical specification we already have?', a: 'Yes. Send the specification and we will confirm what we can meet and what we cannot, before any commitment is made on either side.' },
          { q: 'How is our end buyer kept private?', a: 'A written mutual confidentiality and non-circumvention agreement is available before you share any end-buyer details, and it is signed first.' },
          { q: 'Which delivery terms do you work with?', a: 'FOB, CFR and CIF for sea cargo, and FCA, CIP and DAP for any mode of transport. The exact terms are agreed per contract.' },
          { q: 'What mandates do you decline?', a: 'We decline mandates where origin, ownership, licensing or sanctions status cannot be established to our satisfaction.' },
        ], { max: 12, itemLabel: 'q' }),
      ]),
      group('close', 'Closing call to action', [
        text('title', 'Heading', 'Have a requirement or an active mandate?', { max: 100 }),
        area('text', 'Text', 'Tell us what you need, the quantity and where it must be delivered. We will reply with what we can and cannot do.', { rows: 3, max: 240 }),
        text('button', 'Button', 'Submit a quote', { max: 30 }),
      ]),
    ],
  },
  {
    id: 'capabilities', title: 'Capabilities', path: '/capabilities',
    blurb: 'The four stages of an engagement in detail.',
    fields: [
      meta('Capabilities | DC Consulting', 'Engage DC Consulting for the whole chain from origin to delivery, or subcontract only the stage you need.'),
      head('Four stages, used together or one at a time', 'Engage us for the whole chain from origin to delivery, or subcontract only the stage you need.', 'container-ship', 'Container vessel under way'),
      list('stages', 'Stages', [
        text('id', 'Anchor', '', { max: 30, help: 'Used in the page address, for example /capabilities#sourcing.' }),
        text('title', 'Title', '', { max: 80 }), area('intro', 'Introduction', '', { rows: 4, max: 400 }),
        list('items', 'By commodity', [text('title', 'Title', '', { max: 60 }), area('text', 'Text', '', { rows: 3, max: 240 })], [], { max: 5, itemLabel: 'title' }),
        img('image', 'Photograph', ''), text('caption', 'Photograph caption', '', { max: 140 }),
        text('linkLabel', 'Link label', '', { max: 40 }), text('link', 'Link', '/contact', { max: 120 }),
      ], [
        { id: 'sourcing', title: 'Sourcing and verification of supply', intro: 'We identify producers, concessions and terminals that can supply your specification, and confirm that the material and the right to sell it are real before you commit.',
          items: [{ title: 'Rare earths and minerals', text: 'Off-take from licensed operations, with baseline sampling at source.' }, { title: 'Crude oil and products', text: 'Allocation lifting from producers, terminals and tank farms.' }, { title: 'Gemstones', text: 'Rough parcels from licensed producers and tenders, sealed and recorded.' }],
          image: 'road-to-origin', caption: 'The road to origin', linkLabel: 'Start with sourcing', link: '/contact' },
        { id: 'processing', title: 'Processing to specification', intro: 'Raw material is prepared to the buyer’s technical requirements before export, to improve purity, grade compliance and transport efficiency.',
          items: [{ title: 'Minerals', text: 'Crushing, milling, magnetic or flotation separation and chemical processing through partner plants.' }, { title: 'Crude and distillates', text: 'Terminal blending, water and sediment treatment, and gravity and sulphur alignment.' }, { title: 'Gemstones', text: 'Cleaning, sorting, grading, sawing, cutting and polishing.' }],
          image: 'refinery-dusk', caption: 'Blending and treatment at the terminal', linkLabel: 'Send a specification', link: '/contact' },
        { id: 'documentation', title: 'Documentation and compliance', intro: 'We assemble the paperwork that customs, banks and compliance teams require. Cargo without a complete document set cannot be cleared or financed.',
          items: [{ title: 'Origin and permits', text: 'Certificates of origin, export licences, royalty and tax clearance.' }, { title: 'Independent inspection', text: 'Assay, quality and quantity reports from the surveyor you appoint.' }, { title: 'Provenance and banking', text: 'Chain-of-custody records, invoices, packing lists, bills of lading and documents formatted for letters of credit.' }],
          image: 'seal-and-stamp', caption: 'Every file sealed and recorded', linkLabel: 'See the document set', link: '/assurance' },
        { id: 'delivery', title: 'Logistics and delivery', intro: 'We arrange transport on the terms you choose and keep the chain of custody intact until handover.',
          items: [{ title: 'Tankers', text: 'Vessel chartering support, ship-to-ship coordination and discharge management.' }, { title: 'Containers and bulk', text: 'Sealed drums and bulk bags in containers, with hazardous-goods clearance where needed.' }, { title: 'Secured air', text: 'Courier or vault-to-vault transport for high-value stones, with insurance.' }],
          image: 'container-ship', caption: 'Handover at the agreed port', linkLabel: 'Discuss delivery', link: '/contact' },
      ], { max: 6, itemLabel: 'title' }),
      group('models', 'Ways to engage us', [
        text('title', 'Heading', 'Ways to engage us', { max: 100 }),
        area('lead', 'Introduction', 'Use us for the whole chain or for the one stage you are missing.', { rows: 2, max: 300 }),
        list('items', 'Options', [text('title', 'Title', '', { max: 60 }), area('text', 'Text', '', { rows: 4, max: 320 })], [
          { title: 'The full chain', text: 'One contract from origin to delivery. We source, process, document and ship, and you deal with a single accountable contractor.' },
          { title: 'A single stage', text: 'Subcontract only the stage you need, for example verification of supply, processing to a technical sheet, or logistics for cargo you already hold.' },
          { title: 'Documentation and compliance', text: 'We assemble and check the document set for a shipment you are already running, so that customs, banks and compliance teams are satisfied.' },
        ], { max: 4, itemLabel: 'title' }),
      ]),
      group('receive', 'What you receive', [
        text('title', 'Heading', 'What you receive', { max: 100 }),
        area('lead', 'Introduction', 'Every engagement produces records you can keep, audit and hand to a bank or regulator.', { rows: 2, max: 300 }),
        list('items', 'Deliverables', [text('title', 'Title', '', { max: 60 }), area('text', 'Text', '', { rows: 2, max: 240 })], [
          { title: 'Verified supply report', text: 'Origin, ownership, licence and sample findings for the material offered.' },
          { title: 'Technical specification sheet', text: 'The agreed parameters, test methods and tolerances the cargo is measured against.' },
          { title: 'Document dossier', text: 'Permits, assay or inspection reports, provenance records and shipping documents in one indexed set.' },
          { title: 'Shipment reporting', text: 'Status updates and incident reports from loading to discharge, including seals and custody transfers.' },
          { title: 'Handover record', text: 'A signed record of delivery on the agreed terms, closing the chain of custody.' },
        ], { max: 8, itemLabel: 'title' }),
      ]),
      group('close', 'Closing call to action', [
        text('title', 'Heading', 'Have a requirement or an active mandate?', { max: 100 }),
        area('text', 'Text', 'Tell us what you need, the quantity and where it must be delivered. We will reply with what we can and cannot do.', { rows: 3, max: 240 }),
        text('button', 'Button', 'Submit a quote', { max: 30 }),
      ]),
    ],
  },
  {
    id: 'commodities', title: 'Commodities', path: '/commodities',
    blurb: 'Specifications and verification for each commodity area.',
    fields: [
      meta('Commodities | DC Consulting', 'Specifications and verification steps for rare earths, crude oil, gemstones and other strategic materials.'),
      head('What we handle', 'Specifications and verification steps for each commodity area. Technical parameters are agreed per contract.', 'strata-cut', 'Strata at origin'),
      list('items', 'Commodity areas', [
        text('id', 'Anchor', '', { max: 30 }), text('title', 'Title', '', { max: 80 }), area('intro', 'Introduction', '', { rows: 3, max: 360 }),
        text('marks', 'Markers', '', { max: 160, help: 'Comma-separated, for example: Nd / Pr, Dy / Tb, Ta / Nb.' }),
        list('rows', 'Specification rows', [text('label', 'Label', '', { max: 40 }), area('text', 'Text', '', { rows: 2, max: 240 })], [], { max: 10, itemLabel: 'label' }),
        img('image', 'Photograph', ''), text('caption', 'Photograph caption', '', { max: 140 }),
      ], [
        { id: 'rare-earths', title: 'Rare earths & critical minerals', intro: 'Used in permanent magnets, lasers and optics, electronics, alloys and batteries. We supply concentrates and separated products to the specification you give us.',
          marks: 'Nd / Pr, Dy / Tb, Y / La / Gd, Ta / Nb, W, Ti, Li / Co, MREC',
          rows: [{ label: 'Forms', text: 'Mixed carbonate, concentrates, separated oxides' }, { label: 'Purity', text: 'Set by the buyer’s specification and confirmed by laboratory assay' }, { label: 'Packaging', text: 'Steel drums or UN-certified bulk bags, in sealed containers' }, { label: 'Verification', text: 'ICP-MS assay by an independent laboratory appointed by the buyer' }, { label: 'Provenance', text: 'OECD due diligence approach to responsible mineral supply chains' }, { label: 'Note', text: 'Radioactive material classes and export controls apply to some concentrates. We check these before quoting.' }],
          image: 'strata-cut', caption: 'Separated oxides and concentrates are verified by buyer-appointed assay' },
        { id: 'crude-oil', title: 'Crude oil & petroleum products', intro: 'Spot and term physical supply for refiners and traders, with terminal lifting, inspection and vessel coordination.',
          marks: 'Light sweet, Medium / heavy, Condensate, Diesel, Jet A-1, Fuel oil',
          rows: [{ label: 'Grades', text: 'As specified, for example by API gravity and sulphur content' }, { label: 'Volumes', text: 'Cargo parcels from vessel-size lots; term arrangements by agreement' }, { label: 'Inspection', text: 'Quality and quantity inspection at shore tank and on the vessel by an independent surveyor' }, { label: 'Vessels', text: 'Tanker chartering support and discharge coordination' }, { label: 'Delivery terms', text: 'FOB, CFR or CIF for ship cargo, agreed in each contract' }, { label: 'Note', text: 'Allocation depends on the seller’s licence and the current sanctions position. We do not proceed where either is unclear.' }],
          image: 'shore-tanks', caption: 'Shore-tank and vessel inspection by an independent surveyor' },
        { id: 'gems', title: 'Gemstones', intro: 'Rough and cut stones, with sorting, cutting and certification, delivered under secured and insured transport.',
          marks: 'Diamonds, Emerald, Ruby, Sapphire, Tourmaline, Aquamarine, Industrial crystals',
          rows: [{ label: 'Forms', text: 'Rough parcels, calibrated and cut stones, industrial and optical crystals' }, { label: 'Processing', text: 'Cleaning, sorting, grading, sawing, cutting, polishing' }, { label: 'Certification', text: 'Kimberley Process certificate for rough diamonds; independent gemmological reports for stones as requested' }, { label: 'Viewing', text: 'In a bonded vault or secure room, with your representative present' }, { label: 'Transport', text: 'Secured courier or vault-to-vault with insurance' }, { label: 'Delivery terms', text: 'FCA, CIP or DAP, agreed in each contract' }],
          image: 'emerald-rough', caption: 'Rough stones are sealed, recorded and viewed under supervision' },
        { id: 'other', title: 'Other materials', intro: 'If your mandate falls outside the three areas above, send us the specification and we will tell you whether we can execute it.',
          marks: 'Copper cathode, Gold doré, Platinum group metals, Manganese, Chrome, Bauxite',
          rows: [{ label: 'How it works', text: 'You send the material, grade, monthly quantity, delivery point and payment structure.' }, { label: 'Our reply', text: 'We confirm what we can deliver, what we would need from you, and what we cannot do.' }],
          image: 'quarry-haul', caption: 'Bulk materials are handled case by case' },
      ], { max: 8, itemLabel: 'title' }),
      group('terms', 'Delivery terms', [
        text('title', 'Heading', 'Delivery terms we work with', { max: 100 }),
        area('lead', 'Introduction', 'Standard Incoterms® 2020 rules. The exact obligations, named place and insurance level are agreed in each contract.', { rows: 2, max: 300 }),
        list('items', 'Terms', [text('code', 'Code', '', { max: 8 }), text('name', 'Name', '', { max: 60 }), text('mode', 'Transport', '', { max: 40 }), area('text', 'What it means', '', { rows: 3, max: 300 })], [
          { code: 'FOB', name: 'Free on Board', mode: 'Sea and inland waterway', text: 'The seller delivers the goods on board the vessel at the named port of shipment. The buyer bears cost and risk from that point.' },
          { code: 'CFR', name: 'Cost and Freight', mode: 'Sea and inland waterway', text: 'The seller pays the freight to the named port of destination. Risk passes to the buyer once the goods are on board at origin.' },
          { code: 'CIF', name: 'Cost, Insurance and Freight', mode: 'Sea and inland waterway', text: 'As CFR, and the seller also insures the cargo for the buyer to a minimum level while it is at sea.' },
          { code: 'FCA', name: 'Free Carrier', mode: 'Any mode', text: 'The seller hands the goods, cleared for export, to the buyer’s carrier at the named place.' },
          { code: 'CIP', name: 'Carriage and Insurance Paid To', mode: 'Any mode', text: 'The seller pays for carriage and insurance to the named destination. Risk passes when the goods are handed to the first carrier.' },
          { code: 'DAP', name: 'Delivered at Place', mode: 'Any mode', text: 'The seller delivers to the named destination, ready for unloading, and bears the risk to that point. The buyer clears import.' },
        ], { max: 10, itemLabel: 'code' }),
      ]),
      group('close', 'Closing call to action', [
        text('title', 'Heading', 'Have a requirement or an active mandate?', { max: 100 }),
        area('text', 'Text', 'Tell us what you need, the quantity and where it must be delivered. We will reply with what we can and cannot do.', { rows: 3, max: 240 }),
        text('button', 'Button', 'Submit a quote', { max: 30 }),
      ]),
    ],
  },
  {
    id: 'assurance', title: 'Assurance', path: '/assurance',
    blurb: 'Documentation, verification and compliance.',
    fields: [
      meta('Assurance | DC Consulting', 'The document set, inspection access and compliance rules behind every DC Consulting shipment.'),
      head('Documentation, verification and how we stay compliant', 'A shipment that cannot be documented cannot be cleared, financed or insured. This is what we prepare, and the rules we work within.', 'dossier-stacks', 'Files kept for every shipment'),
      group('documents', 'The document set', [
        text('title', 'Heading', 'Six groups of documents on every shipment', { max: 100 }),
        text('note', 'Note', 'Exact contents depend on the commodity, origin and destination.', { max: 160 }),
        list('items', 'Documents', [text('title', 'Title', '', { max: 80 }), area('text', 'Text', '', { rows: 4, max: 500 })], [
          { title: 'Certificate of origin', text: 'Issued through the relevant chamber of commerce or authority. Used for tariff, sanctions and import compliance.' },
          { title: 'Independent inspection and assay', text: 'Quality, quantity and composition reports from an independent surveyor or laboratory, such as assay for minerals, shore-tank and ship reports for oil, or gemmological reports for stones. The buyer chooses the inspector.' },
          { title: 'Government permits and payments', text: 'Export licences, royalty and duty receipts, radiation or hazardous-goods clearance where required, and any foreign-exchange or central bank approvals.' },
          { title: 'Provenance and chain of custody', text: 'Records of every transfer from origin to loading, supporting OECD-aligned due diligence, Kimberley Process requirements for rough diamonds, and sanctions screening.' },
          { title: 'Commercial and banking documents', text: 'Commercial invoice, packing list, weight and quantity certificates, formatted to meet letter-of-credit presentation requirements agreed with your bank.' },
          { title: 'Transport and insurance', text: 'Bill of lading or air waybill, charter party where applicable, and cargo insurance arranged on the terms agreed in the contract.' },
        ], { max: 12, itemLabel: 'title' }),
      ]),
      group('checkpoints', 'Inspection access', [
        text('title', 'Heading', 'Three checkpoints', { max: 100 }),
        area('lead', 'Introduction', 'Buyers and their appointed surveyors are welcome at each stage.', { rows: 2, max: 240 }),
        img('image', 'Photograph', 'assay-rack'), text('caption', 'Photograph caption', 'Samples are sealed and racked for assay', { max: 140 }),
        list('items', 'Checkpoints', [text('title', 'Title', '', { max: 60 }), area('text', 'Text', '', { rows: 2, max: 240 })], [
          { title: 'Before processing', text: 'Sample raw ore, rough parcels or shore-tank stock to set a baseline.' },
          { title: 'At sealing or loading', text: 'Independent sampling, serialised seals and the binding quality and quantity report.' },
          { title: 'At discharge', text: 'Reconciliation at the destination port, airport or vault before final payment.' },
        ], { max: 5, itemLabel: 'title' }),
      ]),
      group('rules', 'Our rules', [
        text('title', 'Heading', 'How we work', { max: 100 }),
        list('items', 'Rules', [text('title', 'Title', '', { max: 60 }), area('text', 'Text', '', { rows: 3, max: 300 })], [
          { title: 'Know your counterparty', text: 'We verify the identity and ownership of the parties we deal with and screen them against sanctions lists before any contract proceeds.' },
          { title: 'Verify before release', text: 'Your appointed inspector may sample material before processing, at sealing or loading, and at discharge.' },
          { title: 'Confidentiality and non-circumvention', text: 'We sign a mutual non-circumvention and non-disclosure agreement on request. We do not approach your end buyer without your written authority.' },
        ], { max: 6, itemLabel: 'title' }),
        area('decline', 'Declining statement', 'We decline mandates where origin, ownership, licensing or sanctions status cannot be established to our satisfaction.', { rows: 3, max: 400 }),
      ]),
      group('matrix', 'Documents by commodity', [
        text('title', 'Heading', 'Typical documents by commodity', { max: 100 }),
        area('lead', 'Introduction', 'The final set depends on the contract, the origin and the destination. This is what a buyer’s bank and customs office usually expect to see.', { rows: 2, max: 300 }),
        list('items', 'Commodities', [text('title', 'Commodity', '', { max: 60 }), area('text', 'Documents (one per line)', '', { rows: 6, max: 600 })], [
          { title: 'Rare earths and critical minerals', text: 'Assay or certificate of analysis\nCertificate of origin\nExport permit and royalty clearance\nPacking list and seal record\nBill of lading or airway bill\nRadioactivity statement where applicable' },
          { title: 'Crude oil and petroleum products', text: 'Certificate of quality\nCertificate of quantity\nCertificate of origin\nBill of lading and cargo manifest\nInsurance certificate\nSanctions screening record' },
          { title: 'Gemstones', text: 'Kimberley Process certificate for rough diamonds\nIndependent gemmological report\nCommercial invoice and packing list\nChain-of-custody record\nInsurance certificate\nSecured transport waybill' },
        ], { max: 6, itemLabel: 'title' }),
      ]),
      group('close', 'Closing call to action', [
        text('title', 'Heading', 'Need our confidentiality agreement first?', { max: 100 }),
        area('text', 'Text', 'Tick the confidentiality option on the enquiry form and we will send the agreement before you share end-buyer details.', { rows: 3, max: 240 }),
        text('button', 'Button', 'Submit a quote', { max: 30 }),
      ]),
    ],
  },
  {
    id: 'firm', title: 'Firm', path: '/firm',
    blurb: 'Who the company is and who it works for.',
    fields: [
      meta('The firm | DC Consulting', 'A contractor for the physical side of the deal: finding material, preparing it, clearing it and delivering it.'),
      head('A contractor for the physical side of the deal', 'We do the field work that sits behind procurement contracts: finding material, preparing it, clearing it and delivering it.', 'wake', 'Delivery is the work'),
      group('who', 'Who we are', [
        text('title', 'Heading', 'What DC Consulting does', { max: 100 }),
        img('image', 'Photograph', 'assay-rack'), text('caption', 'Photograph caption', 'Samples are sealed and racked for assay', { max: 140 }),
        area('p1', 'First paragraph', 'Procurement firms and trading houses are good at winning mandates from large buyers. Delivering on those mandates in producing regions needs people, facilities and relationships on the ground. DC Consulting provides that capability.', { rows: 5, max: 700 }),
        area('p2', 'Second paragraph', 'We work across rare earth minerals, crude oil and gemstones, and take on other strategic materials case by case. We are a contractor, not a trading house: our job is to execute the physical delivery of a contract that someone else holds.', { rows: 5, max: 700 }),
        text('worksWith', 'Works with', 'Procurement firms, corporations, government institutions', { max: 160 }),
        text('leadership', 'Leadership line', '', { max: 200, help: 'Names and roles of directors, if you want them shown.' }),
      ]),
      group('tiers', 'Where we fit', [
        text('title', 'Heading', 'Who does what in a typical contract', { max: 100 }),
        img('image', 'Photograph', 'apron-night'), text('caption', 'Photograph caption', 'Cargo movement under secured custody', { max: 140 }),
        area('lead', 'Introduction', 'Many deals pass through three layers. We sit in the last one, and we do not go around the layers above us.', { rows: 3, max: 260 }),
        list('items', 'Layers', [text('title', 'Title', '', { max: 60 }), area('text', 'Text', '', { rows: 3, max: 260 }), text('handoff', 'Hand-off line', '', { max: 80 })], [
          { title: 'End buyer', text: 'A manufacturer, refinery, government institution or other organisation that needs the material.', handoff: 'gives a purchasing mandate' },
          { title: 'Procurement firm or trading house', text: 'Holds the buyer relationship and the commercial terms. Needs someone to execute on the ground.', handoff: 'subcontracts physical execution' },
          { title: 'DC Consulting', text: 'Sources, processes, documents and ships. Bound by a written non-circumvention and confidentiality agreement.', handoff: '' },
        ], { max: 4, itemLabel: 'title' }),
      ]),
      group('clients', 'Who we serve', [
        text('title', 'Heading', 'Four kinds of client', { max: 100 }),
        list('items', 'Clients', [text('title', 'Title', '', { max: 60 }), area('text', 'Text', '', { rows: 3, max: 240 })], [
          { title: 'Procurement firms', text: 'Subcontract origin-to-port execution while keeping your end-buyer relationship private.' },
          { title: 'Corporations and manufacturers', text: 'Secure feedstock such as oxides, concentrates or distillates through a verifiable supply route.' },
          { title: 'Government and institutions', text: 'Strategic reserve and energy supply mandates, with full documentation for public-sector review.' },
          { title: 'Trading houses and refiners', text: 'Physical lifting, blending and shipping support for cargoes you have already contracted.' },
        ], { max: 6, itemLabel: 'title' }),
      ]),
      group('message', 'Message from leadership', [
        toggle('show', 'Show this section', true),
        text('title', 'Heading', 'Principal accountability on every mandate', { max: 100 }),
        area('text', 'Message', 'Our team brings together field operations, laboratory verification and commodity logistics across West and Central Africa. When you contract with DC Consulting, you deal directly with principals who are personally accountable for cargo delivery.', { rows: 6, max: 900, help: 'A blank line starts a new paragraph.' }),
        text('name', 'Signed by', 'Executive leadership', { max: 80 }),
        text('role', 'Role', 'Managing Director and Head of Physical Execution', { max: 120 }),
      ]),
      group('limits', 'What we do and do not do', [
        text('title', 'Heading', 'What we do, and what we do not', { max: 100 }),
        area('lead', 'Introduction', 'Clear limits are part of how we are trusted by buyers, banks and regulators.', { rows: 2, max: 300 }),
        area('does', 'We do (one per line)', 'Execute physical delivery under a written mandate\nVerify origin, ownership and licences before commitment\nProcess material to the buyer’s technical sheet\nAssemble the document set and keep the chain of custody\nReport on every shipment from loading to handover', { rows: 6, max: 800 }),
        area('doesnot', 'We do not (one per line)', 'Trade the commodity for our own account\nApproach or contact your end buyer\nAccept mandates with unclear origin or ownership\nWork on sanctioned or unlicensed material\nRelease a cargo that fails the agreed inspection', { rows: 6, max: 800 }),
      ]),
      group('close', 'Closing call to action', [
        text('title', 'Heading', 'Talk to us about your mandate', { max: 100 }),
        area('text', 'Text', 'Tell us what you need, the quantity and where it must be delivered. We will reply with what we can and cannot do.', { rows: 3, max: 240 }),
        text('button', 'Button', 'Submit a quote', { max: 30 }),
      ]),
    ],
  },
  {
    id: 'contact', title: 'Contact', path: '/contact',
    blurb: 'The enquiry page.',
    fields: [
      meta('Contact | DC Consulting', 'Tell DC Consulting what you need and where it must go. You do not have to name your end buyer.'),
      head('Make an enquiry', 'Tell us what you need and where it must go. You do not have to name your end buyer.', 'apron-night', 'Cargo moves at night too'),
      list('next', 'What happens next', [text('title', 'Title', '', { max: 50 }), area('text', 'Text', '', { rows: 2, max: 200 })], [
        { title: 'We review', text: 'We check the request against what we can supply and document.' },
        { title: 'We reply', text: 'You hear from a named person with questions or a first assessment.' },
        { title: 'We agree terms', text: 'Confidentiality first, then a written proposal.' },
      ], { max: 5, itemLabel: 'title' }),
      group('side', 'Photograph beside the form', [
        img('image', 'Photograph', 'quay-cranes'), text('caption', 'Photograph caption', 'Cargo is handled port by port', { max: 140 }),
      ]),
      group('faq', 'Before you enquire', [
        text('title', 'Heading', 'Before you send an enquiry', { max: 100 }),
        list('items', 'Questions', [text('q', 'Question', '', { max: 140 }), area('a', 'Answer', '', { rows: 4, max: 700 })], [
        { q: 'What should I include?', a: 'The commodity and form, the quantity and unit, the delivery terms and destination, and your target timing. A technical sheet or grade is useful but not required at this stage.' },
        { q: 'Do I have to name my end buyer?', a: 'No. You can describe the requirement without naming the end buyer. If names become necessary, a mutual confidentiality and non-circumvention agreement is signed first.' },
        { q: 'Can I enquire about more than one commodity?', a: 'Yes. Send one enquiry per commodity so that each can be assessed by the right people, or mention the others in the notes field.' },
        { q: 'Is this a request for a binding quotation?', a: 'No. Your enquiry starts an assessment. Any supply or service is offered only in a written proposal and agreed contract.' },
        ], { max: 8, itemLabel: 'q' }),
      ]),
    ],
  },
  {
    id: 'privacy', title: 'Privacy and terms', path: '/privacy',
    blurb: 'Legal text. Have a lawyer review it before launch.',
    fields: [
      meta('Privacy and terms | DC Consulting', 'How DC Consulting handles information you send and the terms of use of this website.'),
      group('head', 'Page heading', [text('title', 'Heading', 'Privacy notice and terms of use', { max: 100 }), area('lead', 'Introduction', 'How we handle information you send us.', { rows: 2, max: 200 })]),
      list('sections', 'Sections', [text('title', 'Heading', '', { max: 80 }), area('text', 'Text', '', { rows: 5, max: 1500 })], [
        { title: 'What we collect', text: 'Only what you enter in the enquiry form or send us by email: your name, organisation, contact details and the details of your requirement.' },
        { title: 'How we use it', text: 'To reply to your enquiry, prepare a proposal, and meet legal and compliance obligations such as identity and sanctions checks. We do not sell your information.' },
        { title: 'Who sees it', text: 'Our staff and the service providers that host our website and email, who are bound to protect it. We may disclose information where the law requires.' },
        { title: 'How long we keep it', text: 'We keep enquiries for as long as needed to respond and to meet our legal and compliance obligations, then delete them.' },
        { title: 'Your rights', text: 'You can ask us to access, correct or delete your information by emailing us.' },
        { title: 'Website use', text: 'Information on this site is general and is not an offer to sell or a binding quotation. Any supply or service is subject to a written agreement. Descriptions of commodities, standards and delivery terms are illustrative; actual terms are agreed per contract.' },
      ], { max: 14, itemLabel: 'title' }),
    ],
  },
];

export function defaultsOf(fields) {
  const o = {};
  for (const f of fields) {
    if (f.t === 'group') o[f.k] = defaultsOf(f.fields);
    else if (f.t === 'list') o[f.k] = JSON.parse(JSON.stringify(f.d || []));
    else o[f.k] = f.d ?? '';
  }
  return o;
}
export const DEFAULTS = Object.fromEntries(PAGES.map(p => [p.id, defaultsOf(p.fields)]));

// Coerce + clamp arbitrary input to the schema. Unknown keys are dropped; wrong types fall back to defaults.
export function sanitize(fields, input, base) {
  const out = {};
  for (const f of fields) {
    const v = input?.[f.k];
    const dflt = base?.[f.k];
    if (f.t === 'group') out[f.k] = sanitize(f.fields, v, dflt);
    else if (f.t === 'list') {
      const arr = Array.isArray(v) ? v : (Array.isArray(dflt) ? dflt : []);
      out[f.k] = arr.slice(0, f.max || 50).map(it => sanitize(f.fields, it, defaultsOf(f.fields)));
    } else if (f.t === 'toggle') out[f.k] = typeof v === 'boolean' ? v : !!dflt;
    else {
      let s = typeof v === 'string' ? v : (typeof dflt === 'string' ? dflt : '');
      s = s.replace(/\r\n/g, '\n').replace(/\u0000/g, '');
      if (f.t !== 'area') s = s.replace(/\s*\n\s*/g, ' ');
      s = s.trim().slice(0, f.max || (f.t === 'area' ? 4000 : 300));
      if (f.t === 'url' && s && !/^https?:\/\/[^\s"'<>]+$/i.test(s)) s = '';
      if (f.t === 'image' && s && !/^[a-z0-9][a-z0-9-]{0,60}$/.test(s)) s = '';
      out[f.k] = s;
    }
  }
  return out;
}
export function sanitizeAll(input, base) {
  return Object.fromEntries(PAGES.map(p => [p.id, sanitize(p.fields, input?.[p.id], base?.[p.id] ?? DEFAULTS[p.id])]));
}
