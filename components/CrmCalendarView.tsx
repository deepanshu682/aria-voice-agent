'use client';

import React, { useState } from 'react';
import { Calendar, CheckCircle2, Clock, Plus, ShieldAlert, Unlock, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { CalendarSlot, LanguageCode, LeadProfile } from '@/lib/types';

interface CrmCalendarViewProps {
  leads: LeadProfile[];
  activeLead: LeadProfile;
  slots: CalendarSlot[];
  onSelectLead: (leadId: string) => Promise<void>;
  onBookSlot: (slotId: string) => Promise<{ success: boolean; error?: string }>;
  onReleaseSlot: (slotId: string) => Promise<void>;
  onCreateLead: (lead: {
    name: string;
    company: string;
    email: string;
    role: string;
    preferredLanguage: LanguageCode;
  }) => Promise<void>;
}

export default function CrmCalendarView({
  leads,
  activeLead,
  slots,
  onSelectLead,
  onBookSlot,
  onReleaseSlot,
  onCreateLead,
}: CrmCalendarViewProps) {
  const [bookingMessage, setBookingMessage] = useState<{ type: 'ok' | 'conflict'; text: string } | null>(null);
  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>('en');

  const handleBookClick = async (slot: CalendarSlot) => {
    setBookingMessage(null);
    const res = await onBookSlot(slot.id);
    if (res.success) {
      setBookingMessage({
        type: 'ok',
        text: `Reserved ${slot.dayLabel} at ${slot.timeSlot} with ${slot.specialistName} for ${activeLead.name} (${activeLead.company}).`,
      });
    } else {
      setBookingMessage({
        type: 'conflict',
        text: res.error || 'Double-booking prevented: slot is already reserved.',
      });
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !company.trim()) return;
    await onCreateLead({
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
      role: role.trim() || 'VP Engineering',
      preferredLanguage,
    });
    setName('');
    setCompany('');
    setEmail('');
    setRole('');
    setShowNewLeadForm(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-950">
            CRM Customer Pipeline and Automated Demo Calendar
          </h1>
          <p className="text-sm text-stone-600 mt-1.5">
            Real-time non-blocking CRM lead upserts, cross-call memory persistence, and atomic double-booking protection.
          </p>
        </div>

        <Button variant="gradient" onClick={() => setShowNewLeadForm((v) => !v)}>
          <Plus className="w-3.5 h-3.5" />
          <span>{showNewLeadForm ? 'Close Form' : 'Add Prospect Record'}</span>
        </Button>
      </div>

      {showNewLeadForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="border border-orange-200 rounded-2xl bg-white p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end shadow-xs"
        >
          <div>
            <label className="block text-xs text-stone-600 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Priya Nair"
              className="w-full rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2.5 text-xs text-stone-900"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-600 mb-1.5">Company</label>
            <input
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="NovaScale Labs"
              className="w-full rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2.5 text-xs text-stone-900"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-600 mb-1.5">Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="CTO"
              className="w-full rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2.5 text-xs text-stone-900"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-600 mb-1.5">Preferred Language</label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value as LanguageCode)}
              className="w-full rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2.5 text-xs text-stone-900"
            >
              <option value="en">English</option>
              <option value="hinglish">Hinglish</option>
              <option value="hi">Hindi</option>
            </select>
          </div>
          <Button type="submit" variant="gradient">
            Save and Select Lead
          </Button>
        </form>
      )}

      {bookingMessage && (
        <div
          className={`rounded-2xl border px-5 py-3.5 text-xs flex items-center gap-2.5 ${
            bookingMessage.type === 'ok'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : 'border-amber-300 bg-amber-50 text-amber-900'
          }`}
        >
          {bookingMessage.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span>{bookingMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-6 p-6 space-y-5 rounded-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-600" />
              <span>CRM Lead Records ({leads.length})</span>
            </h2>
            <span className="text-xs text-stone-500">Select a lead to load cross-call memory</span>
          </div>

          <div className="divide-y divide-stone-200 border-t border-stone-200">
            {leads.map((lead) => {
              const isSelected = lead.id === activeLead.id;
              return (
                <div
                  key={lead.id}
                  onClick={() => void onSelectLead(lead.id)}
                  className={`py-4 px-3.5 -mx-3.5 rounded-2xl transition-colors cursor-pointer ${
                    isSelected ? 'bg-orange-50/90 border border-orange-200/80' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-stone-900">
                        {lead.name}{' '}
                        <span className="text-xs font-normal text-stone-500">({lead.role})</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 mt-1">
                        <span>{lead.company}</span>
                        <span>{lead.email}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono tabular-nums text-sm font-bold text-orange-600">
                        {lead.bant.totalScore}/100
                      </div>
                      <div className="text-xs text-stone-500">{lead.stage}</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2 text-xs font-mono tabular-nums text-stone-600">
                    <span>B: {lead.bant.budget.score}/25</span>
                    <span>A: {lead.bant.authority.score}/25</span>
                    <span>N: {lead.bant.need.score}/25</span>
                    <span>T: {lead.bant.timeline.score}/25</span>
                  </div>

                  {lead.priorCalls[0] && (
                    <p className="text-xs text-stone-600 mt-2.5 line-clamp-2 leading-relaxed">
                      Memory ({lead.priorCalls[0].date}): {lead.priorCalls[0].summary}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-6 p-6 space-y-5 rounded-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span>Solutions Architect Demo Calendar</span>
            </h2>
            <span className="text-xs text-stone-500">
              Booking for: <strong className="text-stone-900">{activeLead.name}</strong>
            </span>
          </div>

          <div className="divide-y divide-stone-200 border-t border-stone-200">
            {slots.map((slot) => {
              const isBooked = slot.status === 'booked';
              return (
                <div key={slot.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-mono font-semibold text-orange-600">{slot.id}</span>
                      <span className="font-semibold text-stone-900">
                        {slot.dayLabel} at {slot.timeSlot}
                      </span>
                      <span className={isBooked ? 'text-amber-700 font-medium' : 'text-emerald-700 font-medium'}>
                        ({isBooked ? 'Booked' : 'Available'})
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>
                        {slot.specialistName} ({slot.specialistRole})
                      </span>
                    </div>
                    {isBooked && (
                      <div className="text-xs text-stone-700">
                        Reserved by <strong>{slot.bookedByName}</strong> ({slot.bookedCompany})
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {!isBooked ? (
                      <Button
                        size="sm"
                        variant="gradient"
                        onClick={() => void handleBookClick(slot)}
                      >
                        Book for {activeLead.name.split(' ')[0]}
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleBookClick(slot)}
                          className="border-amber-300 text-amber-800 hover:bg-amber-50"
                        >
                          Test Double-Book Guard
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => void onReleaseSlot(slot.id)}
                          title="Release slot"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
