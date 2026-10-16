'use client';

import { useEffect } from 'react';

/**
 * FitLog Pro Web Domain Event Synchronization Bus
 * Enables reactive cross-component & cross-page data synchronization without full page reloads.
 */

export type DomainEventType =
  | 'workout-completed'
  | 'workout-deleted'
  | 'nutrition-updated'
  | 'measurement-updated'
  | 'plan-updated';

export interface DomainEventPayloadMap {
  'workout-completed': { program_day_id?: string; session_id?: string };
  'workout-deleted': { session_id?: string };
  'nutrition-updated': { date?: string };
  'measurement-updated': { date?: string };
  'plan-updated': { program_id?: string };
}

export type EventCallback<T extends DomainEventType> = (payload?: DomainEventPayloadMap[T]) => void;

class DomainEventBus {
  private listeners: Map<string, Set<(payload?: any) => void>> = new Map();
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('fitlog_domain_events');
        this.channel.onmessage = (msgEvent) => {
          const { event, payload } = msgEvent.data || {};
          if (event && this.listeners.has(event)) {
            const set = this.listeners.get(event)!;
            set.forEach((cb) => {
              try {
                cb(payload);
              } catch (err) {
                console.error(`Error in cross-tab domain event listener for ${event}:`, err);
              }
            });
          }
        };
      } catch (e) {
        // BroadcastChannel unavailable
      }
    }
  }

  subscribe<T extends DomainEventType>(event: T, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(callback);

    return () => {
      set.delete(callback);
    };
  }

  emit<T extends DomainEventType>(event: T, payload?: DomainEventPayloadMap[T]): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in domain event listener for ${event}:`, err);
        }
      });
    }

    if (this.channel) {
      try {
        this.channel.postMessage({ event, payload });
      } catch (e) {
        // postMessage error
      }
    }
  }
}

export const domainEvents = new DomainEventBus();

export function useDomainEvent<T extends DomainEventType>(
  event: T,
  callback: EventCallback<T>
) {
  useEffect(() => {
    return domainEvents.subscribe(event, callback);
  }, [event, callback]);
}
