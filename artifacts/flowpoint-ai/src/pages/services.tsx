import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Filter,
  Home,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users2,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import FlowPointSelect from '@/components/FlowPointSelect';
import NotificationBell from '@/components/NotificationBell';
import { supabase } from '@/lib/supabase';
import type { Contact, Staff } from '@/lib/contactsTypes';
import type { Property } from '@/lib/propertiesTypes';
import type { Unit } from '@/lib/unitsTypes';
import {
  SERVICE_STATUSES,
  serviceStatusLabel,
  type Service,
  type ServiceContactRelationship,
  type ServiceDraft,
  type ServicePropertyRelationship,
  type ServiceStaffRelationship,
  type ServiceUnitRelationship,
} from '@/lib/servicesTypes';
import { ageLabel, requestPriorityLabel, requestStatusLabel, type RequestRecord } from '@/lib/requestsTypes';

const inputClass =
  'w-full h-[39px] rounded-[9px] border border-[#e4e2de] bg-white px-[11px] text-[13px] text-[#151412] outline-none placeholder:text-[#b3b0aa] focus:border-[#151412] focus:ring-2 focus:ring-[#151412]/8 transition-all';
const textAreaClass =
  'w-full rounded-[9px] border border-[#e4e2de] bg-white px-[11px] py-[9px] text-[13px] leading-[1.5] text-[#151412] outline-none placeholder:text-[#b3b0aa] focus:border-[#151412] focus:ring-2 focus:ring-[#151412]/8 transition-all resize-none';

type RelationshipState = {
  contacts: ServiceContactRelationship[];
  staff: ServiceStaffRelationship[];
  properties: ServicePropertyRelationship[];
  units: ServiceUnitRelationship[];
};

function Modal({
  children,
  onClose,
  wide = false,
  extraWide = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  extraWide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#171511]/30 backdrop-blur-[2px]"
      />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        className={`relative max-h-[92vh] w-full overflow-hidden rounded-[16px] border border-[#e4e2de] bg-[#fbfaf8] shadow-[0_24px_80px_rgba(25,22,18,.18)] ${
          extraWide ? 'max-w-[980px]' : wide ? 'max-w-[780px]' : 'max-w-[540px]'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </motion.div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-[5px] block text-[10px] font-semibold uppercase tracking-[.08em] text-[#77736d]">
        {label}
        {hint && <span className="ml-1 normal-case font-normal tracking-normal text-[#aaa59d]">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-[9px] border border-[#f0c8c3] bg-[#fff7f6] px-3 py-2.5 text-[11px] text-[#a33a30]">
      <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
      {message}
    </div>
  );
}

function StatusPill({ status }: { status: string | null | undefined }) {
  const style =
    status === 'active'
      ? 'border-[#d2ead7] bg-[#f2faf3] text-[#327443]'
      : 'border-[#f1dfb8] bg-[#fff7e6] text-[#a36810]';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style}`}>
      {serviceStatusLabel(status)}
    </span>
  );
}

function EmptyState({
  icon: Icon = BriefcaseBusiness,
  title,
  description,
}: {
  icon?: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-[#d9d5ce] bg-[#fbfaf8] px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#f0ede8] text-[#777269]">
        <Icon size={23} strokeWidth={1.5} />
      </div>
      <p className="mt-4 text-[14px] font-semibold text-[#34312c]">{title}</p>
      <p className="mt-1 max-w-[380px] text-[12px] leading-[1.6] text-[#97928a]">{description}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#f0eeeb] py-2 last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#aaa59d]">{label}</span>
      <span className="max-w-[68%] whitespace-pre-wrap text-right text-[12px] text-[#4d4942]">
        {value || 'Not provided'}
      </span>
    </div>
  );
}

function SelectionChips({
  labels,
  onRemove,
}: {
  labels: { id: string; label: string; secondary?: string }[];
  onRemove: (id: string) => void;
}) {
  if (!labels.length) return <p className="mt-2 text-[11px] italic text-[#aaa59d]">None selected yet.</p>;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {labels.map((item) => (
        <span
          key={item.id}
          className="flex items-center gap-1 rounded-full border border-[#e9e6e1] bg-[#faf9f7] px-2 py-1 text-[10px] text-[#5f5a52]"
        >
          {item.label}
          {item.secondary && <span className="text-[#aaa59d]">· {item.secondary}</span>}
          <button type="button" onClick={() => onRemove(item.id)} className="ml-0.5 text-[#aaa59d] hover:text-[#a33a30]">
            <X size={11} />
          </button>
        </span>
      ))}
    </div>
  );
}

function ServiceForm({
  service,
  relationships,
  contacts,
  staff,
  properties,
  units,
  onSave,
  onClose,
}: {
  service: Service | null;
  relationships: RelationshipState;
  contacts: Contact[];
  staff: Staff[];
  properties: Property[];
  units: Unit[];
  onSave: (draft: ServiceDraft, selected: { contactIds: string[]; staffIds: string[]; propertyIds: string[]; unitIds: string[] }) => Promise<void>;
  onClose: () => void;
}) {
  return <GuidedServiceForm service={service} relationships={relationships} contacts={contacts} staff={staff} properties={properties} units={units} onSave={onSave} onClose={onClose} />;
}

const SERVICE_CATEGORIES = ['Maintenance', 'Resident support', 'Leasing', 'Cleaning', 'Security', 'Landscaping', 'Utilities', 'Amenities', 'Other'];
const SERVICE_STEPS = [
  { title: 'Identity', caption: 'Name and describe the service' },
  { title: 'Delivery', caption: 'Set expectations and guidance' },
  { title: 'Coverage', caption: 'Assign people and places' },
  { title: 'Review', caption: 'Confirm before saving' },
];

