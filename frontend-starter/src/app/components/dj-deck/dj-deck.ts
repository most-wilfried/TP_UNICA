import { Component, inject, input, OnDestroy } from '@angular/core';
import { DjAudioService } from '../../shared/services/dj-audio.service';

@Component({ selector: 'app-dj-deck', templateUrl: './dj-deck.html', styleUrl: './dj-deck.css' })
export class DjDeckComponent implements OnDestroy {
  readonly id = input.required<'A' | 'B'>();
  readonly engine = inject(DjAudioService);
  private pointer?: number;
  private lastY = 0;
  private resume = false;
  state() { return this.engine.decks()[this.id()]; }
  number(event: Event): number { return Number((event.target as HTMLInputElement).value); }
  time(value: number): string { return `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, '0')}`; }
  async play(): Promise<void> {
    try { await this.engine.toggle(this.id()); }
    catch (error) { console.error('[DJ] Lecture impossible', error); }
  }
  startScratch(event: PointerEvent): void {
    if (!this.state().title || this.state().loading || this.pointer !== undefined) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.pointer = event.pointerId;
    this.lastY = event.clientY;
    this.resume = this.engine.beginScratch(this.id());
  }
  moveScratch(event: PointerEvent): void {
    if (event.pointerId !== this.pointer) return;
    this.engine.scratch(this.id(), (this.lastY - event.clientY) * 0.012);
    this.lastY = event.clientY;
  }
  endScratch(): void {
    if (this.pointer === undefined) return;
    this.pointer = undefined;
    this.engine.endScratch(this.id(), this.resume);
  }
  keyboardScratch(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    if (!this.state().title || this.state().loading) return;
    if (!this.state().scratching) this.resume = this.engine.beginScratch(this.id());
    this.engine.scratch(this.id(), event.key === 'ArrowLeft' ? -0.12 : 0.12);
  }
  endKeyboard(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') this.engine.endScratch(this.id(), this.resume);
  }
  blur(): void { this.endScratch(); if (this.state().scratching) this.engine.endScratch(this.id(), this.resume); }
  ngOnDestroy(): void { this.blur(); }
}