function categoryGuidance(category: string) {
  const value = category.toLowerCase();
  const general = {
    short: 'A concise summary for the service catalog',
    description: 'What the service provides, who it serves, and when the team delivers it.',
    availabilityLabel: 'Availability / eligibility',
    availability: 'Who can request this service and when it is available',
    responseLabel: 'Typical response time',
    response: 'e.g. Within one business day',
    requirementsLabel: 'Requirements / eligibility',
    requirements: 'Information or access needed before the service can be delivered',
    includedLabel: 'What is included',
    included: 'Work, support, or deliverables covered by this service',
    excludedLabel: 'What is not included',
    excluded: 'Boundaries, exceptions, and work handled separately',
    escalationLabel: 'Escalation instructions',
    escalation: 'When to escalate, and who should take over',
  };

  if (value.includes('maint') || value.includes('repair')) return {
    ...general,
    short: 'e.g. Routine and urgent repairs for resident spaces',
    description: 'What work is covered, how requests are assessed, and what happens after intake.',
    availabilityLabel: 'Service hours & coverage',
    availability: 'Emergency vs. routine hours, eligible properties, and access requirements',
    responseLabel: 'Response target',
    response: 'e.g. Emergency calls acknowledged within 15 minutes',
    requirementsLabel: 'Intake requirements',
    requirements: 'Access details, photos, or resident availability needed before dispatch',
    includedLabel: 'Repair work covered',
    included: 'Diagnostics, labor, materials, and follow-up included in the service',
    excludedLabel: 'Out-of-scope work',
    escalationLabel: 'Urgent / escalation path',
  };
  if (value.includes('clean')) return {
    ...general,
    short: 'e.g. Scheduled common-area cleaning and turnover support',
    description: 'Areas covered, visit cadence, and the standard the team should maintain.',
    availabilityLabel: 'Visit schedule & access',
    availability: 'Service days, access windows, and spaces included',
    responseLabel: 'Scheduling lead time',
    response: 'e.g. Schedule confirmed within one business day',
    requirementsLabel: 'Site access & preparation',
    requirements: 'Access arrangements or preparation needed before a visit',
    includedLabel: 'Tasks included',
    included: 'Rooms, surfaces, supplies, and tasks included in each visit',
    excludedLabel: 'Out-of-scope tasks',
    escalationLabel: 'Missed-visit / issue escalation',
  };
  if (value.includes('leasing') || value.includes('resident')) return {
    ...general,
    short: 'e.g. Guided move-in support for new residents',
    description: 'Who this supports and the key moments where the team steps in.',
    availabilityLabel: 'Eligibility & service hours',
    availability: 'Eligibility, office hours, and channels residents can use',
    responseLabel: 'Reply target',
    response: 'e.g. Resident enquiries answered by the next business day',
    requirementsLabel: 'Resident information required',
    requirements: 'Documents or information a resident should have ready',
    includedLabel: 'Support provided',
    included: 'Support, coordination, and materials residents can expect',
    excludedLabel: 'Support boundaries',
  };
  if (value.includes('security') || value.includes('access')) return {
    ...general,
    short: 'e.g. After-hours building access and incident response',
    description: 'The situations covered, how requests are verified, and how the team responds.',
    availabilityLabel: 'Coverage hours & access',
    availability: 'Coverage hours, properties served, and urgent contact path',
    responseLabel: 'Incident response target',
    response: 'e.g. Urgent incidents routed to the on-call team immediately',
    requirementsLabel: 'Verification information',
    requirements: 'Identity, location, and incident details to collect before action',
    includedLabel: 'Coverage included',
    included: 'Monitoring, access coordination, and response actions within scope',
    excludedLabel: 'Out-of-scope incidents',
    escalationLabel: 'Emergency escalation path',
  };
  if (value.includes('landscap') || value.includes('grounds')) return {
    ...general,
    short: 'e.g. Seasonal grounds care and shared outdoor-area upkeep',
    description: 'Outdoor areas covered, visit rhythm, and expected service standard.',
    availabilityLabel: 'Schedule & seasonal coverage',
    availability: 'Seasonal schedule, weather constraints, and covered properties',
    responseLabel: 'Work request target',
    response: 'e.g. Routine requests scheduled within three business days',
    requirementsLabel: 'Site access / work details',
    requirements: 'Access notes, priority areas, or photos to include with a request',
    includedLabel: 'Maintenance tasks',
    included: 'Grounds, routine visits, and seasonal tasks included',
    excludedLabel: 'Out-of-scope work',
    escalationLabel: 'Hazard / issue escalation',
  };
  if (value.includes('utilit') || value.includes('energy')) return {
    ...general,
    short: 'e.g. Utility account coordination for managed buildings',
    description: 'Which utilities are supported and how the team handles coordination.',
    availabilityLabel: 'Coverage & account types',
    availability: 'Covered properties, account types, and support hours',
    responseLabel: 'Resolution target',
    response: 'e.g. Account enquiries acknowledged within one business day',
    requirementsLabel: 'Account information',
    requirements: 'Account reference, meter details, or authorization to have ready',
    includedLabel: 'Coordination included',
    included: 'Coordination, account guidance, and issue follow-up included',
    excludedLabel: 'Out-of-scope support',
    escalationLabel: 'Utility disruption escalation',
  };
  if (value.includes('amenit') || value.includes('facility')) return {
    ...general,
    short: 'e.g. Shared amenity reservations and access support',
    description: 'Spaces supported, how access works, and what a resident can expect.',
    availabilityLabel: 'Reservation windows & eligibility',
    availability: 'Reservation windows, access hours, and eligible residents',
    responseLabel: 'Booking confirmation target',
    response: 'e.g. Booking requests confirmed within one business day',
    requirementsLabel: 'Reservation information',
    requirements: 'Reservation details, guest count, or access needs to provide',
    includedLabel: 'Support included',
    included: 'Booking coordination, access support, and standard reset included',
    excludedLabel: 'Excluded amenities',
    escalationLabel: 'Access / incident escalation',
  };
  return general;
}

function GuidedServiceForm({
  service,
  relationships,
  contacts,
  staff,
  properties,
  units,
  onSave,
  onClose,
}: {
  service: Service | null;
  relationships: RelationshipState;
  contacts: Contact[];
  staff: Staff[];
  properties: Property[];
  units: Unit[];
  onSave: (draft: ServiceDraft, selected: { contactIds: string[]; staffIds: string[]; propertyIds: string[]; unitIds: string[] }) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ServiceDraft>(() => ({
    name: service?.name ?? '',
    category: service?.category ?? '',
    short_description: service?.short_description ?? '',
    description: service?.description ?? '',
    customer_facing_description: service?.customer_facing_description ?? '',
    requirements: service?.requirements ?? '',
    included_details: service?.included_details ?? '',
    excluded_details: service?.excluded_details ?? '',
    pricing_information: service?.pricing_information ?? '',
    availability_information: service?.availability_information ?? '',
    typical_response_time: service?.typical_response_time ?? '',
    internal_instructions: service?.internal_instructions ?? '',
    escalation_instructions: service?.escalation_instructions ?? '',
    status: service?.status ?? 'active',
  }));
  const [contactIds, setContactIds] = useState(() => relationships.contacts.filter((item) => item.service_id === service?.id).map((item) => String(item.contact_id)));
  const [staffIds, setStaffIds] = useState(() => relationships.staff.filter((item) => item.service_id === service?.id).map((item) => String(item.staff_id)));
  const [propertyIds, setPropertyIds] = useState(() => relationships.properties.filter((item) => item.service_id === service?.id).map((item) => item.property_id));
  const [unitIds, setUnitIds] = useState(() => relationships.units.filter((item) => item.service_id === service?.id).map((item) => item.unit_id));
  const [contactToAdd, setContactToAdd] = useState('');
  const [staffToAdd, setStaffToAdd] = useState('');
  const [propertyToAdd, setPropertyToAdd] = useState('');
  const [unitToAdd, setUnitToAdd] = useState('');
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const guidance = categoryGuidance(form.category);
  const set = <K extends keyof ServiceDraft>(key: K, value: ServiceDraft[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };
  const contactOptions = contacts.filter((item) => !contactIds.includes(String(item.id)));
  const staffOptions = staff.filter((item) => !staffIds.includes(String(item.id)));
  const propertyOptions = properties.filter((item) => !propertyIds.includes(item.id));
  const unitOptions = units.filter((item) => !unitIds.includes(item.id));
  const requestClose = () => {
    if (!saving) onClose();
  };

  const continueStep = () => {
    if (step === 0) {
      const nextErrors: Record<string, string> = {};
      if (!form.name.trim()) nextErrors.name = 'Enter a service name to continue.';
      if (!form.category.trim()) nextErrors.category = 'Choose or enter a category to continue.';
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) return;
    }
    setSaveError('');
    setStep((current) => Math.min(current + 1, SERVICE_STEPS.length - 1));
  };
  const submit = async () => {
    if (!form.name.trim() || !form.category.trim()) {
      setStep(0);
      setErrors({
        ...(!form.name.trim() ? { name: 'Enter a service name to continue.' } : {}),
        ...(!form.category.trim() ? { category: 'Choose or enter a category to continue.' } : {}),
      });
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        category: form.category.trim(),
        short_description: form.short_description?.trim() || null,
        description: form.description?.trim() || null,
        customer_facing_description: form.customer_facing_description?.trim() || null,
        requirements: form.requirements?.trim() || null,
        included_details: form.included_details?.trim() || null,
        excluded_details: form.excluded_details?.trim() || null,
        pricing_information: form.pricing_information?.trim() || null,
        availability_information: form.availability_information?.trim() || null,
        typical_response_time: form.typical_response_time?.trim() || null,
        internal_instructions: form.internal_instructions?.trim() || null,
        escalation_instructions: form.escalation_instructions?.trim() || null,
      }, { contactIds, staffIds, propertyIds, unitIds });
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save service. Try again.');
      setSaving(false);
    }
  };

  const assignmentGroup = (
    title: string,
    caption: string,
    value: string,
    setValue: (value: string) => void,
    options: { value: string; label: string; secondary?: string }[],
    selectedIds: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
    resolveLabel: (id: string) => { id: string; label: string; secondary?: string },
    testId: string,
  ) => (
    <section className="rounded-[12px] border border-[#e9e6e1] bg-white p-4" key={testId}>
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-[12px] font-semibold text-[#34312c]">{title}</h3><p className="mt-1 text-[10px] text-[#969188]">{caption}</p></div>
        <span className="rounded-full bg-[#f5f3ef] px-2 py-1 font-mono text-[10px] text-[#726d64]">{selectedIds.length}</span>
      </div>
      <div className="mt-3 flex gap-2">
        <div className="min-w-0 flex-1"><FlowPointSelect testId={`select-${testId}`} value={value} onChange={setValue} placeholder={`Select ${title.toLowerCase()}`} options={options} emptyLabel={`No unassigned ${title.toLowerCase()}`} /></div>
        <button data-testid={`button-add-${testId}`} type="button" onClick={() => { if (value) { setSelected((current) => [...current, value]); setValue(''); } }} disabled={!value} className="flex h-[39px] shrink-0 items-center gap-1 rounded-[9px] border border-[#e4e2de] px-3 text-[11px] font-semibold text-[#625e57] hover:bg-[#f4f2ef] disabled:opacity-40"><Plus size={12} />Add</button>
      </div>
      <SelectionChips labels={selectedIds.map(resolveLabel)} onRemove={(id) => setSelected((current) => current.filter((item) => item !== id))} />
    </section>
  );

  return (
    <Modal onClose={requestClose} wide>
      <div className="flex items-start justify-between border-b border-[#ebe8e3] px-5 py-4 sm:px-7">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#a16a52]">Service setup</p>
          <h2 className="mt-1 text-[16px] font-semibold tracking-[-.02em] text-[#201e1a]">{service ? 'Edit service' : 'Add a service'}</h2>
          <p className="mt-1 max-w-[580px] text-[11px] leading-5 text-[#89847c]">Build a dependable operating record for your team and FlowPoint AI.</p>
        </div>
        <button type="button" aria-label="Close service setup" data-testid="button-close-service-form" onClick={requestClose} disabled={saving} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e4e2de] text-[#817d76] hover:bg-[#f0eeea] disabled:opacity-50"><X size={14} /></button>
      </div>
      <div className="border-b border-[#ebe8e3] bg-[#f7f5f1] px-5 py-4 sm:px-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold text-[#46423b]">Step {step + 1} <span className="font-normal text-[#969188]">of {SERVICE_STEPS.length}</span></p>
          <p className="text-right text-[10px] text-[#89847c]">{SERVICE_STEPS[step].caption}</p>
        </div>
        <div className="grid grid-cols-4 gap-2" role="list" aria-label="Service setup progress">
          {SERVICE_STEPS.map((item, index) => (
            <div key={item.title} role="listitem" aria-current={step === index ? 'step' : undefined}>
              <div className={`h-[3px] rounded-full ${index <= step ? 'bg-[#a96d53]' : 'bg-[#dfdcd5]'}`} />
              <p className={`mt-2 text-[9px] font-semibold uppercase tracking-[.08em] ${index === step ? 'text-[#8f563e]' : index < step ? 'text-[#68645c]' : 'text-[#a8a39b]'}`}>{item.title}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="max-h-[calc(92vh-230px)] min-h-[340px] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.16 }}>
            {step === 0 && <div>
              <div className="mb-5"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#a16a52]">01 · Service identity</p><h3 className="mt-1 text-[19px] font-semibold tracking-[-.03em] text-[#25221e]">What does your team provide?</h3><p className="mt-1 text-[11px] leading-5 text-[#89847c]">Start with the details staff will use to recognize and route this service.</p></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Field label="Service name"><input data-testid="input-service-name" autoFocus className={`${inputClass} ${errors.name ? 'border-[#bd5b4f]' : ''}`} value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Resident move-in support" aria-invalid={Boolean(errors.name)} />{errors.name && <p className="mt-1.5 text-[11px] text-[#a33a30]">{errors.name}</p>}</Field></div>
                <Field label="Category"><input data-testid="input-service-category" list="service-category-options" className={`${inputClass} ${errors.category ? 'border-[#bd5b4f]' : ''}`} value={form.category} onChange={(event) => set('category', event.target.value)} placeholder="Choose or enter a category" aria-invalid={Boolean(errors.category)} /><datalist id="service-category-options">{SERVICE_CATEGORIES.map((item) => <option key={item} value={item} />)}</datalist>{errors.category && <p className="mt-1.5 text-[11px] text-[#a33a30]">{errors.category}</p>}</Field>
                <Field label="Catalog status"><FlowPointSelect value={form.status} onChange={(value) => set('status', value as ServiceDraft['status'])} placeholder="Select status" options={SERVICE_STATUSES.map((item) => ({ ...item }))} /></Field>
                <div className="sm:col-span-2"><Field label="Short description" hint="Shown in the catalog"><input data-testid="input-service-short-description" className={inputClass} value={form.short_description ?? ''} onChange={(event) => set('short_description', event.target.value)} placeholder={guidance.short} /></Field></div>
                <div className="sm:col-span-2"><Field label="Detailed description" hint="Optional"><textarea data-testid="input-service-description" className={textAreaClass} rows={3} value={form.description ?? ''} onChange={(event) => set('description', event.target.value)} placeholder={guidance.description} /></Field></div>
              </div>
            </div>}
            {step === 1 && <div>
              <div className="mb-5"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#a16a52]">02 · Service delivery</p><h3 className="mt-1 text-[19px] font-semibold tracking-[-.03em] text-[#25221e]">Make the process clear</h3><p className="mt-1 text-[11px] leading-5 text-[#89847c]">Capture the information people and the assistant need to set expectations and complete the work.</p></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 rounded-[11px] border border-[#eadbd1] bg-[#fbf5f0] p-3.5"><Field label="Customer-facing description" hint="Optional"><textarea data-testid="input-service-customer-description" className={`${textAreaClass} border-[#eadbd1]`} rows={3} value={form.customer_facing_description ?? ''} onChange={(event) => set('customer_facing_description', event.target.value)} placeholder="A clear explanation residents can understand" /></Field></div>
                <Field label={guidance.availabilityLabel} hint="Optional"><textarea data-testid="input-service-availability" className={textAreaClass} rows={3} value={form.availability_information ?? ''} onChange={(event) => set('availability_information', event.target.value)} placeholder={guidance.availability} /></Field>
                <Field label={guidance.responseLabel} hint="Optional"><input data-testid="input-service-response-time" className={inputClass} value={form.typical_response_time ?? ''} onChange={(event) => set('typical_response_time', event.target.value)} placeholder={guidance.response} /></Field>
                <Field label={guidance.requirementsLabel} hint="Optional"><textarea data-testid="input-service-requirements" className={textAreaClass} rows={3} value={form.requirements ?? ''} onChange={(event) => set('requirements', event.target.value)} placeholder={guidance.requirements} /></Field>
                <Field label={guidance.includedLabel} hint="Optional"><textarea data-testid="input-service-included" className={textAreaClass} rows={3} value={form.included_details ?? ''} onChange={(event) => set('included_details', event.target.value)} placeholder={guidance.included} /></Field>
                <Field label={guidance.excludedLabel} hint="Optional"><textarea data-testid="input-service-excluded" className={textAreaClass} rows={3} value={form.excluded_details ?? ''} onChange={(event) => set('excluded_details', event.target.value)} placeholder={guidance.excluded} /></Field>
                <Field label="Pricing / fee information" hint="Optional"><textarea data-testid="input-service-pricing" className={textAreaClass} rows={3} value={form.pricing_information ?? ''} onChange={(event) => set('pricing_information', event.target.value)} placeholder="Fees, billing basis, or leave blank if not applicable" /></Field>
                <Field label="Internal instructions" hint="Optional · team only"><textarea data-testid="input-service-instructions" className={textAreaClass} rows={4} value={form.internal_instructions ?? ''} onChange={(event) => set('internal_instructions', event.target.value)} placeholder="Steps the team should follow to deliver this service" /></Field>
                <Field label={guidance.escalationLabel} hint="Optional · team only"><textarea data-testid="input-service-escalation" className={textAreaClass} rows={4} value={form.escalation_instructions ?? ''} onChange={(event) => set('escalation_instructions', event.target.value)} placeholder={guidance.escalation} /></Field>
              </div>
            </div>}
            {step === 2 && <div>
              <div className="mb-5"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#a16a52]">03 · Coverage and assignments</p><h3 className="mt-1 text-[19px] font-semibold tracking-[-.03em] text-[#25221e]">Who and where does it apply?</h3><p className="mt-1 text-[11px] leading-5 text-[#89847c]">Assignments help your team see where the service is available. Every association is optional.</p></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {assignmentGroup('Staff', 'Team members responsible for delivery', staffToAdd, setStaffToAdd, staffOptions.map((item) => ({ value: String(item.id), label: item.name, secondary: [item.role, item.department].filter(Boolean).join(' · ') })), staffIds, setStaffIds, (id) => { const item = staff.find((candidate) => String(candidate.id) === id); return { id, label: item?.name ?? 'Staff unavailable', secondary: item?.role ?? undefined }; }, 'service-staff')}
                {assignmentGroup('Contacts', 'Residents or customers linked to the service', contactToAdd, setContactToAdd, contactOptions.map((item) => ({ value: String(item.id), label: item.name, secondary: item.customer_id ?? item.contact_type ?? undefined })), contactIds, setContactIds, (id) => { const item = contacts.find((candidate) => String(candidate.id) === id); return { id, label: item?.name ?? 'Contact unavailable', secondary: item?.customer_id ?? undefined }; }, 'service-contacts')}
                {assignmentGroup('Properties', 'Buildings where this service is offered', propertyToAdd, setPropertyToAdd, propertyOptions.map((item) => ({ value: item.id, label: item.name, secondary: [item.city, item.address_line1].filter(Boolean).join(' · ') })), propertyIds, setPropertyIds, (id) => { const item = properties.find((candidate) => candidate.id === id); return { id, label: item?.name ?? 'Property unavailable' }; }, 'service-properties')}
                {assignmentGroup('Units', 'Specific units covered by this service', unitToAdd, setUnitToAdd, unitOptions.map((item) => ({ value: item.id, label: item.unit_number, secondary: properties.find((property) => property.id === item.property_id)?.name })), unitIds, setUnitIds, (id) => { const item = units.find((candidate) => candidate.id === id); return { id, label: item?.unit_number ?? 'Unit unavailable', secondary: item ? properties.find((property) => property.id === item.property_id)?.name ?? undefined : undefined }; }, 'service-units')}
              </div>
            </div>}
            {step === 3 && <div>
              <div className="mb-5"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#a16a52]">04 · Final review</p><h3 className="mt-1 text-[19px] font-semibold tracking-[-.03em] text-[#25221e]">Ready to add to the catalog</h3><p className="mt-1 text-[11px] leading-5 text-[#89847c]">Check the essentials and assignments. You can go back to make changes before saving.</p></div>
              <div className="overflow-hidden rounded-[13px] border border-[#e9e6e1] bg-white">
                <div className="flex items-start justify-between gap-4 border-b border-[#f0eeeb] bg-[#fbfaf8] p-4">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="text-[15px] font-semibold text-[#25221e]">{form.name.trim() || 'Untitled service'}</h4><StatusPill status={form.status} /></div><p className="mt-1 text-[10px] font-semibold uppercase tracking-[.08em] text-[#a16a52]">{form.category || 'No category'}</p><p className="mt-2 text-[11px] leading-5 text-[#77736d]">{form.short_description || form.description || 'No catalog description provided.'}</p></div>
                  <button type="button" data-testid="button-edit-service-identity" onClick={() => setStep(0)} className="shrink-0 text-[10px] font-semibold text-[#965d45] hover:underline">Edit</button>
                </div>
                <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                  <div className="border-b border-[#f0eeeb] p-4 sm:border-r"><div className="flex items-center justify-between gap-3"><h4 className="text-[11px] font-semibold text-[#403c35]">Delivery details</h4><button type="button" data-testid="button-edit-service-delivery" onClick={() => setStep(1)} className="text-[10px] font-semibold text-[#965d45] hover:underline">Edit</button></div><Detail label="Detailed description" value={form.description} /><Detail label="Customer-facing description" value={form.customer_facing_description} /><Detail label={guidance.availabilityLabel} value={form.availability_information} /><Detail label={guidance.responseLabel} value={form.typical_response_time} /><Detail label={guidance.requirementsLabel} value={form.requirements} /><Detail label={guidance.includedLabel} value={form.included_details} /><Detail label={guidance.excludedLabel} value={form.excluded_details} /><Detail label="Pricing" value={form.pricing_information} /><Detail label="Team guidance" value={form.internal_instructions} /><Detail label={guidance.escalationLabel} value={form.escalation_instructions} /></div>
                  <div className="p-4"><div className="flex items-center justify-between gap-3"><h4 className="text-[11px] font-semibold text-[#403c35]">Assignments</h4><button type="button" data-testid="button-edit-service-coverage" onClick={() => setStep(2)} className="text-[10px] font-semibold text-[#965d45] hover:underline">Edit</button></div>
                    <Detail label="Staff" value={staffIds.map((id) => staff.find((item) => String(item.id) === id)?.name ?? 'Unavailable staff').join(', ')} />
                    <Detail label="Contacts" value={contactIds.map((id) => contacts.find((item) => String(item.id) === id)?.name ?? 'Unavailable contact').join(', ')} />
                    <Detail label="Properties" value={propertyIds.map((id) => properties.find((item) => item.id === id)?.name ?? 'Unavailable property').join(', ')} />
                    <Detail label="Units" value={unitIds.map((id) => { const unit = units.find((item) => item.id === id); return unit ? `${unit.unit_number}${properties.find((property) => property.id === unit.property_id)?.name ? ` · ${properties.find((property) => property.id === unit.property_id)?.name}` : ''}` : 'Unavailable unit'; }).join(', ')} />
                    {!staffIds.length && !contactIds.length && !propertyIds.length && !unitIds.length && <p className="mt-3 rounded-[8px] bg-[#f7f5f1] px-3 py-2 text-[10px] text-[#89847c]">No assignments added. You can assign these later.</p>}
                  </div>
                </div>
              </div>
              {saveError && <div className="mt-4"><InlineError message={saveError} /></div>}
            </div>}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[#ebe8e3] bg-[#fbfaf8] px-5 py-4 sm:px-7">
        <button type="button" data-testid="button-service-back" onClick={() => { setSaveError(''); setStep((current) => Math.max(current - 1, 0)); }} disabled={step === 0 || saving} className="flex h-9 items-center gap-2 rounded-[9px] border border-[#e4e2de] px-3 text-[11px] font-semibold text-[#625e57] hover:bg-[#f0eeea] disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft size={13} />Back</button>
        <div className="flex items-center gap-2">
          <button type="button" data-testid="button-service-cancel" onClick={onClose} disabled={saving} className="hidden h-9 rounded-[9px] px-3 text-[11px] font-medium text-[#77736d] hover:bg-[#f0eeea] disabled:opacity-50 sm:block">Cancel</button>
          {step < SERVICE_STEPS.length - 1
            ? <button type="button" data-testid="button-service-continue" onClick={continueStep} className="flex h-9 items-center gap-2 rounded-[9px] bg-[#a96d53] px-4 text-[11px] font-semibold text-white shadow-[0_2px_5px_rgba(66,43,31,.12)] hover:bg-[#925a43]">Continue<ChevronRight size={13} /></button>
            : <button type="button" data-testid="button-save-service" onClick={submit} disabled={saving} className="flex h-9 items-center gap-2 rounded-[9px] bg-[#a96d53] px-4 text-[11px] font-semibold text-white shadow-[0_2px_5px_rgba(66,43,31,.12)] hover:bg-[#925a43] disabled:opacity-50">{saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}{saving ? 'Saving service' : service ? 'Save changes' : 'Add service'}</button>}
        </div>
      </div>
    </Modal>
  );
}

function ServiceCard({
  service,
  relationships,
  onOpen,
}: {
  service: Service;
  relationships: RelationshipState;
  onOpen: () => void;
}) {
  const contacts = relationships.contacts.filter((item) => item.service_id === service.id);
  const staff = relationships.staff.filter((item) => item.service_id === service.id);
  const properties = relationships.properties.filter((item) => item.service_id === service.id);
  const units = relationships.units.filter((item) => item.service_id === service.id);
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onOpen}
      className="group w-full rounded-[13px] border border-[#e9e6e1] bg-white p-4 text-left transition-all hover:-translate-y-[1px] hover:border-[#d2cec7] hover:shadow-[0_6px_22px_rgba(31,28,23,.06)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-[#f1eee9] text-[#706b62]"><BriefcaseBusiness size={17} strokeWidth={1.7} /></div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[#171512]">{service.name}</p>
            <p className="mt-1 truncate text-[11px] text-[#97928a]">{service.category}</p>
          </div>
        </div>
        <StatusPill status={service.status} />
      </div>
      <p className="mt-3 line-clamp-2 min-h-[34px] text-[11px] leading-[1.55] text-[#77736d]">{service.short_description || service.description || 'No description has been documented yet.'}</p>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#f0eeeb] pt-3 text-[10px] text-[#8e8981]">
        <span className="flex items-center gap-1"><Users2 size={11} />{contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}</span>
        <span className="flex items-center gap-1"><Building2 size={11} />{properties.length} {properties.length === 1 ? 'property' : 'properties'}</span>
        <span className="flex items-center gap-1"><Home size={11} />{units.length} {units.length === 1 ? 'unit' : 'units'}</span>
        <span className="flex items-center gap-1"><UserRound size={11} />{staff.length} assigned</span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[#f0eeeb] pt-3 text-[10px] text-[#aaa59d]">
        <span className="flex items-center gap-1"><Clock3 size={10} />Updated {new Date(service.updated_at).toLocaleDateString()}</span>
        <ChevronRight size={14} className="text-[#bbb6ae] transition-transform group-hover:translate-x-0.5" />
      </div>
    </motion.button>
  );
}

function ServiceProfile({
  service,
  relationships,
  onClose,
  onEdit,
  onDelete,
}: {
  service: Service;
  relationships: RelationshipState;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [tab, setTab] = useState<'overview' | 'people' | 'places' | 'team' | 'instructions' | 'activity'>('overview');
  const [issues, setIssues] = useState<RequestRecord[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const contacts = relationships.contacts.filter((item) => item.service_id === service.id);
  const staff = relationships.staff.filter((item) => item.service_id === service.id);
  const properties = relationships.properties.filter((item) => item.service_id === service.id);
  const units = relationships.units.filter((item) => item.service_id === service.id);
  useEffect(() => {
    if (tab !== 'activity') return;
    let active = true;
    setIssuesLoading(true);
    supabase.from('requests').select('*').eq('service_id', service.id).order('updated_at', { ascending: false })
      .then(({ data }) => { if (active) { setIssues((data as RequestRecord[]) ?? []); setIssuesLoading(false); } });
    return () => { active = false; };
  }, [tab, service.id]);
  const tabs = [
    ['overview', 'Overview'],
    ['people', 'People'],
    ['places', 'Properties / Units'],
    ['team', 'Team'],
    ['instructions', 'Instructions'],
    ['activity', 'Activity'],
  ] as const;
  return (
    <Modal onClose={onClose} extraWide>
      <div className="flex items-start justify-between border-b border-[#ebe8e3] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] bg-[#f1eee9] text-[#706b62]"><BriefcaseBusiness size={20} /></div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><p className="truncate text-[16px] font-semibold text-[#151412]">{service.name}</p><StatusPill status={service.status} /></div>
            <p className="mt-1 text-[11px] text-[#8b877f]">{service.category} · Updated {new Date(service.updated_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#e4e2de] px-2.5 text-[11px] font-medium text-[#625e57] hover:bg-[#f0eeea]"><Pencil size={12} />Edit</button>
          <button onClick={onDelete} className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#f0c8c3] px-2.5 text-[11px] font-medium text-[#a33a30] hover:bg-[#fff7f6]"><Trash2 size={12} />Delete</button>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e4e2de] text-[#817d76] hover:bg-[#f0eeea]"><X size={14} /></button>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-[#ebe8e3] px-5 pt-2">{tabs.map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`whitespace-nowrap border-b-2 px-2 pb-2.5 text-[11px] font-semibold transition-colors ${tab === value ? 'border-[#151412] text-[#151412]' : 'border-transparent text-[#9a958d] hover:text-[#4d4942]'}`}>{label}</button>)}</div>
      <div className="max-h-[calc(92vh-138px)] overflow-y-auto px-5 py-5">
        {tab === 'overview' && <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div className="rounded-[11px] border border-[#e9e6e1] bg-white p-4"><p className="mb-3 text-[12px] font-semibold text-[#35322e]">Service details</p><Detail label="Category" value={service.category} /><Detail label="Status" value={serviceStatusLabel(service.status)} /><Detail label="Short description" value={service.short_description} /><Detail label="Detailed description" value={service.description} /></div><div className="rounded-[11px] border border-[#e9e6e1] bg-white p-4"><p className="mb-3 text-[12px] font-semibold text-[#35322e]">Customer-facing information</p><Detail label="Description" value={service.customer_facing_description} /><Detail label="Requirements" value={service.requirements} /><Detail label="Included" value={service.included_details} /><Detail label="Not included" value={service.excluded_details} /><Detail label="Pricing" value={service.pricing_information} /></div></div>}
        {tab === 'people' && <div className="space-y-2">{contacts.length ? contacts.map((item) => <div key={String(item.id)} className="flex items-center justify-between rounded-[11px] border border-[#e9e6e1] bg-white p-3"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ece8e1] text-[#706b62]"><UserRound size={15} /></div><div><p className="text-[12px] font-semibold text-[#35322e]">{item.contact?.name ?? 'Contact unavailable'}</p><p className="mt-1 text-[10px] text-[#8e8981]">{item.contact?.contact_type ?? 'Contact'} · {item.contact?.customer_id ?? 'Customer ID unavailable'}</p></div></div><span className="text-[10px] text-[#aaa59d]">{item.relationship_status ?? 'Active relationship'}</span></div>) : <EmptyState icon={Users2} title="No contacts use this service yet" description="Add contacts from the service editor when this offering is assigned." />}</div>}
        {tab === 'places' && <div className="space-y-4"><div><p className="mb-2 text-[12px] font-semibold text-[#35322e]">Properties</p>{properties.length ? <div className="grid grid-cols-1 gap-2 md:grid-cols-2">{properties.map((item) => <div key={String(item.id)} className="rounded-[11px] border border-[#e9e6e1] bg-white p-3"><p className="text-[12px] font-semibold text-[#35322e]">{item.property?.name ?? 'Property unavailable'}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-[#8e8981]"><MapPin size={10} />{[item.property?.city, item.property?.address_line1].filter(Boolean).join(' · ') || 'Address unavailable'}</p></div>)}</div> : <p className="rounded-[10px] border border-dashed border-[#d9d5ce] px-4 py-6 text-center text-[11px] text-[#97928a]">No properties associated.</p>}</div><div><p className="mb-2 text-[12px] font-semibold text-[#35322e]">Units</p>{units.length ? <div className="grid grid-cols-1 gap-2 md:grid-cols-2">{units.map((item) => <div key={String(item.id)} className="rounded-[11px] border border-[#e9e6e1] bg-white p-3"><p className="text-[12px] font-semibold text-[#35322e]">Unit {item.unit?.unit_number ?? 'Unavailable'}</p><p className="mt-1 text-[10px] text-[#8e8981]">{item.unit?.property?.name ?? 'Property unavailable'}</p></div>)}</div> : <p className="rounded-[10px] border border-dashed border-[#d9d5ce] px-4 py-6 text-center text-[11px] text-[#97928a]">No units associated.</p>}</div></div>}
        {tab === 'team' && <div className="space-y-2">{staff.length ? staff.map((item) => <div key={String(item.id)} className="flex items-center justify-between rounded-[11px] border border-[#e9e6e1] bg-white p-3"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ece8e1] text-[#706b62]"><Users2 size={15} /></div><div><p className="text-[12px] font-semibold text-[#35322e]">{item.staff?.name ?? 'Staff unavailable'}</p><p className="mt-1 text-[10px] text-[#8e8981]">{item.staff?.role ?? 'Role not set'}{item.staff?.department ? ` · ${item.staff.department}` : ''}</p></div></div><span className="text-[10px] text-[#aaa59d]">{item.assignment_role ?? 'Responsible team member'}</span></div>) : <EmptyState icon={Users2} title="No staff assigned yet" description="Assign responsible staff members from the service editor." />}</div>}
        {tab === 'instructions' && <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div className="rounded-[11px] border border-[#e9e6e1] bg-white p-4"><p className="mb-3 text-[12px] font-semibold text-[#35322e]">Operations</p><Detail label="Availability / eligibility" value={service.availability_information} /><Detail label="Typical response time" value={service.typical_response_time} /><Detail label="Internal instructions" value={service.internal_instructions} /></div><div className="rounded-[11px] border border-[#e9e6e1] bg-white p-4"><p className="mb-3 text-[12px] font-semibold text-[#35322e]">Escalation</p><Detail label="Requirements" value={service.requirements} /><Detail label="Escalation instructions" value={service.escalation_instructions} /></div></div>}
         {tab === 'activity' && <div className="rounded-[11px] border border-[#e9e6e1] bg-white p-4"><div className="mb-4 flex items-center justify-between"><div><p className="text-[12px] font-semibold text-[#35322e]">Related requests / issues</p><p className="mt-1 text-[11px] text-[#9b968d]">Requests connected to this service.</p></div><Clock3 size={16} className="text-[#aaa59d]" /></div>{issuesLoading ? <p className="text-[11px] text-[#9b968d]">Loading requests…</p> : issues.length === 0 ? <p className="rounded-[10px] border border-dashed border-[#d9d5ce] px-4 py-8 text-center text-[11px] text-[#97928a]">No requests linked to this service.</p> : <div className="space-y-2">{issues.map((issue) => <div key={issue.id} className="rounded-[10px] border border-[#f0eeeb] p-3"><div className="flex items-start justify-between gap-3"><p className="truncate text-[12px] font-semibold text-[#35322e]">{issue.title}</p><div className="flex gap-1.5"><span className="rounded-full border border-[#e3dfd9] bg-[#f5f3f0] px-2 py-0.5 text-[10px] font-semibold text-[#77736d]">{requestStatusLabel(issue.status)}</span><span className="rounded-full border border-[#e3dfd9] bg-[#f5f3f0] px-2 py-0.5 text-[10px] font-semibold text-[#77736d]">{requestPriorityLabel(issue.priority)}</span></div></div><p className="mt-1 text-[10px] text-[#9b968d]">{ageLabel(issue.created_at, issue.closed_at)}</p></div>)}</div>}</div>}
      </div>
    </Modal>
  );
}

function ConfirmDelete({ name, deleting, onCancel, onConfirm }: { name: string; deleting: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={deleting ? undefined : onCancel} className="absolute inset-0 bg-[#171511]/30 backdrop-blur-[2px]" /><motion.div initial={{ opacity: 0, y: 8, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="relative w-full max-w-[380px] rounded-[16px] border border-[#e4e2de] bg-[#fbfaf8] p-6 text-center shadow-[0_24px_80px_rgba(25,22,18,.18)]"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#f0cbc6] bg-[#fff3f1] text-[#b33d32]"><Trash2 size={17} /></div><h2 className="mt-4 text-[15px] font-semibold text-[#24211e]">Delete {name}?</h2><p className="mt-1 text-[12px] leading-[1.5] text-[#8f8980]">This removes the service and its relational assignments. This action cannot be undone.</p><div className="mt-5 flex gap-2"><button onClick={onCancel} disabled={deleting} className="h-9 flex-1 rounded-[9px] border border-[#e4e2de] text-[12px] font-medium text-[#625e57] hover:bg-[#f0eeea] disabled:opacity-50">Cancel</button><button onClick={onConfirm} disabled={deleting} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-[9px] bg-[#b33d32] text-[12px] font-semibold text-white hover:bg-[#96342b] disabled:opacity-50">{deleting && <Loader2 size={13} className="animate-spin" />}Delete</button></div></motion.div></div>;
}

async function syncRelationshipTable(
  table: string,
  serviceId: string,
  key: string,
  selectedIds: string[],
  currentIds: string[],
) {
  const selected = new Set(selectedIds);
  const removed = currentIds.filter((id) => !selected.has(id));
  const added = selectedIds.filter((id) => !currentIds.includes(id));
  if (removed.length) {
    const { error } = await supabase.from(table).delete().eq('service_id', serviceId).in(key, removed);
    if (error) throw new Error(error.message);
  }
  if (added.length) {
    const { error } = await supabase.from(table).insert(added.map((id) => ({ service_id: serviceId, [key]: id })));
    if (error) throw new Error(error.message);
  }
}

export default function ServicesPage() {
  useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [relationships, setRelationships] = useState<RelationshipState>({ contacts: [], staff: [], properties: [], units: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formService, setFormService] = useState<Service | null | undefined>(undefined);
  const [profileService, setProfileService] = useState<Service | null>(null);
  const [deleteService, setDeleteService] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [servicesResult, contactsResult, staffResult, propertiesResult, unitsResult, contactLinks, staffLinks, propertyLinks, unitLinks] = await Promise.all([
      supabase.from('services').select('*').order('name'),
      supabase.from('contacts').select('*').order('name'),
      supabase.from('staff').select('*').order('name'),
      supabase.from('properties').select('*').order('name'),
      supabase.from('units').select('*').order('unit_number'),
      supabase.from('contact_services').select('id, company_id, service_id, contact_id, relationship_status, notes, contact:contacts(id, name, customer_id, contact_type, status)'),
      supabase.from('service_staff').select('id, company_id, service_id, staff_id, assignment_role, notes, staff:staff(id, name, role, department, status)'),
      supabase.from('service_properties').select('id, company_id, service_id, property_id, notes, property:properties(id, name, city, address_line1)'),
      supabase.from('service_units').select('id, company_id, service_id, unit_id, notes, unit:units(id, unit_number, property_id, property:properties(id, name))'),
    ]);
    if (servicesResult.error) setError(servicesResult.error.message); else setServices((servicesResult.data as Service[]) ?? []);
    if (!contactsResult.error) setContacts((contactsResult.data as Contact[]) ?? []);
    if (!staffResult.error) setStaff((staffResult.data as Staff[]) ?? []);
    if (!propertiesResult.error) setProperties((propertiesResult.data as Property[]) ?? []);
    if (!unitsResult.error) setUnits((unitsResult.data as Unit[]) ?? []);
    const relationshipError = [contactLinks, staffLinks, propertyLinks, unitLinks].find((result) => result.error)?.error;
    if (relationshipError) setError((current) => current ?? relationshipError.message);
    setRelationships({
      contacts: (contactLinks.data as unknown as ServiceContactRelationship[]) ?? [],
      staff: (staffLinks.data as unknown as ServiceStaffRelationship[]) ?? [],
      properties: (propertyLinks.data as unknown as ServicePropertyRelationship[]) ?? [],
      units: (unitLinks.data as unknown as ServiceUnitRelationship[]) ?? [],
    });
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveService = async (draft: ServiceDraft, selected: { contactIds: string[]; staffIds: string[]; propertyIds: string[]; unitIds: string[] }) => {
    let saved: Service;
    if (formService) {
      const { data, error: saveError } = await supabase.from('services').update(draft).eq('id', formService.id).select().single();
      if (saveError) throw new Error(saveError.message);
      saved = data as Service;
    } else {
      const { data, error: saveError } = await supabase.from('services').insert([draft]).select().single();
      if (saveError) throw new Error(saveError.message);
      saved = data as Service;
    }
    const current = {
      contactIds: relationships.contacts.filter((item) => item.service_id === saved.id).map((item) => String(item.contact_id)),
      staffIds: relationships.staff.filter((item) => item.service_id === saved.id).map((item) => String(item.staff_id)),
      propertyIds: relationships.properties.filter((item) => item.service_id === saved.id).map((item) => item.property_id),
      unitIds: relationships.units.filter((item) => item.service_id === saved.id).map((item) => item.unit_id),
    };
    await syncRelationshipTable('contact_services', saved.id, 'contact_id', selected.contactIds, current.contactIds);
    await syncRelationshipTable('service_staff', saved.id, 'staff_id', selected.staffIds, current.staffIds);
    await syncRelationshipTable('service_properties', saved.id, 'property_id', selected.propertyIds, current.propertyIds);
    await syncRelationshipTable('service_units', saved.id, 'unit_id', selected.unitIds, current.unitIds);
    await loadData();
    setProfileService(saved);
    setFeedback({ tone: 'success', message: formService ? 'Service changes saved.' : 'Service added.' });
  };

  const deleteSelected = async () => {
    if (!deleteService) return;
    setDeleting(true);
    const { error: deleteError } = await supabase.from('services').delete().eq('id', deleteService.id);
    if (deleteError) {
      setFeedback({ tone: 'error', message: deleteError.message });
      setDeleting(false);
      return;
    }
    setServices((current) => current.filter((item) => item.id !== deleteService.id));
    setRelationships((current) => ({
      contacts: current.contacts.filter((item) => item.service_id !== deleteService.id),
      staff: current.staff.filter((item) => item.service_id !== deleteService.id),
      properties: current.properties.filter((item) => item.service_id !== deleteService.id),
      units: current.units.filter((item) => item.service_id !== deleteService.id),
    }));
    setDeleteService(null);
    setProfileService(null);
    setDeleting(false);
    setFeedback({ tone: 'success', message: 'Service deleted.' });
  };

  const categories = useMemo(() => [...new Set(services.map((item) => item.category).filter(Boolean))].sort().map((value) => ({ value, label: value })), [services]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return services.filter((service) => {
      const haystack = [service.name, service.category, service.short_description, service.description].filter(Boolean).join(' ').toLowerCase();
      return (!needle || haystack.includes(needle)) && (!categoryFilter || service.category === categoryFilter) && (!statusFilter || service.status === statusFilter);
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [services, search, categoryFilter, statusFilter]);
  const clearFilters = () => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); };

  return (
    <AppLayout>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f8f7f5]">
        <header className="flex flex-shrink-0 items-center justify-between border-b border-[#e9e6e1] bg-[#fbfaf8] px-5 py-4 sm:px-8">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#a19c93]">Operations and knowledge</p><h1 className="mt-1 text-[20px] font-semibold tracking-[-.02em] text-[#151412]">Services</h1><p className="mt-1 max-w-[720px] text-[12px] text-[#77736d]">Keep the company’s offerings structured so your team and FlowPoint AI know what is provided, who it serves, and how work should be handled.</p></div>
          <div className="flex items-center gap-2"><NotificationBell /><button onClick={() => setFormService(null)} className="flex h-9 items-center gap-2 rounded-[9px] bg-[#151412] px-3.5 text-[12px] font-semibold text-white shadow-[0_2px_5px_rgba(0,0,0,.12)] hover:bg-[#312f2c]"><Plus size={14} />Add service</button></div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1240px] px-5 py-6 sm:px-8 sm:py-8">
            {feedback && <div className={`mb-5 flex items-center justify-between rounded-[10px] border px-3 py-2.5 text-[12px] ${feedback.tone === 'success' ? 'border-[#d2ead7] bg-[#f2faf3] text-[#327443]' : 'border-[#f0c8c3] bg-[#fff7f6] text-[#a33a30]'}`}><span className="flex items-center gap-2">{feedback.tone === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}{feedback.message}</span><button onClick={() => setFeedback(null)}><X size={14} /></button></div>}
            <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div><p className="text-[13px] text-[#706c64]">A shared catalog of the work your company can provide.</p><p className="mt-1 text-[11px] text-[#a19c93]">{services.length} {services.length === 1 ? 'service' : 'services'} documented</p></div>
              <div className="flex flex-col gap-2 sm:flex-row"><label className="relative block min-w-[240px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a39b]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search service or category" className={`${inputClass} pl-9`} /></label><div className="flex gap-2"><div className="min-w-[140px]"><FlowPointSelect value={categoryFilter} onChange={setCategoryFilter} placeholder="All categories" options={categories} emptyLabel="No categories yet" /></div><div className="min-w-[132px]"><FlowPointSelect value={statusFilter} onChange={setStatusFilter} placeholder="All statuses" options={SERVICE_STATUSES.map((item) => ({ ...item }))} /></div><button onClick={clearFilters} className="flex h-[39px] items-center justify-center gap-2 rounded-[9px] border border-[#e4e2de] px-3 text-[12px] font-medium text-[#625e57] hover:bg-[#f4f2ef]"><Filter size={13} />Clear</button><button onClick={loadData} disabled={loading} className="flex h-[39px] items-center justify-center rounded-[9px] border border-[#e4e2de] px-3 text-[#817d76] hover:bg-[#f4f2ef] disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button></div></div>
            </div>
            {loading && <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-[185px] animate-pulse rounded-[13px] border border-[#eeeae5] bg-[#f0eeeb]" />)}</div>}
            {!loading && error && <div className="mb-5"><InlineError message={error} /></div>}
            {!loading && !error && services.length === 0 && <EmptyState title="No services yet" description="Add the first offering to give your company a structured source of truth for operations and future AI assistance." />}
            {!loading && !error && services.length > 0 && filtered.length === 0 && <div className="rounded-[14px] border border-[#e9e6e1] bg-white px-6 py-16 text-center"><Filter size={20} className="mx-auto text-[#bbb6ae]" /><p className="mt-3 text-[13px] font-semibold text-[#4a4741]">No matching services</p><p className="mt-1 text-[12px] text-[#99948b]">Try a different search or clear one of the filters.</p><button onClick={clearFilters} className="mt-4 text-[12px] font-semibold text-[#4a4741] underline underline-offset-2">Clear filters</button></div>}
            {!loading && !error && filtered.length > 0 && <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"><AnimatePresence mode="popLayout">{filtered.map((service) => <ServiceCard key={service.id} service={service} relationships={relationships} onOpen={() => setProfileService(service)} />)}</AnimatePresence></div>}
          </div>
        </div>
        <AnimatePresence>{formService !== undefined && <ServiceForm service={formService} relationships={relationships} contacts={contacts} staff={staff} properties={properties} units={units} onSave={saveService} onClose={() => setFormService(undefined)} />}</AnimatePresence>
        <AnimatePresence>{profileService && <ServiceProfile service={profileService} relationships={relationships} onClose={() => setProfileService(null)} onEdit={() => { setFormService(profileService); setProfileService(null); }} onDelete={() => setDeleteService(profileService)} />}</AnimatePresence>
        <AnimatePresence>{deleteService && <ConfirmDelete name={deleteService.name} deleting={deleting} onCancel={() => setDeleteService(null)} onConfirm={deleteSelected} />}</AnimatePresence>
      </div>
    </AppLayout>
  );
}